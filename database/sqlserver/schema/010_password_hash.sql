-- Ejecutar como propietario/administrador en CuentasPorPagarDB.
-- Columna nueva nullable: conserva los usuarios y no transforma datos legados.
SET XACT_ABORT ON;
IF DB_NAME() <> 'CuentasPorPagarDB' THROW 51000, 'Base incorrecta.', 1;
IF OBJECT_ID('dbo.USUARIO','U') IS NULL THROW 51000, 'No se encuentra dbo.USUARIO.', 1;
BEGIN TRANSACTION;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('dbo.USUARIO') AND name='PASSWORD_HASH')
  EXEC(N'ALTER TABLE dbo.USUARIO ADD PASSWORD_HASH varchar(255) NULL;');
ELSE IF NOT EXISTS (
  SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('dbo.USUARIO') AND name='PASSWORD_HASH'
  AND TYPE_NAME(user_type_id)='varchar' AND max_length>=255 AND is_nullable=1
) BEGIN
  ROLLBACK;
  THROW 51000, 'PASSWORD_HASH existente no cumple el contrato; no se modifica.', 1;
END;
COMMIT;
