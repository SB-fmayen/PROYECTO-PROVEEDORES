import type sql from 'mssql';

export type SecuritySchema = 'dbo' | 'SEGURIDAD_PROVEEDORES';
const schemas = new WeakMap<sql.ConnectionPool, SecuritySchema>();
export function setSecuritySchema(pool: sql.ConnectionPool, schema: SecuritySchema): void {
  if (schema !== 'dbo' && schema !== 'SEGURIDAD_PROVEEDORES') throw new Error('INVALID_SECURITY_SCHEMA');
  schemas.set(pool, schema);
}
export function securitySql(pool: sql.ConnectionPool, query: string): string {
  // Solo dos identificadores fijos. Nunca toma un schema de HTTP ni de un bind.
  // Adapta SQL propio y plantillas revisadas, no SQL suministrado por usuarios.
  const schema = schemas.get(pool) ?? 'dbo';
  return query.replace(/\bdbo\./g, `[${schema}].`);
}
