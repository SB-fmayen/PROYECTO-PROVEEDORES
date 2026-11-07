import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import sql from 'mssql';
import oracledb from 'oracledb';
import { loadConfig } from '../packages/config/src/index.js';
import { createOraclePool } from '../packages/db-oracle/src/index.js';
import { createSqlServerPool } from '../packages/db-sqlserver/src/index.js';
import { sqlSecurityRepository } from '../packages/db-sqlserver/src/security.js';
import { Sessions } from '../packages/auth/src/sessions.js';
import { verifyPassword } from '../packages/auth/src/index.js';
import { createServer } from '../apps/api/src/server.js';
import { registerApplicationRoutes } from '../apps/api/src/routes.js';
import { resources } from '../packages/shared/src/resources.js';
import { securityResources } from '../packages/shared/src/security-resources.js';
import { readInitialCredential } from './initial-credential.js';
import { promptCredential } from './prompt-credential.js';

// HTTP real mediante Fastify.inject + ambos repositorios reales. Sin mocks.
// Borra exclusivamente registros creados aquí; conserva su auditoría explícita.
const config = loadConfig();
const credential = process.argv.includes('--prompt') ? await promptCredential() : await readInitialCredential(config);
const oracle = await createOraclePool(config);
const security = await createSqlServerPool(config);
const app = await createServer({ logging: false });
const sessions = await Sessions.create(sqlSecurityRepository(security), config.SESSION_TTL_SECONDS);
registerApplicationRoutes(app, oracle, sessions, config, security);
const marker = `IT${randomBytes(5).toString('hex')}`;
const checks: string[] = [];
const cleanup: { path: string; active: boolean }[] = [];
const oracleIds: { table: string; id: string }[] = [];
let adminCookie = '';
let client = '127.0.0.10';
const check = (name: string) => { checks.push(name); console.log(`${name}: ok`); };
async function request(path: string, method: 'GET' | 'POST' | 'PATCH' | 'DELETE' = 'GET', body?: unknown, cookie = adminCookie, address = client, origin = config.WEB_ORIGIN) {
  const response = await app.inject({ method, url: `/api/${path}`, remoteAddress: address, headers: { cookie, origin }, ...(body === undefined ? {} : { payload: body as object }) });
  return { response, body: response.body ? response.json() : null };
}
async function expect(path: string, status: number, method: 'GET' | 'POST' | 'PATCH' | 'DELETE' = 'GET', body?: unknown, cookie = adminCookie, address = client) {
  const result = await request(path, method, body, cookie, address);
  assert.equal(result.response.statusCode, status, `${method} ${path}: ${result.response.statusCode} (${result.body?.code ?? 'no-code'})`);
  return result;
}
async function create(slug: string, data: object): Promise<{ id: string; row: Record<string, unknown> }> {
  const result = await expect(slug, 201, 'POST', data);
  const definition = [...resources, ...securityResources].find(item => item.slug === slug)!;
  const id = definition.fields.filter(field => field.primaryKey).map(field => result.body[field.name]).join(':');
  cleanup.push({ path: `${slug}/${id}`, active: true });
  if (!slug.startsWith('admin/')) oracleIds.push({ table: definition.table, id });
  return { id, row: result.body };
}
async function remove(path: string) {
  await expect(path, 204, 'DELETE');
  const entry = cleanup.find(item => item.path === path); if (entry) entry.active = false;
}
try {
  const login = await expect('auth/login', 200, 'POST', { username: credential.login, password: credential.password }, '', '127.0.0.1');
  adminCookie = String(login.response.headers['set-cookie']).split(';')[0]!;
  assert.match(String(login.response.headers['set-cookie']), /HttpOnly/);
  assert.match(String(login.response.headers['set-cookie']), /SameSite=Lax/);
  assert.equal(login.body.token, undefined);
  assert.equal(login.response.headers['cache-control'], 'no-store');
  const adminId = login.body.userId as string;
  const adminRecord = await security.request().input('id', sql.Int, Number(adminId)).query('SELECT PASSWORD_HASH FROM dbo.USUARIO WHERE ID_USUARIO=@id');
  assert.ok(adminRecord.recordset[0].PASSWORD_HASH.startsWith('$argon2id$'));
  assert.equal(await verifyPassword(adminRecord.recordset[0].PASSWORD_HASH, credential.password), true);
  assert.equal((await readFile('.local/initial-admin.enc.json', 'utf8')).includes(credential.password), false);
  check('admin:argon2id-encrypted-initial-credential');
  const seedTransaction = new sql.Transaction(security);
  await seedTransaction.begin();
  try {
    await new sql.Request(seedTransaction).input('login', sql.VarChar(50), 'must-not-be-created').input('hash', sql.VarChar(255), adminRecord.recordset[0].PASSWORD_HASH).query(await readFile('database/sqlserver/seed/020_initial_admin.sql', 'utf8'));
    assert.fail('La inicialización no debe reemplazar cuentas existentes.');
  } catch (error) { assert.equal((error as { number: number }).number, 51000); }
  finally { await seedTransaction.rollback(); }
  check('bootstrap:existing-users-protected');
  const invalid = await expect('auth/login', 401, 'POST', { username: credential.login, password: 'invalid-password' }, '', '127.0.0.1');
  const absent = await expect('auth/login', 401, 'POST', { username: `${marker}-absent`, password: 'invalid-password' }, '', '127.0.0.1');
  assert.equal(invalid.body.message, absent.body.message);
  await expect('auth/me', 200);
  const second = await expect('auth/login', 200, 'POST', { username: credential.login, password: credential.password }, adminCookie, '127.0.0.1');
  const oldCookie = adminCookie;
  adminCookie = String(second.response.headers['set-cookie']).split(';')[0]!;
  assert.notEqual(adminCookie, oldCookie);
  await expect('auth/me', 401, 'GET', undefined, oldCookie);
  check('login:real-rotation-cookie-and-generic-rejection');
  const modules = await expect('modules', 200);
  assert.equal(modules.body.length, resources.length + securityResources.length);
  for (const resource of [...resources, ...securityResources]) {
    const listed = await expect(`${resource.slug}?page=1&pageSize=1&search=`, 200);
    assert.ok(Array.isArray(listed.body.rows));
    assert.equal(JSON.stringify(listed.body).includes('PASSWORD_HASH'), false);
  }
  const dashboard = await expect('dashboard', 200);
  assert.equal(dashboard.body.length, resources.length);
  check('reads:18-modules-dashboard-no-password-hashes');
  await expect('admin/usuarios/' + adminId, 409, 'PATCH', { ESTADO: false });
  check('admin:self-deactivation-rejected');

  // Cadena real completa de seguridad con una cuenta temporal de consulta.
  const role = await create('admin/roles', { NOMBRE_ROL: `${marker}-rol`, ESTADO: true });
  const profile = await create('admin/perfiles', { NOMBRE_PERFIL: `${marker}-perfil`, ESTADO: true });
  const menu = await create('admin/menus', { NOMBRE_MENU: `${marker}-menu`, RUTA: '/proveedores', ORDEN: 999, ESTADO: true });
  const tempPassword = randomBytes(24).toString('base64url');
  const tempLogin = `${marker}-user`;
  const user = await create('admin/usuarios', { NOMBRE: marker, USUARIO_LOGIN: tempLogin, ESTADO: true, PASSWORD: tempPassword });
  const rp = await create('admin/rol-perfiles', { ID_ROL: Number(role.id), ID_PERFIL: Number(profile.id), ESTADO: true });
  const pm = await create('admin/perfil-menus', { ID_PERFIL: Number(profile.id), ID_MENU: Number(menu.id), PUEDE_VER: true, PUEDE_CREAR: false, PUEDE_EDITAR: false, PUEDE_ELIMINAR: false });
  const ur = await create('admin/usuario-roles', { ID_USUARIO: Number(user.id), ID_ROL: Number(role.id), ESTADO: true });
  for (const [slug, id, patch] of [
    ['admin/roles', role.id, { DESCRIPCION: marker }], ['admin/perfiles', profile.id, { DESCRIPCION: marker }],
    ['admin/menus', menu.id, { ORDEN: 998 }], ['admin/usuarios', user.id, { NOMBRE: `${marker}-edit` }],
    ['admin/rol-perfiles', rp.id, { ESTADO: true }], ['admin/usuario-roles', ur.id, { ESTADO: true }],
    ['admin/perfil-menus', pm.id, { PUEDE_CREAR: false }]
  ] as const) { await expect(`${slug}/${id}`, 200); await expect(`${slug}/${id}`, 200, 'PATCH', patch); }
  const temp = await expect('auth/login', 200, 'POST', { username: tempLogin, password: tempPassword }, '', '127.0.0.20');
  let tempCookie = String(temp.response.headers['set-cookie']).split(';')[0]!;
  const consult = await expect('auth/me', 200, 'GET', undefined, tempCookie, '127.0.0.20');
  assert.deepEqual(consult.body.permissions, ['proveedores.read']);
  await expect('proveedores', 200, 'GET', undefined, tempCookie, '127.0.0.20');
  await expect('proveedores', 403, 'POST', { RAZONSOCIAL: marker }, tempCookie, '127.0.0.20');
  await expect('admin/usuarios', 403, 'GET', undefined, tempCookie, '127.0.0.20');
  check('authorization:consult-role-cannot-write-or-administer');
  for (const path of [`admin/roles/${role.id}`, `admin/perfiles/${profile.id}`, `admin/menus/${menu.id}`, `admin/rol-perfiles/${rp.id}`, `admin/usuario-roles/${ur.id}`]) {
    await expect(path, 200, 'PATCH', { ESTADO: false });
    const principal = await expect('auth/me', 200, 'GET', undefined, tempCookie, '127.0.0.20');
    assert.equal(principal.body.permissions.length, 0);
    await expect(path, 200, 'PATCH', { ESTADO: true });
  }
  await expect(`admin/perfil-menus/${pm.id}`, 200, 'PATCH', { PUEDE_VER: false });
  await expect('proveedores', 403, 'GET', undefined, tempCookie, '127.0.0.20');
  await expect(`admin/perfil-menus/${pm.id}`, 200, 'PATCH', { PUEDE_VER: true });
  check('authorization:every-active-link-and-action-revalidated');
  const nextPassword = randomBytes(24).toString('base64url');
  await expect(`admin/usuarios/${user.id}`, 200, 'PATCH', { PASSWORD: nextPassword });
  await expect('auth/me', 401, 'GET', undefined, tempCookie, '127.0.0.20');
  await expect('auth/login', 401, 'POST', { username: tempLogin, password: tempPassword }, '', '127.0.0.20');
  const newSession = await expect('auth/login', 200, 'POST', { username: tempLogin, password: nextPassword }, '', '127.0.0.20');
  tempCookie = String(newSession.response.headers['set-cookie']).split(';')[0]!;
  await expect(`admin/usuarios/${user.id}`, 200, 'PATCH', { ESTADO: false });
  await expect('auth/me', 401, 'GET', undefined, tempCookie, '127.0.0.20');
  check('session:password-change-and-disabled-user-revoke');

  // Clientes separados por grupo para conservar los límites reales por IP.
  client = '127.0.0.30';
  const provider = await create('proveedores', { NIT: marker, RAZONSOCIAL: marker, SALDOACTUAL: 0 });
  const cost = await create('centros-costo', { NOMBRE: marker });
  const responsible = await create('usuarios-negocio', { NOMBRE: marker });
  const document = await create('documentos-compra', { IDPROVEEDOR: Number(provider.id), IDCENTROCOSTO: Number(cost.id), SUBTOTAL: 100, IVA: 12, TOTAL: 112, FECHAEMISION: '2026-11-03', FECHAVENCIMIENTO: '2026-12-03' });
  const detail = await create('detalles', { IDDOCUMENTOCOMPRA: Number(document.id), CANTIDAD: 2, PRECIOUNITARIO: 50, MONTO: 100 });
  const retention = await create('retenciones-isr', { IDDOCUMENTOCOMPRA: Number(document.id), MONTORETENIDO: 5 });
  const voucher = await create('contrasenas-pago', { IDDOCUMENTOCOMPRA: Number(document.id), IDUSUARIO: Number(responsible.id) });
  const payment = await create('pagos-bancarios', { IDPROVEEDOR: Number(provider.id), MONTO: 107 });
  const settlement = await create('documentos-por-liquidar', { IDPAGO: Number(payment.id), IDDOCUMENTOCOMPRA: Number(document.id), MONTOAPLICADO: 107, SALDOPENDIENTE: 5 });
  const entry = await create('asientos-contables', { IDDOCUMENTOCOMPRA: Number(document.id), IDPAGO: Number(payment.id), DEBE: 107, HABER: 0 });
  for (const [slug, id, patch] of [
    ['proveedores', provider.id, { RAZONSOCIAL: `${marker}-edit` }], ['centros-costo', cost.id, { DESCRIPCION: marker }],
    ['usuarios-negocio', responsible.id, { NOMBRE: `${marker}-edit` }], ['documentos-compra', document.id, { SERIE: 'IT' }],
    ['detalles', detail.id, { DESCRIPCION: marker }], ['retenciones-isr', retention.id, { NUMEROCONSTANCIA: marker }],
    ['contrasenas-pago', voucher.id, { ESTADO: 'PRUEBA' }], ['pagos-bancarios', payment.id, { BANCO: marker }],
    ['documentos-por-liquidar', settlement.id, { FECHALIQUIDACION: '2026-11-03' }], ['asientos-contables', entry.id, { PERIODO: '2026-11' }]
  ] as const) { await expect(`${slug}/${id}`, 200); await expect(`${slug}/${id}`, 200, 'PATCH', patch); }
  await expect('documentos-compra', 409, 'POST', { IDPROVEEDOR: 9007199254740990, IDCENTROCOSTO: Number(cost.id) });
  await expect('proveedores', 400, 'POST', { IDPROVEEDOR: 1, RAZONSOCIAL: marker });
  await expect(`proveedores/${provider.id}`, 409, 'DELETE');
  check('oracle:10-modules-create-read-update-and-foreign-keys');
  for (const item of [...cleanup].reverse().filter(item => !item.path.startsWith('admin/'))) { await remove(item.path); await expect(item.path, 404); }
  check('oracle:10-modules-delete');
  const connection = await oracle.getConnection();
  try {
    for (const item of oracleIds) {
      const result = await connection.execute<{ OPERACION: string; DATOS_NUEVOS: string }>(`SELECT OPERACION,DATOS_NUEVOS FROM ADMIN_CU_PROVEEDORES.LOG_AUDITORIA_ODC WHERE NOMBRE_TABLA=:tableName AND ID_REGISTRO=:id`, { tableName: item.table, id: item.id }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
      assert.deepEqual(result.rows?.map(row => row.OPERACION).sort(), ['DELETE', 'INSERT', 'UPDATE']);
      for (const row of result.rows ?? []) assert.equal(JSON.parse(row.DATOS_NUEVOS).applicationUserId, adminId);
    }
  } finally { await connection.close(); }
  check('audit:30-committed-events-with-real-actor');
  client = '127.0.0.11';
  for (const item of [...cleanup].reverse().filter(item => item.path.startsWith('admin/'))) await remove(item.path);
  check('sql:7-admin-modules-create-read-update-delete');
  assert.equal((await request('proveedores', 'POST', {}, adminCookie, client, 'https://invalid-origin.example')).response.statusCode, 403);
  check('csrf:foreign-origin-rejected');
  for (let attempt = 0; attempt < 6; attempt++) await expect('auth/login', attempt < 5 ? 401 : 429, 'POST', { username: `${marker}-absent`, password: 'invalid' }, '', '127.0.0.99');
  check('login:rate-limit-enforced');
  await expect('auth/logout', 204, 'POST');
  await expect('auth/me', 401);
  check('logout:server-session-revoked');
  await mkdir('docs/evidence', { recursive: true });
  await writeFile('docs/evidence/integral.json', JSON.stringify({ capturedAt: new Date().toISOString(), status: 'passed', databases: 'real', fixturesRemoved: cleanup.every(item => !item.active), retainedAuditEvents: oracleIds.length * 3, checks }, null, 2));
} finally {
  // Limpieza defensiva si una aserción interrumpe el flujo; nunca datos ajenos.
  const remaining: string[] = [];
  for (const item of [...cleanup].reverse().filter(item => item.active)) {
    try { const result = await request(item.path, 'DELETE', undefined, adminCookie, '127.0.0.80'); if (![204, 404].includes(result.response.statusCode)) remaining.push(item.path); }
    catch { remaining.push(item.path); }
  }
  if (remaining.length) console.error(`Limpieza pendiente de fixtures propios: ${remaining.join(', ')}`);
  await app.close(); await oracle.close(0); await security.close();
}
