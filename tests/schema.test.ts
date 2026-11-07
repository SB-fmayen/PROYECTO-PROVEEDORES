import { test } from 'node:test';
import assert from 'node:assert/strict';
import type sql from 'mssql';
import { configSchema } from '../packages/config/src/index.js';
import { securitySql, setSecuritySchema } from '../packages/db-sqlserver/src/schema.js';
import { listSecurityRecords } from '../packages/db-sqlserver/src/records.js';
import { securityResources } from '../packages/shared/src/security-resources.js';

test('schema SQL se limita a dos nombres y no permite inyectar identificadores', () => {
  assert.equal(configSchema.parse({ ORACLE_PASSWORD: 'test-only' }).SQLSERVER_SCHEMA, 'dbo');
  assert.equal(configSchema.safeParse({ ORACLE_PASSWORD: 'test-only', SQLSERVER_SCHEMA: 'dbo]; DROP TABLE USUARIO;--' }).success, false);
  const pool = {} as sql.ConnectionPool;
  assert.equal(securitySql(pool, 'SELECT ID_USUARIO FROM dbo.USUARIO WHERE ID_USUARIO=@id'), 'SELECT ID_USUARIO FROM [dbo].USUARIO WHERE ID_USUARIO=@id');
  setSecuritySchema(pool, 'SEGURIDAD_PROVEEDORES');
  assert.equal(securitySql(pool, 'SELECT ID_USUARIO FROM dbo.USUARIO WHERE ID_USUARIO=@id'), 'SELECT ID_USUARIO FROM [SEGURIDAD_PROVEEDORES].USUARIO WHERE ID_USUARIO=@id');
  assert.throws(() => setSecuritySchema(pool, 'invalido' as 'dbo'));
});

test('paginacion SQL usa el schema de su pool y conserva busqueda parametrizada', async () => {
  let statement = ''; const parameters = new Map<string, unknown>();
  const request = { input(name: string, _type: unknown, value: unknown) { parameters.set(name, value); return this; }, async query(q: string) { statement = q; return { recordsets: [[{ total: 0 }], []] }; } };
  const pool = { request: () => request } as unknown as sql.ConnectionPool;
  setSecuritySchema(pool, 'SEGURIDAD_PROVEEDORES');
  await listSecurityRecords(pool, securityResources.find(r => r.table === 'USUARIO')!, 1, 20, "' OR 1=1 --");
  assert.equal((statement.match(/\[SEGURIDAD_PROVEEDORES\]\.\[USUARIO\]/g) ?? []).length, 2);
  assert.ok(!statement.includes("' OR 1=1 --"));
  assert.equal(parameters.get('search'), "%' OR 1=1 --%");
});
