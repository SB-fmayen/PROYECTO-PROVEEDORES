import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Sessions, type SecurityRepository } from '../packages/auth/src/sessions.js';
import { hashPassword } from '../packages/auth/src/index.js';

test('una sesión expirada se rechaza antes de volver a consultar permisos', async () => {
  const passwordHash = await hashPassword('Temporal!SoloPruebas2026');
  let reads = 0;
  const sessions = await Sessions.create({
    findUser: async () => ({ id: '1', username: 'test', passwordHash, active: true }),
    getPrincipal: async () => { reads++; return { userId: '1', permissions: new Set(['proveedores.read']) }; }
  }, 0);
  const result = await sessions.login('test', 'Temporal!SoloPruebas2026');
  await assert.rejects(sessions.authenticate(result.token));
  assert.equal(reads, 1);
});

test('sesión rota token, revoca logout y aplica cambios de permisos y bajas inmediatamente', async () => {
  const passwordHash = await hashPassword('Prueba!SoloTests2026');
  let active = true;
  let permissions = new Set(['proveedores.read', 'proveedores.create']);
  const security: SecurityRepository = {
    findUser: async username => username === 'demo' ? { id: '42', username, passwordHash, active } : null,
    getPrincipal: async () => active ? { userId: '42', permissions } : null
  };
  const sessions = await Sessions.create(security, 1800);
  await assert.rejects(sessions.login('demo', 'incorrecta'));
  await assert.rejects(sessions.login('no-existe', 'incorrecta'));
  const first = await sessions.login('demo', 'Prueba!SoloTests2026');
  const second = await sessions.login('demo', 'Prueba!SoloTests2026', first.token);
  assert.notEqual(first.token, second.token);
  await assert.rejects(sessions.authenticate(first.token));
  permissions = new Set(['proveedores.read']);
  assert.equal((await sessions.authenticate(second.token)).permissions.has('proveedores.create'), false);
  active = false;
  await assert.rejects(sessions.authenticate(second.token));
  active = true;
  const third = await sessions.login('demo', 'Prueba!SoloTests2026');
  sessions.logout(third.token);
  await assert.rejects(sessions.authenticate(third.token));
});
