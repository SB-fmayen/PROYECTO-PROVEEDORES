import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, verifyPassword, newSessionToken, digestSessionToken } from '../packages/auth/src/index.js';
import { requirePermission, AppError } from '../packages/domain/src/index.js';
import { atomic } from '../packages/application/src/index.js';
import { createServer } from '../apps/api/src/server.js';

test('Argon2id verifica y rechaza contraseña incorrecta; usa salt individual', async () => {
  const first = await hashPassword('contraseña de prueba');
  const second = await hashPassword('contraseña de prueba');
  assert.match(first, /^\$argon2id\$/);
  assert.notEqual(first, second);
  assert.equal(await verifyPassword(first, 'contraseña de prueba'), true);
  assert.equal(await verifyPassword(first, 'incorrecta'), false);
  assert.equal(await verifyPassword('texto plano', 'texto plano'), false);
});
test('permisos se deniegan por defecto y consulta no autoriza editar', () => {
  assert.throws(() => requirePermission(undefined, 'proveedor.update'), (e: unknown) => e instanceof AppError && e.statusCode === 401);
  assert.throws(() => requirePermission({ userId: '1', permissions: new Set(['proveedor.read']) }, 'proveedor.update'), (e: unknown) => e instanceof AppError && e.statusCode === 403);
});
test('si falla auditoría, rollback y ningún commit', async () => {
  const calls: string[] = [];
  await assert.rejects(atomic({ commit: async () => { calls.push('commit'); }, rollback: async () => { calls.push('rollback'); } }, async () => { calls.push('mutación'); throw new Error('auditoría falló'); }));
  assert.deepEqual(calls, ['mutación', 'rollback']);
});
test('transacción exitosa confirma después del trabajo', async () => {
  const calls: string[] = [];
  await atomic({ commit: async () => { calls.push('commit'); }, rollback: async () => { calls.push('rollback'); } }, async () => { calls.push('mutación', 'auditoría'); });
  assert.deepEqual(calls, ['mutación', 'auditoría', 'commit']);
});
test('tokens opacos aleatorios y digest separado', () => {
  const token = newSessionToken();
  assert.notEqual(token, newSessionToken());
  assert.notEqual(token, digestSessionToken(token));
});
test('health de proceso no afirma conectividad; no existen rutas funcionales abiertas', async () => {
  const app = await createServer({ logging: false });
  try {
    const response = await app.inject({ method: 'GET', url: '/api/health/live' });
    assert.equal(response.statusCode, 200);
    assert.equal((await app.inject({ method: 'POST', url: '/api/proveedores', payload: {} })).statusCode, 404);
  } finally { await app.close(); }
});
