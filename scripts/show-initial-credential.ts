import { loadConfig } from '../packages/config/src/index.js';
import { readInitialCredential } from './initial-credential.js';

// Solo a petición explícita, en una terminal local; no se admite redirección a archivo.
if (!process.argv.includes('--show') || !process.stdout.isTTY) {
  console.error('Para consultar el acceso inicial en su terminal local: npm.cmd run auth:credential -- --show');
  process.exitCode = 1;
} else {
  try {
    const value = await readInitialCredential(loadConfig());
    console.log(`Usuario: ${value.login}\nContraseña inicial: ${value.password}\nNo copie estos datos a chats o archivos. Cambie la contraseña desde Administración > Usuarios.`);
  } catch { console.error('No se pudo descifrar el acceso inicial. Requiere el archivo local y la misma credencial SQL usada al inicializar.'); process.exitCode = 1; }
}
