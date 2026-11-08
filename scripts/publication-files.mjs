import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { parse } from 'dotenv';
import { createDecipheriv, scryptSync } from 'node:crypto';

const rootFiles = ['.gitignore', '.gitattributes', '.env.example', 'README.md', 'SECURITY.md', 'ESTADO.md', 'package.json', 'package-lock.json', 'tsconfig.json'];
const directories = ['apps', 'packages', 'database', 'docs', 'scripts', 'tests', '.github'];
const skipDirs = new Set(['node_modules', 'dist', 'evidence', '.local', '.git', '__pycache__']);
const skipFiles = new Set(['docs/Resumen_del_proyecto.rtf']);
const extensions = new Set(['.ts', '.tsx', '.js', '.mjs', '.py', '.ps1', '.sql', '.md', '.json', '.html', '.css', '.svg', '.dot', '.pdf', '.yml', '.yaml', '.mmd']);
export async function publicationFiles() {
  const files = [];
  for (const name of rootFiles) { try { await readFile(name); files.push(name); } catch (e) { if (e.code !== 'ENOENT') throw e; } }
  async function walk(dir) {
    let entries; try { entries = await readdir(dir, { withFileTypes: true }); } catch (e) { if (e.code === 'ENOENT') return; throw e; }
    for (const entry of entries) {
      const relative = `${dir}/${entry.name}`;
      if (entry.isSymbolicLink()) throw new Error(`Symlink no permitido: ${relative}`);
      if (entry.isDirectory() && !skipDirs.has(entry.name)) await walk(relative);
      else if (entry.isFile() && !skipFiles.has(relative) && extensions.has(path.extname(entry.name))) files.push(relative);
    }
  }
  for (const dir of directories) await walk(dir);
  return [...new Set(files)].sort();
}
export async function scanPublication() {
  const files = await publicationFiles();
  let secrets = [];
  let localEnvironment = {};
  try {
    localEnvironment = parse(await readFile('.env'));
    secrets = Object.entries(localEnvironment).filter(([name, value]) => /PASSWORD|SECRET|TOKEN|API_KEY/.test(name) && value.length >= 6).map(([, value]) => value);
  } catch (e) { if (e.code !== 'ENOENT') throw e; }
  // Detectar tambien passwords de pruebas en archivos publicables sin escribirlos ni imprimirlos.
  try {
    const envelope = JSON.parse(await readFile('.local/profile-accounts.enc.json','utf8'));
    const password = process.env.SQLSERVER_PASSWORD ?? localEnvironment.SQLSERVER_PASSWORD;
    if (!password || envelope.version !== 1) throw new Error('No se pudo verificar el archivo local de cuentas; publicacion detenida.');
    const key = scryptSync(password, Buffer.from(envelope.salt,'base64'),32,{N:32768,r:8,p:1,maxmem:64*1024*1024});
    try {
      const decipher=createDecipheriv('aes-256-gcm',key,Buffer.from(envelope.iv,'base64'));
      decipher.setAAD(Buffer.from('cpp-profile-accounts-v1'));decipher.setAuthTag(Buffer.from(envelope.tag,'base64'));
      const value=JSON.parse(Buffer.concat([decipher.update(Buffer.from(envelope.ciphertext,'base64')),decipher.final()]).toString('utf8'));
      secrets.push(...value.accounts.map(account=>account.password));
    } finally { key.fill(0); }
  } catch(e) { if(e.code!=='ENOENT') throw new Error('No se pudo verificar el archivo local de cuentas; publicacion detenida.'); }
  const findings = [];
  for (const file of files) {
    const bytes = await readFile(file), value = bytes.toString('utf8');
    if (bytes.length > 5_000_000) findings.push({ file, rule: 'archivo mayor a 5 MB' });
    if (secrets.some(secret => value.includes(secret))) findings.push({ file, rule: 'secreto local detectado' });
    if (/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(value)) findings.push({ file, rule: 'clave privada' });
    if (/(?:github_pat_[A-Za-z0-9_]{30,}|gh[pousr]_[A-Za-z0-9]{30,}|AKIA[A-Z0-9]{16}|sk-proj-[A-Za-z0-9_-]{30,})/.test(value)) findings.push({ file, rule: 'token o access key' });
    if (/\$argon2(?:id|i|d)\$v=\d+\$[^\s'"]{30,}/.test(value)) findings.push({ file, rule: 'hash Argon2 exportado' });
  }
  if (findings.length) throw new Error(JSON.stringify(findings));
  return files;
}
if (process.argv[1]?.replaceAll('\\', '/').endsWith('/publication-files.mjs')) {
  const files = await scanPublication();
  console.log(`Revision aprobada: ${files.length} archivos permitidos; sin secretos locales ni patrones de credenciales detectados. No sustituye revision humana.`);
}
