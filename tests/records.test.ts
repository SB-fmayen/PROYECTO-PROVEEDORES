import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resources } from '../packages/shared/src/resources.js';
import { recordSchema, validateBusinessRecord } from '../packages/domain/src/records.js';
import { mutateRecord, type RecordUnitOfWork, type RecordTransaction } from '../packages/application/src/records.js';
import { AppError } from '../packages/domain/src/index.js';
import { atomic } from '../packages/application/src/index.js';

const provider = resources.find(r => r.slug === 'proveedores')!;
test('DTO rechaza campos no permitidos, IDs manuales y texto multibyte fuera de límite', () => {
  assert.equal(recordSchema(provider).safeParse({ RAZONSOCIAL: 'Proveedor', IDPROVEEDOR: 3 }).success, false);
  assert.equal(recordSchema(provider).safeParse({ NIT: 'é'.repeat(8) }).success, false);
  assert.equal(recordSchema(provider).safeParse({ SALDOACTUAL: -1 }).success, false);
  assert.equal(recordSchema(provider).safeParse({ SALDOACTUAL: 0.001 }).success, false);
  assert.equal(recordSchema(provider).safeParse({ RAZONSOCIAL: 'Proveedor', SALDOACTUAL: 0 }).success, true);
});
test('documento exige referencias, total coherente y vencimiento válido', () => {
  const document = resources.find(r => r.slug === 'documentos-compra')!;
  assert.equal(recordSchema(document).safeParse({ TOTAL: 10 }).success, false);
  assert.throws(() => validateBusinessRecord(document, { SUBTOTAL: 10, IVA: 2, TOTAL: 11 }), AppError);
  assert.throws(() => validateBusinessRecord(document, { FECHAEMISION: '2026-11-03', FECHAVENCIMIENTO: '2026-11-02' }), AppError);
  assert.doesNotThrow(() => validateBusinessRecord(document, { SUBTOTAL: 0.1, IVA: 0.2, TOTAL: 0.3 }));
});
test('servicio rechaza escrituras de un usuario de consulta antes de abrir transacción', async () => {
  let opened = false;
  const unit: RecordUnitOfWork = { run: async () => { opened = true; throw new Error('Unexpected'); } };
  await assert.rejects(mutateRecord(unit, provider, { userId: '1', permissions: new Set(['proveedores.read']) }, 'INSERT', undefined, { RAZONSOCIAL: 'Ejemplo' }), (e: unknown) => e instanceof AppError && e.statusCode === 403);
  assert.equal(opened, false);
});
test('creación audita el estado persistido y actor antes de confirmar', async () => {
  const calls: string[] = [];
  const transaction: RecordTransaction = {
    assertAuditAvailable: async () => { calls.push('audit-ready'); },
    write: async () => { calls.push('insert'); return 7; },
    get: async () => ({ IDPROVEEDOR: 7, RAZONSOCIAL: 'Persistido' }),
    audit: async (_op, id, before, after, actor) => {
      assert.equal(id, 7); assert.equal(before, null); assert.equal(after?.RAZONSOCIAL, 'Persistido'); assert.equal(actor, 'sql-user'); calls.push('audit');
    }
  };
  const unit: RecordUnitOfWork = { run: async (_resource, work) => atomic({ commit: async () => { calls.push('commit'); }, rollback: async () => { calls.push('rollback'); } }, () => work(transaction)) };
  await mutateRecord(unit, provider, { userId: 'sql-user', permissions: new Set(['proveedores.create']) }, 'INSERT', undefined, { RAZONSOCIAL: 'Entrada' });
  assert.deepEqual(calls, ['audit-ready', 'insert', 'audit', 'commit']);
});
test('fallo real del adaptador de auditoría en el flujo cancela la operación', async () => {
  const calls: string[] = [];
  const transaction: RecordTransaction = {
    assertAuditAvailable: async () => {}, get: async (_id, lock) => { calls.push(lock ? 'lock' : 'read-after'); return { IDPROVEEDOR: 7 }; },
    write: async () => { calls.push('update'); return 7; }, audit: async () => { throw new Error('AUDIT_FAILED'); }
  };
  const unit: RecordUnitOfWork = { run: async (_resource, work) => atomic({ commit: async () => { calls.push('commit'); }, rollback: async () => { calls.push('rollback'); } }, () => work(transaction)) };
  await assert.rejects(mutateRecord(unit, provider, { userId: '1', permissions: new Set(['proveedores.update']) }, 'UPDATE', 7, { RAZONSOCIAL: 'Nuevo' }));
  assert.deepEqual(calls, ['lock', 'update', 'read-after', 'rollback']);
});
