import { test } from 'node:test';
import assert from 'node:assert/strict';
import type oracledb from 'oracledb';
import type sql from 'mssql';
import { createServer } from '../apps/api/src/server.js';
import { registerApplicationRoutes } from '../apps/api/src/routes.js';
import { Sessions } from '../packages/auth/src/sessions.js';
import { configSchema } from '../packages/config/src/index.js';
import { hashPassword } from '../packages/auth/src/index.js';

test('HTTP protege módulos y mutaciones, valida origen y emite cookie HttpOnly sin exponer token JSON', async () => {
  const passwordHash = await hashPassword('Test!Password2026');
  const sessions = await Sessions.create({
    findUser: async () => ({ id: '42', username: 'test', passwordHash, active: true }),
    getPrincipal: async () => ({ userId: '42', permissions: new Set(['proveedores.read']) })
  }, 1800);
  const config = configSchema.parse({ ORACLE_PASSWORD: 'test-only' });
  const app = await createServer({ logging: false });
  let connections = 0;
  const pool = { getConnection: async () => { connections++; throw new Error('Must not reach DB'); } } as unknown as oracledb.Pool;
  const securityPool = {} as sql.ConnectionPool; // Toda petición sin permiso debe ser rechazada antes de consultar SQL.
  registerApplicationRoutes(app, pool, sessions, config, securityPool);
  try {
    assert.equal((await app.inject({ method: 'GET', url: '/api/modules' })).statusCode, 401);
    assert.equal((await app.inject({ method: 'GET', url: '/api/form-options?module=proveedores' })).statusCode, 401);
    assert.equal((await app.inject({ method: 'POST', url: '/api/auth/login', payload: { username: 'test', password: 'Test!Password2026' } })).statusCode, 403);
    const response = await app.inject({ method: 'POST', url: '/api/auth/login', headers: { origin: config.WEB_ORIGIN }, payload: { username: 'test', password: 'Test!Password2026' } });
    assert.equal(response.statusCode, 200);
    const cookie = String(response.headers['set-cookie']);
    assert.match(cookie, /HttpOnly/); assert.match(cookie, /SameSite=Lax/);
    assert.equal(response.json().token, undefined);
    const headers = { cookie: cookie.split(';')[0]!, origin: config.WEB_ORIGIN };
    const modules = await app.inject({ method: 'GET', url: '/api/modules', headers });
    assert.equal(modules.statusCode, 200);
    assert.deepEqual(modules.json().map((m: { slug: string }) => m.slug), ['proveedores']);
    assert.equal((await app.inject({ method: 'POST', url: '/api/proveedores', headers, payload: { RAZONSOCIAL: 'test' } })).statusCode, 403);
    assert.equal((await app.inject({ method: 'GET', url: '/api/admin/usuarios', headers })).statusCode, 403);
    assert.equal((await app.inject({ method: 'GET', url: '/api/form-options?module=centros-costo', headers })).statusCode, 403);
    assert.equal((await app.inject({ method: 'POST', url: '/api/admin/usuarios', headers, payload: {} })).statusCode, 403);
    assert.equal((await app.inject({ method: 'PATCH', url: '/api/proveedores/1', headers: { ...headers, origin: 'https://origen-invalido.example' }, payload: { RAZONSOCIAL: 'test' } })).statusCode, 403);
    assert.equal(connections, 0);
    assert.equal((await app.inject({ method: 'POST', url: '/api/auth/logout', headers })).statusCode, 204);
    assert.equal((await app.inject({ method: 'GET', url: '/api/auth/me', headers })).statusCode, 401);
  } finally { await app.close(); }
});
