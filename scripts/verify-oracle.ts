import { mkdir, writeFile } from 'node:fs/promises';
import { loadConfig } from '../packages/config/src/index.js';
import { createOraclePool } from '../packages/db-oracle/src/index.js';
import { listRecords, getRecord, keyOf } from '../packages/db-oracle/src/records.js';
import { resources } from '../packages/shared/src/resources.js';
import { assertAuditAvailable } from '../packages/audit/src/index.js';

const pool = await createOraclePool(loadConfig());
const connection = await pool.getConnection();
connection.callTimeout = 10000;
const checks: { module: string; status: string; code?: string }[] = [];
try {
  for (const resource of resources) {
    try {
      const result = await listRecords(connection, resource, 1, 1, '');
      if (result.rows[0]) await getRecord(connection, resource, Number(result.rows[0][keyOf(resource)]));
      await listRecords(connection, resource, 1, 1, 'verificacion_%');
      checks.push({ module: resource.slug, status: 'ok' });
    } catch (error) {
      const raw = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
      checks.push({ module: resource.slug, status: 'failed', code: /^(ORA|NJS|DPI)-\d+$/.test(raw) ? raw : 'QUERY_FAILED' });
      process.exitCode = 1;
    }
  }
  try { await assertAuditAvailable(connection); checks.push({ module: 'audit-sequence', status: 'ok' }); }
  catch { checks.push({ module: 'audit-sequence', status: 'blocked', code: 'AUDIT_UNAVAILABLE' }); process.exitCode = 1; }
  await mkdir('docs/evidence', { recursive: true });
  await writeFile('docs/evidence/oracle-integration.json', JSON.stringify({ capturedAt: new Date().toISOString(), readOnly: true, checks }, null, 2));
  for (const check of checks) console.log(`${check.module}: ${check.status}${check.code ? ` (${check.code})` : ''}`);
} finally { await connection.close(); await pool.close(0); }
