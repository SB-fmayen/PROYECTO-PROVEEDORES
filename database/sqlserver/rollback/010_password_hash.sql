-- Reversión explícita por administrador. Nunca elimina hashes existentes.
SET XACT_ABORT ON;
IF DB_NAME() <> 'CuentasPorPagarDB' THROW 51000, 'Base incorrecta.', 1;
BEGIN TRANSACTION;
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('dbo.USUARIO') AND name='PASSWORD_HASH')
BEGIN
  EXEC(N'IF EXISTS (SELECT 1 FROM dbo.USUARIO WITH (TABLOCKX,HOLDLOCK) WHERE PASSWORD_HASH IS NOT NULL)
    THROW 51000, ''No se elimina PASSWORD_HASH: contiene datos.'', 1;
    ALTER TABLE dbo.USUARIO DROP COLUMN PASSWORD_HASH;');
END;
COMMIT;
