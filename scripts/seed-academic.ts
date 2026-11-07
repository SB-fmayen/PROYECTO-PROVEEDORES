import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import oracledb from 'oracledb';
import { loadConfig } from '../packages/config/src/index.js';
import { createOraclePool } from '../packages/db-oracle/src/index.js';
import { getRecord, keyOf, writeRecord } from '../packages/db-oracle/src/records.js';
import { assertAuditAvailable, insertAudit } from '../packages/audit/src/index.js';
import { resources } from '../packages/shared/src/resources.js';
import { recordSchema, validateBusinessRecord, type RecordData } from '../packages/domain/src/records.js';

// Mantenimiento autorizado, no usa ni suplanta un usuario de aplicacion.
const actor = 'academic-seed-2026-11-07';
const manifestPath = '.local/academic-load-2026-11-07.json';
const targets = ['RETENCION_ISR', 'CONTRASENA_PAGO', 'DOCUMENTO_POR_LIQUIDAR', 'ASIENTO_CONTABLE'];
interface Entry { table: string; id: number; snapshot: RecordData; }
interface Manifest { actor: string; status: string; entries: Entry[]; }
const manifest: Manifest = { actor, status: 'prepared', entries: [] };
const rollback = process.argv.includes('--rollback');
const apply = process.argv.includes('--apply');
assert.ok(!(rollback && apply), 'Elegir solo --apply o --rollback');
let previous: Manifest | undefined;
try { previous = JSON.parse(await readFile(manifestPath, 'utf8')) as Manifest; }
catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
const resource = (table: string) => {
  assert.ok(targets.includes(table), 'Tabla fuera de la carga');
  return resources.find(r => r.table === table)!;
};
const pool = await createOraclePool(loadConfig());
const c = await pool.getConnection(); c.callTimeout = 10000;
const query = async <T>(sql: string, binds: oracledb.BindParameters = {}) =>
  (await c.execute<T>(sql, binds, { outFormat: oracledb.OUT_FORMAT_OBJECT })).rows ?? [];
try {
  await assertAuditAvailable(c);
  const audit = async (e: Entry, operation: 'INSERT' | 'DELETE') => insertAudit(c, {
    table: e.table, operation, recordId: String(e.id),
    before: operation === 'DELETE' ? e.snapshot : null,
    after: operation === 'INSERT' ? e.snapshot : null,
    applicationUserId: rollback ? `${actor}-rollback` : actor,
    databaseUser: '', ip: null, host: 'academic-maintenance'
  });
  if (rollback) {
    assert.ok(previous && previous.actor === actor && previous.entries.length > 0, 'Falta manifiesto valido');
    assert.ok(['committed', 'prepared'].includes(previous.status), 'Carga ya revertida');
    // Bloquear y comprobar todas las filas antes de eliminar ninguna.
    for (const e of previous.entries) assert.deepEqual(await getRecord(c, resource(e.table), e.id, true), e.snapshot, 'Fila modificada; rollback cancelado');
    for (const e of [...previous.entries].reverse()) {
      await writeRecord(c, resource(e.table), 'DELETE', e.id, {});
      await audit(e, 'DELETE');
    }
    await c.commit();
    previous.status = 'rolled-back';
    await writeFile(manifestPath, JSON.stringify(previous, null, 2));
    console.log(`Rollback confirmado: ${previous.entries.length} filas propias; auditoria conservada.`);
  } else {
    assert.ok(!previous, 'Ya existe manifiesto: no se repite la carga. Verificar o revertir primero.');
    // La carga solo admite tablas destino vacias. No toma snapshots de clientes ni secretos.
    // Bloqueo DML para que la comprobacion y la carga sean atomicas ante otras escrituras.
    if (apply) for (const table of targets) await c.execute(`LOCK TABLE ADMIN_CU_PROVEEDORES.${table} IN EXCLUSIVE MODE WAIT 5`);
    for (const table of targets) {
      const count = await query<{ TOTAL: number }>(`SELECT COUNT(*) AS TOTAL FROM ADMIN_CU_PROVEEDORES.${table}`);
      assert.equal(count[0]?.TOTAL, 0, `${table} ya contiene datos; no se agrega otra carga.`);
    }
    const users = await query<{ IDUSUARIO: number }>("SELECT IDUSUARIO FROM ADMIN_CU_PROVEEDORES.USUARIO WHERE UPPER(ESTADO)='ACTIVO' ORDER BY IDUSUARIO FETCH FIRST 1 ROWS ONLY");
    assert.ok(users.length, 'Falta responsable funcional activo');
    const pairs = await query<{ IDDOCUMENTOCOMPRA: number; IDPAGO: number; TOTAL: number; DATE_VALUE: string }>(`
      SELECT d.IDDOCUMENTOCOMPRA, p.IDPAGO, d.TOTAL,
        TO_CHAR(p.FECHA,'YYYY-MM-DD') AS DATE_VALUE
      FROM ADMIN_CU_PROVEEDORES.DOCUMENTO_COMPRA d
      JOIN ADMIN_CU_PROVEEDORES.PAGO_BANCARIO p ON p.IDPROVEEDOR=d.IDPROVEEDOR
      WHERE UPPER(d.ESTADO)='PENDIENTE' AND UPPER(p.ESTADO)='APLICADO'
        AND d.TOTAL>50 AND p.MONTO>=d.TOTAL
        AND d.FECHAEMISION<=p.FECHA AND p.FECHA<=DATE '2026-11-07'
        AND p.IDPAGO=(SELECT MIN(p2.IDPAGO) FROM ADMIN_CU_PROVEEDORES.PAGO_BANCARIO p2
          WHERE p2.IDPROVEEDOR=d.IDPROVEEDOR AND UPPER(p2.ESTADO)='APLICADO'
            AND p2.MONTO>=d.TOTAL AND p2.FECHA>=d.FECHAEMISION)
        AND d.IDDOCUMENTOCOMPRA=(SELECT MIN(d2.IDDOCUMENTOCOMPRA)
          FROM ADMIN_CU_PROVEEDORES.DOCUMENTO_COMPRA d2
          WHERE d2.IDPROVEEDOR=d.IDPROVEEDOR AND UPPER(d2.ESTADO)='PENDIENTE')
      ORDER BY d.IDDOCUMENTOCOMPRA FETCH FIRST 10 ROWS ONLY`);
    assert.ok(pairs.length > 0, 'No hay documentos y pagos compatibles');
    const expectedRows = pairs.length * 5;
    console.log(`Plan academico: ${pairs.length} retenciones, ${pairs.length} solicitudes, ${pairs.length} liquidaciones, ${pairs.length * 2} lineas contables. Importes ilustrativos; cuentas DEMO.`);
    if (!apply) console.log('Solo lectura. Para confirmar: npm.cmd run db:seed:academic -- --apply');
    else {
      const insert = async (table: string, file: string, binds: oracledb.BindParameters, data: RecordData) => {
        const r = resource(table);
        recordSchema(r).parse(data); validateBusinessRecord(r, data);
        const sql = (await readFile(`database/oracle/seed/${file}`, 'utf8')).replace(/^--.*$/gm, '').trim();
        const result = await c.execute(sql, { ...binds, newId: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER } }, { autoCommit: false });
        const id = (result.outBinds as { newId: number[] }).newId[0];
        assert.ok(id !== undefined && id > 0);
        const e = { table, id, snapshot: await getRecord(c, r, id) };
        assert.equal(Number(e.snapshot[keyOf(r)]), id);
        manifest.entries.push(e); await audit(e, 'INSERT');
      };
      for (const [index, p] of pairs.entries()) {
        const documentId = p.IDDOCUMENTOCOMPRA, paymentId = p.IDPAGO, dateValue = p.DATE_VALUE;
        const retained = 25; // Importe fijo del ejercicio, sin inferir regimen ni tasa fiscal.
        const applied = Math.floor((Math.round(p.TOTAL * 100) - 2500) / 2) / 100;
        const remaining = (Math.round(p.TOTAL * 100) - 2500 - Math.round(applied * 100)) / 100;
        assert.ok(applied > 0 && remaining > 0);
        const reference = `ACAD261107-${String(index + 1).padStart(2, '0')}`;
        const dueDate = dateValue, userId = users[0]!.IDUSUARIO, statusValue = 'DEMO-PENDIENTE';
        await insert('RETENCION_ISR', '030_academic_retencion.sql', { documentId, retained, dateValue, reference },
          { IDDOCUMENTOCOMPRA: documentId, MONTORETENIDO: retained, FECHA: dateValue, NUMEROCONSTANCIA: reference });
        await insert('CONTRASENA_PAGO', '031_academic_contrasena.sql', { documentId, userId, dateValue, dueDate, statusValue },
          { IDDOCUMENTOCOMPRA: documentId, IDUSUARIO: userId, FECHASOLICITUD: dateValue, FECHAVENCIMIENTO: dueDate, ESTADO: statusValue });
        await insert('DOCUMENTO_POR_LIQUIDAR', '032_academic_liquidacion.sql', { paymentId, documentId, applied, remaining, dateValue },
          { IDPAGO: paymentId, IDDOCUMENTOCOMPRA: documentId, MONTOAPLICADO: applied, SALDOPENDIENTE: remaining, FECHALIQUIDACION: dateValue });
        for (const [account, debit, credit] of [['DEMO-CXP', applied, 0], ['DEMO-BANCOS', 0, applied]] as const) {
          const periodValue = dateValue.slice(0, 7);
          await insert('ASIENTO_CONTABLE', '033_academic_asiento.sql', { documentId, paymentId, dateValue, account, debit, credit, periodValue },
            { IDDOCUMENTOCOMPRA: documentId, IDPAGO: paymentId, FECHA: dateValue, CUENTACONTABLE: account, DEBE: debit, HABER: credit, PERIODO: periodValue });
        }
      }
      assert.equal(manifest.entries.length, expectedRows);
      const balance = await query<{ DIFFERENCE: number }>("SELECT SUM(DEBE)-SUM(HABER) AS DIFFERENCE FROM ADMIN_CU_PROVEEDORES.ASIENTO_CONTABLE WHERE CUENTACONTABLE IN ('DEMO-CXP','DEMO-BANCOS')");
      assert.equal(balance[0]?.DIFFERENCE, 0, 'Asientos no balanceados');
      const events = await query<{ TOTAL: number }>("SELECT COUNT(*) AS TOTAL FROM ADMIN_CU_PROVEEDORES.LOG_AUDITORIA_ODC WHERE DATOS_NUEVOS LIKE :actor", { actor: `%${actor}%` });
      assert.equal(events[0]?.TOTAL, expectedRows);
      await mkdir('.local', { recursive: true });
      // IDs recuperables incluso si el proceso se interrumpe despues del COMMIT.
      await writeFile(manifestPath, JSON.stringify(manifest, null, 2), { flag: 'wx' });
      await c.commit();
      manifest.status = 'committed';
      await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
      console.log(`Carga confirmada: ${expectedRows} filas y ${expectedRows} eventos de auditoria; balance y referencias comprobados. Manifiesto solo local.`);
    }
  }
} catch (error) {
  await c.rollback();
  // No imprimir binds, filas ni detalles de conexion ante errores.
  console.error(error instanceof assert.AssertionError ? error.message : 'Carga detenida; revisar estado y manifiesto local. No reintentar a ciegas.');
  process.exitCode = 1;
} finally { await c.close(); await pool.close(0); }
