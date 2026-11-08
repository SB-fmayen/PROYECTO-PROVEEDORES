-- Parametros: login, name, role, profile, hash Argon2id. Solo INSERT.
-- Ejecutar desde auth:profiles en una transaccion. No modifica admin ni cuentas previas.
IF @hash NOT LIKE '$argon2id$%' THROW 51070, 'Se requiere Argon2id.',1;
IF EXISTS(SELECT 1 FROM dbo.USUARIO WITH(UPDLOCK,HOLDLOCK) WHERE USUARIO_LOGIN=@login)
  OR EXISTS(SELECT 1 FROM dbo.ROL WITH(UPDLOCK,HOLDLOCK) WHERE NOMBRE_ROL=@role)
  OR EXISTS(SELECT 1 FROM dbo.PERFIL WITH(UPDLOCK,HOLDLOCK) WHERE NOMBRE_PERFIL=@profile)
  THROW 51071, 'Ya existe una cuenta, rol o perfil con ese nombre; no se sobrescribe.',1;
DECLARE @r int,@p int,@u int;
INSERT dbo.ROL(NOMBRE_ROL,DESCRIPCION,ESTADO) VALUES(@role,'Rol de pruebas con acceso limitado',1);
SET @r=CONVERT(int,SCOPE_IDENTITY());
INSERT dbo.PERFIL(NOMBRE_PERFIL,DESCRIPCION,ESTADO) VALUES(@profile,'Perfil de pruebas por modulo y accion',1);
SET @p=CONVERT(int,SCOPE_IDENTITY());
INSERT dbo.USUARIO(NOMBRE,USUARIO_LOGIN,CORREO,ESTADO,FECHA_CREACION,PASSWORD_HASH)
VALUES(@name,@login,NULL,1,SYSUTCDATETIME(),@hash);
SET @u=CONVERT(int,SCOPE_IDENTITY());
INSERT dbo.USUARIO_ROL(ID_USUARIO,ID_ROL,FECHA_ASIGNACION,ESTADO) VALUES(@u,@r,SYSUTCDATETIME(),1);
INSERT dbo.ROL_PERFIL(ID_ROL,ID_PERFIL,ESTADO) VALUES(@r,@p,1);
SELECT @u AS user_id,@r AS role_id,@p AS profile_id;
