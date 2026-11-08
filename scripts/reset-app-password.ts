import { createInterface } from 'node:readline/promises';
import { Writable } from 'node:stream';
import { createConnection } from 'node:net';
import { readFile } from 'node:fs/promises';
import sql from 'mssql';
import { z } from 'zod';
import { loadConfig } from '../packages/config/src/index.js';
import { createSqlServerPool } from '../packages/db-sqlserver/src/index.js';
import { securitySql } from '../packages/db-sqlserver/src/schema.js';
import { sqlSecurityRepository } from '../packages/db-sqlserver/src/security.js';
import { hashPassword } from '../packages/auth/src/index.js';

// Recuperacion local explicita; nunca expone un endpoint de reset sin autenticacion.
// API detenida para revocar todas las sesiones en memoria, incluso las del usuario objetivo.
async function listenerPresent(host: string, port: number): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const socket = createConnection({ host, port });
    const finish = (listening: boolean) => { socket.destroy(); resolve(listening); };
    socket.setTimeout(2000);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => { socket.destroy(); reject(new Error('API_STATE_UNKNOWN')); });
    socket.once('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'ECONNREFUSED') finish(false);
      else reject(new Error('API_STATE_UNKNOWN'));
    });
  });
}
async function newPassword(): Promise<string> {
  const hiddenOutput = new Writable({ write(_chunk, _encoding, done) { done(); } });
  const terminal = createInterface({ input: process.stdin, output: hiddenOutput, terminal: true, historySize: 0 });
  try {
    process.stdout.write('Nueva contraseña (minimo 12 caracteres; no se muestra): ');
    const password = await terminal.question('');
    process.stdout.write('\nRepite la nueva contraseña (no se muestra): ');
    const confirmation = await terminal.question('');
    process.stdout.write('\n');
    if (!z.string().min(12).max(256).safeParse(password).success) throw new Error('PASSWORD_LENGTH');
    if (password !== confirmation) throw new Error('PASSWORD_MISMATCH');
    return password;
  } finally { terminal.close(); }
}
async function main() {
  if (!process.stdin.isTTY || !process.stdout.isTTY) throw new Error('LOCAL_TERMINAL_REQUIRED');
  const args = process.argv.slice(2);
  if (args.length !== 2 || args[0] !== '--login') throw new Error('USAGE');
  const login = z.string().regex(/^[A-Za-z0-9._-]{3,50}$/).parse(args[1]);
  const config = loadConfig();
  if (!['127.0.0.1', 'localhost', '::1'].includes(config.API_HOST)) throw new Error('LOCAL_API_REQUIRED');
  if (await listenerPresent(config.API_HOST, config.API_PORT)) throw new Error('STOP_API_FIRST');
  const pool = await createSqlServerPool(config);
  try {
    const repository = sqlSecurityRepository(pool);
    const user = await repository.findUser(login);
    if (!user?.active || !user.passwordHash) throw new Error('ACTIVE_ADMIN_REQUIRED');
    const principal = await repository.getPrincipal(user.id);
    if (!principal?.permissions.has('admin/usuarios.update')) throw new Error('ACTIVE_ADMIN_REQUIRED');
    const password = await newPassword();
    const hash = await hashPassword(password);
    if (await listenerPresent(config.API_HOST, config.API_PORT)) throw new Error('STOP_API_FIRST');
    const source = await readFile('database/sqlserver/seed/050_reset_app_password.sql', 'utf8');
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    try {
      const result = await new sql.Request(transaction)
        .input('id', sql.Int, Number(user.id)).input('hash', sql.VarChar(255), hash)
        .input('oldHash', sql.VarChar(255), user.passwordHash)
        .query(securitySql(pool, source));
      if (result.rowsAffected[0] !== 1) throw new Error('ACCOUNT_CHANGED');
      await transaction.commit();
    } catch (error) { await transaction.rollback(); throw error; }
    console.log('Contraseña actualizada. Reinicia la API y entra con la nueva contraseña. El acceso inicial permanece invalidado.');
  } finally { await pool.close(); }
}
main().catch(error => {
  const messages: Record<string, string> = {
    LOCAL_TERMINAL_REQUIRED: 'Ejecutar en una terminal local interactiva; no se aceptan redirecciones.',
    USAGE: 'Uso: npm.cmd run auth:reset -- --login admin. No pasar contraseñas por argumentos.',
    LOCAL_API_REQUIRED: 'La recuperacion solo admite API local.',
    API_STATE_UNKNOWN: 'No se pudo comprobar si la API esta detenida; no se cambia la contraseña.',
    STOP_API_FIRST: 'Primero detener la API para invalidar sus sesiones en memoria.',
    ACTIVE_ADMIN_REQUIRED: 'Se requiere una cuenta activa con permiso de administrar usuarios; no se activan cuentas ni se agregan permisos.',
    PASSWORD_LENGTH: 'La contraseña debe tener entre 12 y 256 caracteres.',
    PASSWORD_MISMATCH: 'Las contraseñas no coinciden; no se hicieron cambios.',
    ACCOUNT_CHANGED: 'La cuenta cambio durante la operacion; se revirtio el cambio.'
  };
  console.error(messages[error instanceof Error ? error.message : ''] ?? 'No se actualizo la contraseña. Revisar conexion/configuracion; no se muestran detalles sensibles.');
  process.exitCode = 1;
});
