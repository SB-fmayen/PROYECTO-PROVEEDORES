-- Plantilla parametrizada ejecutada por auth:bootstrap dentro de su transacción.
-- Parámetros: @login varchar(50), @hash varchar(255). Nunca contraseña en claro.
-- Solo para seguridad vacía; no modifica ni reemplaza cuentas existentes.
IF EXISTS (SELECT 1 FROM dbo.USUARIO WITH (TABLOCKX,HOLDLOCK))
  THROW 51000, 'Ya existen usuarios: no se reemplaza la seguridad.', 1;
IF @hash NOT LIKE '$argon2id$%' THROW 51000, 'Se requiere hash Argon2id.', 1;
DECLARE @role int, @profile int, @user int;
INSERT INTO dbo.ROL (NOMBRE_ROL,DESCRIPCION,ESTADO)
VALUES ('Administrador CPP','Administracion inicial de la aplicacion',1);
SET @role=CONVERT(int,SCOPE_IDENTITY());
INSERT INTO dbo.PERFIL (NOMBRE_PERFIL,DESCRIPCION,ESTADO)
VALUES ('Administrador CPP','Permisos explicitos por accion',1);
SET @profile=CONVERT(int,SCOPE_IDENTITY());
INSERT INTO dbo.USUARIO (NOMBRE,USUARIO_LOGIN,CORREO,ESTADO,FECHA_CREACION,PASSWORD_HASH)
VALUES ('Administrador',@login,NULL,1,SYSUTCDATETIME(),@hash);
SET @user=CONVERT(int,SCOPE_IDENTITY());
INSERT INTO dbo.ROL_PERFIL (ID_ROL,ID_PERFIL,ESTADO) VALUES (@role,@profile,1);
INSERT INTO dbo.USUARIO_ROL (ID_USUARIO,ID_ROL,FECHA_ASIGNACION,ESTADO)
VALUES (@user,@role,SYSUTCDATETIME(),1);
SELECT @role AS role_id,@profile AS profile_id,@user AS user_id;
