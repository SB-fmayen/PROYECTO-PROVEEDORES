import oracledb, { type Connection } from 'oracledb';
import type { Operation } from '../../domain/src/index.js';
import { AppError } from '../../domain/src/index.js';

export interface AuditEvent {
  table: string; operation: Operation; databaseUser: string; recordId: string;
  before: Record<string, unknown> | null; after: Record<string, unknown> | null;
  ip: string | null; host: string | null;
  applicationUserId: string;
}
export async function assertAuditAvailable(connection: Connection): Promise<void> {
  const result = await connection.execute<{ SEQUENCE_NAME: string }>("SELECT SEQUENCE_NAME FROM ALL_SEQUENCES WHERE SEQUENCE_OWNER='ADMIN_CU_PROVEEDORES' AND SEQUENCE_NAME='SEQ_LOG_AUDITORIA_ODC'", {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });
  if (!result.rows?.length) throw new AppError(503, 'AUDIT_UNAVAILABLE', 'Las escrituras requieren acceso a la secuencia de auditoría.');
}
function snapshot(data: Record<string, unknown> | null, actor: string): string {
  const json = JSON.stringify({ applicationUserId: actor, record: data });
  if (Buffer.byteLength(json, 'utf8') > 4000) throw new AppError(400, 'AUDIT_TOO_LARGE', 'Los datos exceden la capacidad de auditoría.');
  return json;
}
export async function insertAudit(connection: Connection, event: AuditEvent): Promise<void> {
  // Mismo connection y autoCommit=false que la mutación. El actor de aplicación
  // se conserva en el sobre JSON sin cambiar la semántica de USUARIO_DB.
  await connection.execute(`INSERT INTO ADMIN_CU_PROVEEDORES.LOG_AUDITORIA_ODC
    (ID_AUDITORIA, NOMBRE_TABLA, OPERACION, USUARIO_DB, FECHA_HORA, ID_REGISTRO,
     DATOS_ANTERIORES, DATOS_NUEVOS, IP_ORIGEN, HOST_ORIGEN)
    VALUES (ADMIN_CU_PROVEEDORES.SEQ_LOG_AUDITORIA_ODC.NEXTVAL, :tableName, :operation,
      SYS_CONTEXT('USERENV','SESSION_USER'), SYSTIMESTAMP, :recordId, :beforeData, :afterData, :ip, :host)`, {
    tableName: event.table, operation: event.operation, recordId: event.recordId,
    beforeData: snapshot(event.before, event.applicationUserId), afterData: snapshot(event.after, event.applicationUserId),
    ip: event.ip, host: event.host
  }, { autoCommit: false });
}
