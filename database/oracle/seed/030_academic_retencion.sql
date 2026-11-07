-- Carga academica explicita; no representa calculo ni constancia fiscal real.
INSERT INTO ADMIN_CU_PROVEEDORES.RETENCION_ISR
  (IDDOCUMENTOCOMPRA, MONTORETENIDO, FECHA, NUMEROCONSTANCIA)
VALUES (:documentId, :retained, TO_DATE(:dateValue, 'YYYY-MM-DD'), :reference)
RETURNING IDRETENCION INTO :newId
