-- Aplicacion parcial academica; no modifica el documento ni el pago original.
INSERT INTO ADMIN_CU_PROVEEDORES.DOCUMENTO_POR_LIQUIDAR
  (IDPAGO, IDDOCUMENTOCOMPRA, MONTOAPLICADO, SALDOPENDIENTE, FECHALIQUIDACION)
VALUES (:paymentId, :documentId, :applied, :remaining,
  TO_DATE(:dateValue, 'YYYY-MM-DD'))
RETURNING IDLIQUIDACION INTO :newId
