-- Como propietario, solo lectura. Prueba funcional adicional: db:verify:transactions.
SELECT TABLE_NAME,COLUMN_NAME,GENERATION_TYPE,IDENTITY_OPTIONS
FROM USER_TAB_IDENTITY_COLS ORDER BY TABLE_NAME;
SELECT COUNT(*) AS TOTAL_TRIGGERS FROM USER_TRIGGERS;
-- La verificación funcional inserta datos temporales y ejecuta ROLLBACK;
-- los valores consumidos de secuencias/identities no se revierten.
