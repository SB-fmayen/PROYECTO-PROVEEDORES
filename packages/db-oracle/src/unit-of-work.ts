import type oracledb from 'oracledb';
import type { RecordUnitOfWork } from '../../application/src/records.js';
import { assertAuditAvailable, insertAudit } from '../../audit/src/index.js';
import { inOracleTransaction } from './index.js';
import { getRecord, writeRecord } from './records.js';

export function recordUnitOfWork(pool: oracledb.Pool, origin: { ip: string | null; host: string | null }): RecordUnitOfWork {
  return { run: (resource, work) => inOracleTransaction(pool, connection => work({
    assertAuditAvailable: () => assertAuditAvailable(connection),
    get: (id, lock) => getRecord(connection, resource, id, lock),
    write: (operation, id, data) => writeRecord(connection, resource, operation, id, data),
    audit: (operation, id, before, after, actor) => insertAudit(connection, {
      table: resource.table, operation, recordId: String(id), before, after,
      databaseUser: '', applicationUserId: actor, ...origin
    })
  })) };
}
