-- Solo lectura. Ejecutar como administrador para visibilidad completa.
USE [CuentasPorPagarDB];
SET NOCOUNT ON;
SELECT s.name AS schema_name,USER_NAME(s.principal_id) AS owner_name
FROM sys.schemas s WHERE s.name=N'SEGURIDAD_PROVEEDORES';
SELECT name,type_desc,authentication_type_desc,default_schema_name
FROM sys.database_principals WHERE name=N'ADMIN_SEGURIDAD_PROVEEDORES';
SELECT s.name AS schema_name,t.name,t.object_id,USER_NAME(COALESCE(t.principal_id,s.principal_id)) AS effective_owner
FROM sys.tables t JOIN sys.schemas s ON s.schema_id=t.schema_id
WHERE t.name IN ('USUARIO','ROL','PERFIL','MENU','USUARIO_ROL','ROL_PERFIL','PERFIL_MENU') ORDER BY t.name;
SELECT USER_NAME(p.grantee_principal_id) AS grantee,OBJECT_NAME(p.major_id) AS table_name,
  p.permission_name,p.state_desc,USER_NAME(p.grantor_principal_id) AS grantor
FROM sys.database_permissions p JOIN sys.tables t ON t.object_id=p.major_id
WHERE p.class=1 AND t.schema_id=SCHEMA_ID(N'SEGURIDAD_PROVEEDORES');
SELECT r.name AS role_name,m.name AS member_name FROM sys.database_role_members rm
JOIN sys.database_principals r ON r.principal_id=rm.role_principal_id
JOIN sys.database_principals m ON m.principal_id=rm.member_principal_id
WHERE r.name IN ('ROL_CRUD_PROVEEDORES','ROL_CONSULTA_PROVEEDORES');
SELECT COUNT(*) AS tablas_modulo FROM sys.tables WHERE schema_id=SCHEMA_ID(N'SEGURIDAD_PROVEEDORES');
SELECT COUNT(*) AS claves_primarias FROM sys.key_constraints
WHERE type='PK' AND schema_id=SCHEMA_ID(N'SEGURIDAD_PROVEEDORES');
SELECT COUNT(*) AS claves_foraneas FROM sys.foreign_keys
WHERE schema_id=SCHEMA_ID(N'SEGURIDAD_PROVEEDORES');
SELECT COUNT(*) AS triggers_base FROM sys.triggers;
-- Verificacion de propiedad sin autenticar una cuenta ni leer hashes.
IF DATABASE_PRINCIPAL_ID(N'ADMIN_SEGURIDAD_PROVEEDORES') IS NOT NULL
BEGIN
  DECLARE @Impersonating bit=0;
  BEGIN TRY
    EXECUTE AS USER=N'ADMIN_SEGURIDAD_PROVEEDORES'; SET @Impersonating=1;
    SELECT USER_NAME() AS database_user,
      HAS_PERMS_BY_NAME(N'SEGURIDAD_PROVEEDORES',N'SCHEMA',N'CONTROL') AS controla_schema;
    REVERT; SET @Impersonating=0;
  END TRY
  BEGIN CATCH
    IF @Impersonating=1 REVERT;
    THROW;
  END CATCH;
END;
