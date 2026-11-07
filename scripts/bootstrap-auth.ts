import { securitySql } from '../packages/db-sqlserver/src/schema.js';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import sql from 'mssql';
import { z } from 'zod';
import { loadConfig } from '../packages/config/src/index.js';
import { createSqlServerPool } from '../packages/db-sqlserver/src/index.js';
import { assertSecuritySchema } from '../packages/db-sqlserver/src/security.js';
import { hashPassword } from '../packages/auth/src/index.js';
import { resources } from '../packages/shared/src/resources.js';
import { securityResources } from '../packages/shared/src/security-resources.js';
import { prepareInitialCredential } from './initial-credential.js';

// Inicialización explícita de la primera cuenta de aplicación; no crea logins de BD.
// No reemplaza contraseñas existentes. El secreto inicial solo se conserva cifrado.
const config = loadConfig();
const pool = await createSqlServerPool(config);
try {
  await assertSecuritySchema(pool);
  const currentUsers = await pool.request().query(securitySql(pool, 'SELECT COUNT(*) AS total FROM dbo.USUARIO'));
  if (currentUsers.recordset[0]?.total !== 0) throw new Error('EXISTING_USERS');
  const { login, password } = await prepareInitialCredential(config);
  z.string().regex(/^[A-Za-z0-9._-]{3,50}$/).parse(login);
  z.string().min(12).max(256).parse(password);
  const passwordHash = await hashPassword(password);
  const accountSql = await readFile('database/sqlserver/seed/020_initial_admin.sql', 'utf8');
  const menuSql = await readFile('database/sqlserver/seed/021_initial_menu.sql', 'utf8');
  const transaction = new sql.Transaction(pool);
  await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
  try {
    const existing = await new sql.Request(transaction).query(securitySql(pool, 'SELECT COUNT(*) AS total FROM dbo.USUARIO WITH (TABLOCKX,HOLDLOCK)'));
    if (existing.recordset[0]?.total !== 0) throw new Error('EXISTING_USERS: inicializacion solo permitida en seguridad vacia; no se modifican cuentas existentes');
    const account = await new sql.Request(transaction).input('login', sql.VarChar(50), login).input('hash', sql.VarChar(255), passwordHash).query(securitySql(pool, accountSql));
    const profileId = account.recordset[0].profile_id;
    const modules = [...resources, ...securityResources];
    for (let index = 0; index < modules.length; index++) {
      const resource = modules[index]!;
      await new sql.Request(transaction).input('name', sql.VarChar(100), resource.label).input('route', sql.VarChar(200), `/${resource.slug}`).input('position', sql.Int, index + 1).input('profile', sql.Int, profileId).input('write', sql.Bit, !resource.readOnly).query(securitySql(pool, menuSql));
    }
    await transaction.commit();
    try {
      await mkdir('docs/evidence', { recursive: true });
      await writeFile('docs/evidence/bootstrap-auth.json', JSON.stringify({ capturedAt: new Date().toISOString(), status: 'initialized', modules: modules.length }, null, 2));
    } catch { console.log('Inicializacion confirmada; no se pudo guardar evidencia local.'); }
    console.log('Administrador de aplicacion creado con Argon2id. Acceso inicial cifrado en .local; consultarlo en su terminal con npm.cmd run auth:credential -- --show. No se muestran secretos.');
  } catch (error) { await transaction.rollback(); throw error; }
} catch (error) {
  const reason = error && typeof error === 'object' && 'code' in error ? String(error.code) : error instanceof Error && error.message.startsWith('EXISTING_USERS') ? 'EXISTING_USERS' : 'SETUP_FAILED';
  console.error(`Inicializacion no aplicada: ${reason}. Revise migracion y que no existan usuarios. No se muestran credenciales.`);
  process.exitCode = 1;
} finally { await pool.close(); }
