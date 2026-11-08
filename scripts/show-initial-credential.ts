import { loadConfig } from '../packages/config/src/index.js';
import { readInitialCredential } from './initial-credential.js';
import { createSqlServerPool } from '../packages/db-sqlserver/src/index.js';
import { sqlSecurityRepository } from '../packages/db-sqlserver/src/security.js';
import { verifyPassword } from '../packages/auth/src/index.js';

// Solo a petición explícita, en una terminal local; no se admite redirección a archivo.
if (!process.argv.includes('--show') || !process.stdout.isTTY) {
  console.error('Para consultar el acceso inicial en su terminal local: npm.cmd run auth:credential -- --show');
  process.exitCode = 1;
} else {
  try {
    const config = loadConfig();
    const value = await readInitialCredential(config);
    const pool = await createSqlServerPool(config);
    try {
      const user = await sqlSecurityRepository(pool).findUser(value.login);
      if (!user?.active || !user.passwordHash || !await verifyPassword(user.passwordHash, value.password)) {
        console.error('La contraseña inicial ya no es valida y no se muestra. Usa tu contraseña actual. Si la olvidaste: npm.cmd run auth:reset -- --login admin (con la API detenida).');
        process.exitCode = 1;
      } else {
        console.log(`Usuario: ${value.login}\nContraseña inicial: ${value.password}\nNo copie estos datos a chats o archivos. Cambie la contraseña desde Administración > Usuarios.`);
      }
    } finally { await pool.close(); }
  } catch { console.error('No se pudo verificar el acceso inicial; no se muestran credenciales. Requiere el archivo local, su clave de cifrado y acceso a la base configurada.'); process.exitCode = 1; }
}
