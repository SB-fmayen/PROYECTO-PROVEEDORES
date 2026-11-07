import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import oracledb from 'oracledb';
import { loadConfig } from '../packages/config/src/index.js';
import { createOraclePool, inOracleTransaction } from '../packages/db-oracle/src/index.js';
import { resources } from '../packages/shared/src/resources.js';
import { getRecord, keyOf, listRecords, writeRecord } from '../packages/db-oracle/src/records.js';
import { assertAuditAvailable, insertAudit } from '../packages/audit/src/index.js';
import { mutateRecord, type RecordUnitOfWork } from '../packages/application/src/records.js';
import type { RecordData } from '../packages/domain/src/records.js';

// Cambios exclusivamente temporales; rollback al terminar. NEXTVAL consume valores.
const pool = await createOraclePool(loadConfig());
const marker = `TEST${randomBytes(5).toString('hex')}`;
const actor = 'integration-test';
const principal = { userId: actor, permissions: new Set(resources.flatMap(r => ['create', 'update', 'delete'].map(action => `${r.slug}.${action}`))) };
const ids: Record<string, number> = {};
const core = process.argv.includes('--core');
const checks: string[] = [];
let rollbackExpected = false;
try {
  await inOracleTransaction(pool, async connection => {
    connection.callTimeout = 10000;
    const unit: RecordUnitOfWork = { run: (resource, work) => work({
      assertAuditAvailable: () => assertAuditAvailable(connection),
      get: (id, lock) => getRecord(connection, resource, id, lock),
      write: (operation, id, data) => writeRecord(connection, resource, operation, id, data),
      audit: (operation, id, before, after, applicationUserId) => insertAudit(connection, { table: resource.table, operation, recordId: String(id), before, after, applicationUserId, databaseUser: '', ip: '127.0.0.1', host: null })
    }) };
    const create = async (slug: string, data: RecordData) => {
      const resource = resources.find(r => r.slug === slug)!;
      const row = await mutateRecord(unit, resource, principal, 'INSERT', undefined, data);
      const id = Number(row![keyOf(resource)]);
      assert.ok(id > 0); ids[slug] = id; checks.push(`create:${slug}`); return id;
    };
    const provider = await create('proveedores', { NIT: marker, RAZONSOCIAL: marker, SALDOACTUAL: 0, ESTADO: 'ACTIVO' });
    await mutateRecord(unit, resources.find(r => r.slug === 'proveedores')!, principal, 'UPDATE', provider, { RAZONSOCIAL: `${marker}-editado` });
    checks.push('update:proveedores');
    if (!core) {
    const cost = await create('centros-costo', { NOMBRE: marker });
    const user = await create('usuarios-negocio', { NOMBRE: marker, ESTADO: 'ACTIVO' });
    const document = await create('documentos-compra', { IDPROVEEDOR: provider, IDCENTROCOSTO: cost, NUMERODOCUMENTO: marker, SUBTOTAL: 100, IVA: 12, TOTAL: 112, FECHAEMISION: '2026-11-03', FECHAVENCIMIENTO: '2026-12-03' });
    await create('detalles', { IDDOCUMENTOCOMPRA: document, CANTIDAD: 2, PRECIOUNITARIO: 50, MONTO: 100 });
    await create('retenciones-isr', { IDDOCUMENTOCOMPRA: document, MONTORETENIDO: 5 });
    await create('contrasenas-pago', { IDDOCUMENTOCOMPRA: document, IDUSUARIO: user });
    const payment = await create('pagos-bancarios', { IDPROVEEDOR: provider, MONTO: 107 });
    await create('documentos-por-liquidar', { IDPAGO: payment, IDDOCUMENTOCOMPRA: document, MONTOAPLICADO: 107, SALDOPENDIENTE: 5 });
    await create('asientos-contables', { IDDOCUMENTOCOMPRA: document, IDPAGO: payment, DEBE: 107, HABER: 0 });
    try {
      await writeRecord(connection, resources.find(r => r.slug === 'documentos-compra')!, 'INSERT', undefined, { IDPROVEEDOR: 9007199254740990, IDCENTROCOSTO: cost });
      assert.fail('FK no aplicada');
    } catch (error) { assert.equal((error as { code: string }).code, 'ORA-02291'); checks.push('foreign-key:enforced'); }
    }
    const audit = await connection.execute<{ TOTAL: number }>(`SELECT COUNT(*) AS TOTAL FROM ADMIN_CU_PROVEEDORES.LOG_AUDITORIA_ODC
      WHERE NOMBRE_TABLA='PROVEEDOR' AND ID_REGISTRO=:id AND DATOS_NUEVOS LIKE :actor`, { id: String(provider), actor: `%${actor}%` }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
    assert.equal(audit.rows?.[0]?.TOTAL, 2); checks.push('audit:same-transaction');
    if (core) {
      await mutateRecord(unit, resources.find(r => r.slug === 'proveedores')!, principal, 'DELETE', provider, undefined);
      checks.push('delete:proveedores');
    }
    try {
      await insertAudit(connection, { table: 'X'.repeat(51), operation: 'INSERT', recordId: String(provider), before: null, after: null, applicationUserId: actor, databaseUser: '', ip: null, host: null });
      assert.fail('Se esperaba fallo real del INSERT de auditoría');
    } catch (error) { assert.equal((error as { code: string }).code, 'ORA-12899'); rollbackExpected = true; throw new Error('EXPECTED_AUDIT_ROLLBACK'); }
  });
  assert.fail('No se efectuó rollback');
} catch (error) {
  if (!rollbackExpected || !(error instanceof Error) || error.message !== 'EXPECTED_AUDIT_ROLLBACK') throw error;
  checks.push('audit-failure:rollback');
} finally {
  try {
    if (rollbackExpected) {
      const connection = await pool.getConnection();
      try {
        const result = await listRecords(connection, resources.find(r => r.slug === 'proveedores')!, 1, 10, marker);
        assert.equal(result.total, 0);
        const audit = await connection.execute<{ TOTAL: number }>("SELECT COUNT(*) AS TOTAL FROM ADMIN_CU_PROVEEDORES.LOG_AUDITORIA_ODC WHERE NOMBRE_TABLA='PROVEEDOR' AND ID_REGISTRO=:id", { id: String(ids.proveedores) }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
        assert.equal(audit.rows?.[0]?.TOTAL, 0); checks.push('rollback:business-and-audit-absent');
      } finally { await connection.close(); }
      await mkdir('docs/evidence', { recursive: true });
      await writeFile(`docs/evidence/oracle-transactions${core ? '-core' : ''}.json`, JSON.stringify({ capturedAt: new Date().toISOString(), status: 'passed', persistence: 'rolled_back', checks }, null, 2));
      checks.forEach(check => console.log(`${check}: ok`));
    }
  } finally { await pool.close(0); }
}
