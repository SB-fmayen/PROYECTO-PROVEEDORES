-- Cuentas DEMO para ejercicio; dos lineas balanceadas por aplicacion.
INSERT INTO ADMIN_CU_PROVEEDORES.ASIENTO_CONTABLE
  (IDDOCUMENTOCOMPRA, IDPAGO, FECHA, CUENTACONTABLE, DEBE, HABER, PERIODO)
VALUES (:documentId, :paymentId, TO_DATE(:dateValue, 'YYYY-MM-DD'),
  :account, :debit, :credit, :periodValue)
RETURNING IDASIENTO INTO :newId
