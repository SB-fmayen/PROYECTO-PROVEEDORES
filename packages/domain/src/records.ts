import { z } from 'zod';
import type { ResourceDefinition } from '../../shared/src/resources.js';
import { AppError } from './index.js';

export type RecordData = Record<string, string | number | boolean | null>;
export function recordSchema(resource: ResourceDefinition, partial = false) {
  const shape: Record<string, z.ZodType> = {};
  for (const field of resource.fields) {
    if (field.identity || field.primaryKey) continue;
    let rule: z.ZodType;
    if (field.type === 'boolean') {
      rule = z.boolean();
    } else if (field.type === 'number') {
      let numeric = z.number().finite();
      if (field.scale === 0) numeric = numeric.int().min(0).max(Number.MAX_SAFE_INTEGER);
      else {
        numeric = numeric.min(0);
        if (field.precision !== null && field.scale !== null) numeric = numeric.max(10 ** (field.precision - field.scale) - 10 ** -field.scale);
      }
      rule = numeric.refine(value => field.scale === null || Math.abs(value * 10 ** field.scale - Math.round(value * 10 ** field.scale)) < 0.0001, 'Demasiados decimales.');
    } else if (field.type === 'date') {
      rule = z.iso.date();
    } else {
      rule = z.string().trim().refine(value => field.maxBytes === null || new TextEncoder().encode(value).length <= field.maxBytes, 'Texto demasiado largo.');
    }
    if (field.nullable) rule = rule.nullable();
    if (partial || field.nullable) rule = rule.optional();
    shape[field.name] = rule;
  }
  return z.strictObject(shape).refine(data => Object.keys(data).length > 0, 'Debe incluir al menos un campo.');
}

export function validateBusinessRecord(resource: ResourceDefinition, data: RecordData): void {
  const fail = (message: string): never => { throw new AppError(400, 'BUSINESS_RULE', message); };
  if (typeof data.FECHAEMISION === 'string' && typeof data.FECHAVENCIMIENTO === 'string' && data.FECHAVENCIMIENTO < data.FECHAEMISION) fail('El vencimiento no puede ser anterior a la emisión.');
  if (typeof data.FECHASOLICITUD === 'string' && typeof data.FECHAVENCIMIENTO === 'string' && data.FECHAVENCIMIENTO < data.FECHASOLICITUD) fail('El vencimiento no puede ser anterior a la solicitud.');
  if (resource.table === 'DOCUMENTO_COMPRA' && [data.SUBTOTAL, data.IVA, data.TOTAL].every(v => typeof v === 'number')) {
    if (Math.round(Number(data.SUBTOTAL) * 100) + Math.round(Number(data.IVA) * 100) !== Math.round(Number(data.TOTAL) * 100)) fail('El total debe ser igual al subtotal más IVA.');
  }
  if (resource.table === 'DETALLE_DOCUMENTO_COMPRA' && [data.CANTIDAD, data.PRECIOUNITARIO, data.MONTO].every(v => typeof v === 'number')) {
    if (Math.round(Number(data.CANTIDAD) * Number(data.PRECIOUNITARIO) * 100) !== Math.round(Number(data.MONTO) * 100)) fail('El monto debe ser igual a cantidad por precio unitario.');
  }
}
