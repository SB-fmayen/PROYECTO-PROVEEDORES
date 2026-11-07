-- Solo metadatos: no muestra hashes.
IF DB_NAME() <> 'CuentasPorPagarDB' THROW 51000, 'Base incorrecta.', 1;
IF NOT EXISTS (
  SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('dbo.USUARIO') AND name='PASSWORD_HASH'
  AND TYPE_NAME(user_type_id)='varchar' AND max_length>=255 AND is_nullable=1
) THROW 51000, 'Falta PASSWORD_HASH varchar(255) nullable compatible.', 1;
SELECT name,TYPE_NAME(user_type_id) AS data_type,max_length,is_nullable
FROM sys.columns WHERE object_id=OBJECT_ID('dbo.USUARIO') AND name='PASSWORD_HASH';
SELECT COUNT(*) AS visible_database_triggers FROM sys.triggers;
