import oracledb from 'oracledb';
import type { ResourceDefinition } from '../../shared/src/resources.js';
import { resources } from '../../shared/src/resources.js';
import { AppError } from '../../domain/src/index.js';
import type { RecordData } from '../../domain/src/records.js';

// Identificadores exclusivamente del catálogo inspeccionado; valores siempre mediante binds.
export function resourceBySlug(slug: string): ResourceDefinition {
  const resource = resources.find(item => item.slug === slug);
  if (!resource) throw new AppError(404, 'NOT_FOUND', 'Módulo no encontrado.');
  return resource;
}
export function keyOf(resource: ResourceDefinition): string {
  const key = resource.fields.find(field => field.primaryKey)?.name;
  if (!key) throw new Error('PRIMARY_KEY_NOT_VERIFIED');
  return key;
}
function selectColumns(resource: ResourceDefinition): string {
  return resource.fields.map(field => field.type === 'date'
    ? `TO_CHAR(${field.name}, 'YYYY-MM-DD"T"HH24:MI:SS') AS ${field.name}` : field.name).join(', ');
}
export async function listRecords(connection: oracledb.Connection, resource: ResourceDefinition, page: number, pageSize: number, search: string) {
  const searchable = resource.fields.filter(field => field.type === 'text' && !['DATOS_ANTERIORES', 'DATOS_NUEVOS'].includes(field.name));
  const where = search && searchable.length ? ` WHERE (${searchable.map(field => `UPPER(${field.name}) LIKE :search ESCAPE '\\'`).join(' OR ')})` : '';
  const binds: oracledb.BindParameters = where ? { search: `%${search.toUpperCase().replace(/[\\%_]/g, char => `\\${char}`)}%` } : {};
  const table = `ADMIN_CU_PROVEEDORES.${resource.table}`;
  const count = await connection.execute<{ TOTAL: number }>(`SELECT COUNT(*) AS TOTAL FROM ${table}${where}`, binds, { outFormat: oracledb.OUT_FORMAT_OBJECT });
  const result = await connection.execute<RecordData>(`SELECT ${selectColumns(resource)} FROM ${table}${where} ORDER BY ${keyOf(resource)} DESC OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY`, { ...binds, offset: (page - 1) * pageSize, limit: pageSize }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
  return { rows: result.rows ?? [], total: count.rows?.[0]?.TOTAL ?? 0, page, pageSize };
}
export async function getRecord(connection: oracledb.Connection, resource: ResourceDefinition, id: number, lock = false): Promise<RecordData> {
  const result = await connection.execute<RecordData>(`SELECT ${selectColumns(resource)} FROM ADMIN_CU_PROVEEDORES.${resource.table} WHERE ${keyOf(resource)} = :id${lock ? ' FOR UPDATE WAIT 5' : ''}`, { id }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
  const row = result.rows?.[0];
  if (!row) throw new AppError(404, 'NOT_FOUND', 'Registro no encontrado.');
  return row;
}
export async function writeRecord(connection: oracledb.Connection, resource: ResourceDefinition, operation: 'INSERT' | 'UPDATE' | 'DELETE', id: number | undefined, data: RecordData): Promise<number> {
  if (resource.readOnly) throw new AppError(403, 'READ_ONLY', 'La auditoría solo permite consulta.');
  const entries = Object.entries(data);
  const allowed = new Set(resource.fields.filter(f => !f.primaryKey && !f.identity).map(f => f.name));
  if (entries.some(([name]) => !allowed.has(name))) throw new AppError(400, 'INVALID_FIELD', 'Campo no permitido.');
  const binds: oracledb.BindParameters = {};
  const values = entries.map(([name, value], i) => {
    if (typeof value === 'boolean') throw new AppError(400, 'INVALID_FIELD', 'Tipo no permitido para Oracle.');
    binds[`v${i}`] = value;
    return resource.fields.find(f => f.name === name)?.type === 'date' ? `TO_DATE(:v${i}, 'YYYY-MM-DD')` : `:v${i}`;
  });
  const table = `ADMIN_CU_PROVEEDORES.${resource.table}`;
  const key = keyOf(resource);
  if (operation === 'INSERT') {
    binds.newId = { dir: oracledb.BIND_OUT, type: oracledb.NUMBER };
    const result = await connection.execute(`INSERT INTO ${table} (${entries.map(([name]) => name).join(', ')}) VALUES (${values.join(', ')}) RETURNING ${key} INTO :newId`, binds, { autoCommit: false });
    const inserted = (result.outBinds as { newId: number[] }).newId[0];
    if (!inserted) throw new Error('INSERT_ID_MISSING');
    return inserted;
  }
  if (!id) throw new AppError(400, 'INVALID_ID', 'Identificador inválido.');
  binds.id = id;
  const query = operation === 'DELETE' ? `DELETE FROM ${table} WHERE ${key} = :id`
    : `UPDATE ${table} SET ${entries.map(([name], i) => `${name} = ${values[i]}`).join(', ')} WHERE ${key} = :id`;
  const result = await connection.execute(query, operation === 'DELETE' ? { id } : binds, { autoCommit: false });
  if (result.rowsAffected !== 1) throw new AppError(404, 'NOT_FOUND', 'Registro no encontrado.');
  return id;
}
