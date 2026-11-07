import { securitySql } from './schema.js';
import sql from 'mssql';
import { z } from 'zod';
import { AppError } from '../../domain/src/index.js';
import type { RecordData } from '../../domain/src/records.js';
import type { ResourceDefinition, ResourceField } from '../../shared/src/resources.js';
import { securityResources } from '../../shared/src/security-resources.js';
import { hashPassword } from '../../auth/src/index.js';

export function securityResource(slug: string): ResourceDefinition {
  const resource = securityResources.find(item => item.slug === `admin/${slug}`);
  if (!resource) throw new AppError(404, 'NOT_FOUND', 'Módulo no encontrado.');
  return resource;
}
function keys(resource: ResourceDefinition): ResourceField[] { return resource.fields.filter(field => field.primaryKey); }
function bindKeys(request: sql.Request, resource: ResourceDefinition, id: string): string {
  const parts = id.split(':');
  const keyFields = keys(resource);
  if (parts.length !== keyFields.length || parts.some(part => !/^[1-9]\d*$/.test(part) || Number(part) > 2147483647)) throw new AppError(400, 'INVALID_ID', 'Identificador inválido.');
  return keyFields.map((field, index) => { request.input(`key${index}`, sql.Int, Number(parts[index])); return `[${field.name}]=@key${index}`; }).join(' AND ');
}
function columns(resource: ResourceDefinition): string {
  return resource.fields.map(field => field.type === 'date' ? `CONVERT(varchar(33),[${field.name}],126) AS [${field.name}]` : `[${field.name}]`).join(',');
}
export async function listSecurityRecords(pool: sql.ConnectionPool, resource: ResourceDefinition, page: number, pageSize: number, search: string) {
  const request = pool.request();
  const searchable = resource.fields.filter(field => field.type === 'text');
  const where = search && searchable.length ? ` WHERE (${searchable.map(field => `[${field.name}] LIKE @search ESCAPE '\\'`).join(' OR ')})` : '';
  if (where) request.input('search', sql.VarChar(210), `%${search.replace(/[\\%_\[]/g, char => `\\${char}`)}%`);
  request.input('offset', sql.Int, (page - 1) * pageSize).input('limit', sql.Int, pageSize);
  const result = await request.query(securitySql(pool, `SELECT COUNT(*) AS total FROM dbo.[${resource.table}]${where};
    SELECT ${columns(resource)} FROM dbo.[${resource.table}]${where} ORDER BY ${keys(resource).map(field => `[${field.name}] DESC`).join(',')}
    OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`));
  const sets = result.recordsets as sql.IRecordSet<unknown>[];
  return { rows: sets[1] ?? [], total: (sets[0]?.[0] as { total: number } | undefined)?.total ?? 0, page, pageSize };
}
export async function getSecurityRecord(pool: sql.ConnectionPool, resource: ResourceDefinition, id: string) {
  const request = pool.request();
  const where = bindKeys(request, resource, id);
  const result = await request.query(securitySql(pool, `SELECT ${columns(resource)} FROM dbo.[${resource.table}] WHERE ${where}`));
  if (!result.recordset[0]) throw new AppError(404, 'NOT_FOUND', 'Registro no encontrado.');
  return result.recordset[0] as RecordData;
}
function bodySchema(resource: ResourceDefinition, partial: boolean) {
  const shape: Record<string, z.ZodType> = {};
  for (const field of resource.fields) {
    if (field.identity || field.generated || (partial && field.primaryKey)) continue;
    let rule: z.ZodType = field.type === 'boolean' ? z.boolean() : field.type === 'number'
      ? z.number().int().min(field.primaryKey ? 1 : 0).max(2147483647)
      : z.string().trim().min(1).max(field.maxBytes ?? 255).refine(value => Buffer.byteLength(value, 'utf8') <= (field.maxBytes ?? 255));
    if (field.name === 'CORREO') rule = z.email().max(120);
    if (field.nullable) rule = rule.nullable().optional();
    if (partial) rule = rule.optional();
    shape[field.name] = rule;
  }
  if (resource.table === 'USUARIO') shape.PASSWORD = partial ? z.string().min(12).max(256).optional() : z.string().min(12).max(256);
  return z.strictObject(shape).refine(data => Object.keys(data).length > 0);
}
function bindValue(request: sql.Request, field: ResourceField, name: string, value: unknown) {
  if (field.type === 'boolean') request.input(name, sql.Bit, value);
  else if (field.type === 'number') request.input(name, sql.Int, value);
  else request.input(name, sql.VarChar(field.maxBytes ?? 255), value);
}
export async function mutateSecurityRecord(pool: sql.ConnectionPool, resource: ResourceDefinition, operation: 'INSERT' | 'UPDATE' | 'DELETE', id: string | undefined, input: unknown, actor: string) {
  const parsed = operation === 'DELETE' ? null : bodySchema(resource, operation === 'UPDATE').safeParse(input);
  if (parsed && !parsed.success) throw new AppError(400, 'INVALID_RECORD', 'Revise campos, referencias y contraseña (mínimo 12 caracteres).');
  const data = (parsed?.success ? parsed.data : {}) as Record<string, unknown>;
  if (resource.table === 'USUARIO' && id === actor && (operation === 'DELETE' || data.ESTADO === false)) throw new AppError(409, 'SELF_LOCKOUT', 'No puede eliminar o desactivar su propia cuenta.');
  const passwordHash = typeof data.PASSWORD === 'string' ? await hashPassword(data.PASSWORD) : undefined;
  delete data.PASSWORD;
  const entries = Object.entries(data);
  const transaction = new sql.Transaction(pool);
  await transaction.begin();
  try {
    const request = new sql.Request(transaction);
    let where = '';
    if (operation !== 'INSERT') {
      where = bindKeys(request, resource, id ?? '');
      const found = await request.query(securitySql(pool, `SELECT ${keys(resource).map(f => `[${f.name}]`).join(',')} FROM dbo.[${resource.table}] WITH (UPDLOCK,HOLDLOCK) WHERE ${where}`));
      if (!found.recordset.length) throw new AppError(404, 'NOT_FOUND', 'Registro no encontrado.');
    }
    const names: string[] = [];
    const values: string[] = [];
    for (const [index, [name, value]] of entries.entries()) {
      const field = resource.fields.find(f => f.name === name)!;
      bindValue(request, field, `v${index}`, value);
      names.push(`[${name}]`); values.push(`@v${index}`);
    }
    if (passwordHash) { request.input('hash', sql.VarChar(255), passwordHash); names.push('[PASSWORD_HASH]'); values.push('@hash'); }
    if (operation === 'INSERT') {
      for (const field of resource.fields.filter(f => f.generated)) { names.push(`[${field.name}]`); values.push('SYSUTCDATETIME()'); }
    }
    const query = operation === 'DELETE' ? `DELETE FROM dbo.[${resource.table}] WHERE ${where}`
      : operation === 'INSERT' ? `INSERT INTO dbo.[${resource.table}] (${names.join(',')}) OUTPUT ${keys(resource).map(f => `INSERTED.[${f.name}]`).join(',')} VALUES (${values.join(',')})`
      : `UPDATE dbo.[${resource.table}] SET ${names.map((name, index) => `${name}=${values[index]}`).join(',')} WHERE ${where}`;
    const result = await request.query(securitySql(pool, query));
    let recordId = id;
    if (operation === 'INSERT') recordId = keys(resource).map(field => String(result.recordset[0][field.name])).join(':');
    await transaction.commit();
    return { id: recordId!, passwordChanged: !!passwordHash };
  } catch (error) { await transaction.rollback(); throw error; }
}
