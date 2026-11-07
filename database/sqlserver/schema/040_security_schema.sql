-- Ejecutar como administrador en SSMS, con API detenida y copia de seguridad.
-- Vista previa por defecto. @Apply=1 confirma; @Reverse=1 vuelve a dbo.
-- No cambia datos, PK/FK, identidades, contrasenas ni membresias de roles.
USE [CuentasPorPagarDB];
SET NOCOUNT ON;
SET XACT_ABORT ON;
SET LOCK_TIMEOUT 10000;
DECLARE @Apply bit=0, @Reverse bit=0;
DECLARE @Source sysname=CASE WHEN @Reverse=1 THEN N'SEGURIDAD_PROVEEDORES' ELSE N'dbo' END;
DECLARE @Target sysname=CASE WHEN @Reverse=1 THEN N'dbo' ELSE N'SEGURIDAD_PROVEEDORES' END;
DECLARE @Owner sysname=N'ADMIN_SEGURIDAD_PROVEEDORES';
DECLARE @Tables table(name sysname PRIMARY KEY, object_id int, row_count bigint);
INSERT @Tables(name) VALUES(N'USUARIO'),(N'ROL'),(N'PERFIL'),(N'MENU'),
  (N'USUARIO_ROL'),(N'ROL_PERFIL'),(N'PERFIL_MENU');
UPDATE t SET object_id=OBJECT_ID(QUOTENAME(@Source)+N'.'+QUOTENAME(t.name),N'U') FROM @Tables t;
IF EXISTS(SELECT 1 FROM @Tables WHERE object_id IS NULL)
  THROW 51040, 'Faltan tablas origen o no hay visibilidad. Verificar antes de migrar; no crear tablas sustitutas.',1;
IF EXISTS(SELECT 1 FROM @Tables t JOIN sys.objects o ON o.name=t.name WHERE o.schema_id=SCHEMA_ID(@Target))
  THROW 51041, 'Ya hay objetos destino con esos nombres. No se sobreescriben.',1;
IF @Apply=0
BEGIN
  SELECT N'VISTA PREVIA - SIN CAMBIOS' AS estado,@Source AS schema_origen,@Target AS schema_destino,
    @Owner AS propietario_propuesto,t.name AS tabla,t.object_id FROM @Tables t ORDER BY t.name;
  SELECT IS_SRVROLEMEMBER('sysadmin') AS es_sysadmin,IS_MEMBER('db_owner') AS es_db_owner;
  PRINT 'Revisar docs/SQLSERVER_SCHEMA.md. Para aplicar, cambiar solo @Apply=1.';
  RETURN;
END;
IF ISNULL(IS_SRVROLEMEMBER('sysadmin'),0)<>1 AND ISNULL(IS_MEMBER('db_owner'),0)<>1
  THROW 51042, 'Se requiere la sesion administradora de SSMS; no elevar la cuenta de la API.',1;
IF EXISTS(SELECT 1 FROM sys.database_permissions WHERE class=3 AND major_id=SCHEMA_ID(@Source))
  THROW 51043, 'El schema origen tiene permisos explicitos heredables. Requiere revision administrativa particular.',1;
IF EXISTS(SELECT 1 FROM sys.objects o JOIN @Tables t ON t.object_id=o.object_id WHERE o.principal_id IS NOT NULL)
  THROW 51044, 'Hay propietarios explicitos de tablas. No se cambia su propiedad automaticamente.',1;
IF EXISTS(SELECT 1 FROM sys.sql_expression_dependencies d JOIN @Tables t ON t.object_id=d.referenced_id)
  THROW 51045, 'Hay dependencias SQL registradas; actualizar esos modulos antes de mover las tablas.',1;
IF EXISTS(SELECT 1 FROM sys.database_permissions p JOIN @Tables t ON t.object_id=p.major_id
  WHERE p.class=1 AND (p.minor_id<>0 OR p.state NOT IN ('G','W','D')
    OR USER_NAME(p.grantor_principal_id) NOT IN (N'dbo',N'ADMIN_SEGURIDAD_PROVEEDORES')))
  THROW 51046, 'Permisos de columna o delegacion no contemplados. Requiere revision particular.',1;
IF EXISTS(SELECT 1 FROM sys.triggers tr JOIN @Tables t ON tr.parent_id=t.object_id)
  THROW 51047, 'Se detectaron triggers; detener y revisar. Este proyecto conserva cero triggers.',1;

DECLARE @Permissions table(object_id int, grantee int, grantor int, permission_name sysname, state char(1));
DECLARE @Keys table(object_id int PRIMARY KEY, parent_object_id int, type char(2));
DECLARE @sql nvarchar(max),@Name sysname,@Id int,@Rows bigint,@Lock int;
BEGIN TRY
  BEGIN TRANSACTION;
  EXEC @Lock=sys.sp_getapplock @Resource=N'CPP_SCHEMA_040',@LockMode=N'Exclusive',@LockOwner=N'Transaction',@LockTimeout=10000;
  IF @Lock<0 THROW 51048, 'No se pudo reservar la migracion.',1;
  -- Bloqueo acotado para mantener conteos y evitar escrituras durante el traslado.
  DECLARE lock_tables CURSOR LOCAL FAST_FORWARD FOR SELECT name,object_id FROM @Tables ORDER BY name;
  OPEN lock_tables; FETCH NEXT FROM lock_tables INTO @Name,@Id;
  WHILE @@FETCH_STATUS=0
  BEGIN
    SET @sql=N'SELECT @n=COUNT_BIG(*) FROM '+QUOTENAME(@Source)+N'.'+QUOTENAME(@Name)+N' WITH(TABLOCKX,HOLDLOCK);';
    EXEC sys.sp_executesql @sql,N'@n bigint OUTPUT',@n=@Rows OUTPUT;
    UPDATE @Tables SET row_count=@Rows WHERE object_id=@Id;
    FETCH NEXT FROM lock_tables INTO @Name,@Id;
  END;
  CLOSE lock_tables; DEALLOCATE lock_tables;
  INSERT @Permissions SELECT p.major_id,p.grantee_principal_id,p.grantor_principal_id,p.permission_name,p.state
    FROM sys.database_permissions p JOIN @Tables t ON t.object_id=p.major_id WHERE p.class=1;
  INSERT @Keys SELECT o.object_id,o.parent_object_id,o.type FROM sys.objects o
    JOIN @Tables t ON t.object_id=o.parent_object_id WHERE o.type IN ('PK','F','UQ');
  IF @Reverse=0
  BEGIN
    IF DATABASE_PRINCIPAL_ID(@Owner) IS NULL
      EXEC(N'CREATE USER [ADMIN_SEGURIDAD_PROVEEDORES] WITHOUT LOGIN;');
    ELSE IF NOT EXISTS(SELECT 1 FROM sys.database_principals WHERE name=@Owner AND type='S' AND authentication_type=0)
      THROW 51049, 'El usuario propietario existente tiene otro tipo. No se modifica.',1;
    IF SCHEMA_ID(@Target) IS NULL
      EXEC(N'CREATE SCHEMA [SEGURIDAD_PROVEEDORES] AUTHORIZATION [ADMIN_SEGURIDAD_PROVEEDORES];');
    IF NOT EXISTS(SELECT 1 FROM sys.schemas WHERE name=@Target AND principal_id=DATABASE_PRINCIPAL_ID(@Owner))
      THROW 51050, 'El schema destino pertenece a otro usuario. No se cambia su propietario.',1;
    EXEC(N'ALTER USER [ADMIN_SEGURIDAD_PROVEEDORES] WITH DEFAULT_SCHEMA=[SEGURIDAD_PROVEEDORES];');
  END;
  DECLARE move_tables CURSOR LOCAL STATIC READ_ONLY FOR SELECT name FROM @Tables ORDER BY name;
  OPEN move_tables; FETCH NEXT FROM move_tables INTO @Name;
  WHILE @@FETCH_STATUS=0
  BEGIN
    SET @sql=N'ALTER SCHEMA '+QUOTENAME(@Target)+N' TRANSFER '+QUOTENAME(@Source)+N'.'+QUOTENAME(@Name)+N';';
    EXEC sys.sp_executesql @sql;
    FETCH NEXT FROM move_tables INTO @Name;
  END;
  CLOSE move_tables; DEALLOCATE move_tables;
  -- Verificar el traslado ANTES de intentar conceder permisos.
  IF EXISTS(SELECT 1 FROM @Tables t LEFT JOIN sys.tables live ON live.object_id=t.object_id
      WHERE live.object_id IS NULL OR live.schema_id<>SCHEMA_ID(@Target))
    THROW 51055, 'No todas las tablas quedaron en el destino; se revierte sin conceder permisos.',1;
  DECLARE @TargetGrantor int;
  SELECT @TargetGrantor=principal_id FROM sys.schemas WHERE name=@Target;
  IF @TargetGrantor IS NULL THROW 51056, 'No se pudo identificar al propietario del destino.',1;
  -- ALTER SCHEMA elimina permisos de objeto: restaurar todos los capturados.
  -- El otorgante sera el propietario ACTUAL del schema. Los destinatarios,
  -- permisos y estados se conservan; el grantor cambia con la propiedad.
  DECLARE @Grantee int,@Grantor int,@Permission sysname,@State char(1);
  DECLARE restore_permissions CURSOR LOCAL FAST_FORWARD FOR
    SELECT p.object_id,p.grantee,p.grantor,p.permission_name,p.state,t.name FROM @Permissions p
    JOIN @Tables t ON t.object_id=p.object_id ORDER BY CASE p.state WHEN 'W' THEN 0 ELSE 1 END,t.name;
  OPEN restore_permissions; FETCH NEXT FROM restore_permissions INTO @Id,@Grantee,@Grantor,@Permission,@State,@Name;
  WHILE @@FETCH_STATUS=0
  BEGIN
    SET @sql=CASE WHEN @State='D' THEN N'DENY ' ELSE N'GRANT ' END+@Permission+N' ON OBJECT::'
      +QUOTENAME(@Target)+N'.'+QUOTENAME(@Name)+N' TO '+QUOTENAME(USER_NAME(@Grantee))
      +CASE WHEN @State='W' THEN N' WITH GRANT OPTION' ELSE N'' END+N' AS '+QUOTENAME(USER_NAME(@TargetGrantor))+N';';
    EXEC sys.sp_executesql @sql;
    FETCH NEXT FROM restore_permissions INTO @Id,@Grantee,@Grantor,@Permission,@State,@Name;
  END;
  CLOSE restore_permissions; DEALLOCATE restore_permissions;
  IF EXISTS(SELECT object_id,grantee,permission_name,state FROM @Permissions EXCEPT
    SELECT p.major_id,p.grantee_principal_id,p.permission_name COLLATE DATABASE_DEFAULT,p.state COLLATE DATABASE_DEFAULT
    FROM sys.database_permissions p JOIN @Tables t ON t.object_id=p.major_id WHERE p.class=1 AND p.minor_id=0)
    OR EXISTS(SELECT p.major_id,p.grantee_principal_id,p.permission_name COLLATE DATABASE_DEFAULT,p.state COLLATE DATABASE_DEFAULT
    FROM sys.database_permissions p JOIN @Tables t ON t.object_id=p.major_id WHERE p.class=1 EXCEPT
    SELECT object_id,grantee,permission_name,state FROM @Permissions)
    THROW 51051, 'Los permisos no coinciden; se revierte toda la migracion.',1;
  IF EXISTS(SELECT 1 FROM sys.database_permissions p JOIN @Tables t ON t.object_id=p.major_id
      WHERE p.class=1 AND p.grantor_principal_id<>@TargetGrantor)
    THROW 51057, 'El otorgante no coincide con el propietario destino; se revierte.',1;
  IF EXISTS(SELECT object_id,parent_object_id,type FROM @Keys EXCEPT
    SELECT object_id,parent_object_id,type COLLATE DATABASE_DEFAULT FROM sys.objects)
    THROW 51052, 'Las claves cambiaron; se revierte la migracion.',1;
  DECLARE verify_tables CURSOR LOCAL FAST_FORWARD FOR SELECT name,object_id,row_count FROM @Tables ORDER BY name;
  OPEN verify_tables; FETCH NEXT FROM verify_tables INTO @Name,@Id,@Rows;
  WHILE @@FETCH_STATUS=0
  BEGIN
    IF ISNULL(OBJECT_ID(QUOTENAME(@Target)+N'.'+QUOTENAME(@Name),N'U'),-1)<>@Id
      THROW 51053, 'Cambio inesperado de object_id.',1;
    DECLARE @After bigint;
    SET @sql=N'SELECT @n=COUNT_BIG(*) FROM '+QUOTENAME(@Target)+N'.'+QUOTENAME(@Name)+N';';
    EXEC sys.sp_executesql @sql,N'@n bigint OUTPUT',@n=@After OUTPUT;
    IF @After<>@Rows THROW 51054, 'Los conteos cambiaron; se revierte la migracion.',1;
    FETCH NEXT FROM verify_tables INTO @Name,@Id,@Rows;
  END;
  CLOSE verify_tables; DEALLOCATE verify_tables;
  COMMIT;
  SELECT N'CONFIRMADO' AS estado,@Target AS schema_actual,@Reverse AS es_reversion;
  PRINT 'Actualizar SQLSERVER_SCHEMA en .env al schema actual y reiniciar la API. No ejecutar bootstrap.';
END TRY
BEGIN CATCH
  IF XACT_STATE()<>0 ROLLBACK;
  THROW;
END CATCH;
