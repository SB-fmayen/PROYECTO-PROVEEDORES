import type { Principal, Operation } from '../../domain/src/index.js';
import { AppError, requirePermission } from '../../domain/src/index.js';
import { recordSchema, validateBusinessRecord, type RecordData } from '../../domain/src/records.js';
import type { ResourceDefinition } from '../../shared/src/resources.js';

export interface RecordTransaction {
  assertAuditAvailable(): Promise<void>;
  get(id: number, lock: boolean): Promise<RecordData>;
  write(operation: Operation, id: number | undefined, data: RecordData): Promise<number>;
  audit(operation: Operation, id: number, before: RecordData | null, after: RecordData | null, actor: string): Promise<void>;
}
export interface RecordUnitOfWork {
  run<T>(resource: ResourceDefinition, work: (transaction: RecordTransaction) => Promise<T>): Promise<T>;
}
export async function mutateRecord(unit: RecordUnitOfWork, resource: ResourceDefinition, principal: Principal | undefined, operation: Operation, id: number | undefined, input: unknown): Promise<RecordData | null> {
  const action = operation === 'INSERT' ? 'create' : operation === 'UPDATE' ? 'update' : 'delete';
  requirePermission(principal, `${resource.slug}.${action}`);
  if (resource.readOnly) throw new AppError(403, 'READ_ONLY', 'Este módulo solo permite consulta.');
  const parsed = operation === 'DELETE' ? {} : recordSchema(resource, operation === 'UPDATE').safeParse(input);
  if ('success' in parsed && !parsed.success) throw new AppError(400, 'INVALID_RECORD', 'Revise los campos y sus tipos.');
  const data = ('data' in parsed ? parsed.data : {}) as RecordData;
  return unit.run(resource, async transaction => {
    await transaction.assertAuditAvailable();
    const before = operation === 'INSERT' ? null : await transaction.get(id!, true);
    // Fechas normalizadas para validar una actualización parcial contra el registro completo.
    const merged = { ...before, ...data };
    for (const field of resource.fields.filter(f => f.type === 'date')) {
      if (typeof merged[field.name] === 'string') merged[field.name] = String(merged[field.name]).slice(0, 10);
    }
    if (operation !== 'DELETE') validateBusinessRecord(resource, merged);
    const recordId = await transaction.write(operation, id, data);
    const after = operation === 'DELETE' ? null : await transaction.get(recordId, false);
    await transaction.audit(operation, recordId, before, after, principal!.userId);
    return after;
  });
}
