// Sugerencias de interfaz, no restricciones ni cambios del esquema.
export const categoricalFields = new Set(['ESTADO', 'TIPO', 'TIPODOCUMENTO', 'TIPOPAGO', 'TIPOCONTRIBUYENTE', 'ROL', 'BANCO', 'CUENTACONTABLE']);
export const suggestedOptions: Record<string, Record<string, string[]>> = {
  proveedores: { TIPOCONTRIBUYENTE: ['INDIVIDUAL', 'SOCIEDAD ANONIMA'], ESTADO: ['ACTIVO', 'INACTIVO'] },
  'centros-costo': { TIPO: ['ADMINISTRATIVO', 'COMERCIAL', 'OPERATIVO'] },
  'documentos-compra': { TIPODOCUMENTO: ['FACTURA', 'NOTA DE DEBITO', 'RECIBO'], ESTADO: ['PENDIENTE', 'PAGADO'] },
  'pagos-bancarios': { TIPOPAGO: ['ACH', 'CHEQUE', 'TRANSFERENCIA'], ESTADO: ['PENDIENTE', 'APLICADO'] },
  'usuarios-negocio': { ESTADO: ['ACTIVO', 'INACTIVO'] }
};
