import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import type { Config } from '../packages/config/src/index.js';

const path = '.local/initial-admin.enc.json';
interface Envelope { version: number; salt: string; iv: string; tag: string; ciphertext: string; }
function key(config: Config, salt: Buffer): Buffer {
  if (!config.SQLSERVER_PASSWORD) throw new Error('INITIAL_CREDENTIAL_KEY_UNAVAILABLE');
  return scryptSync(config.SQLSERVER_PASSWORD, salt, 32, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
}
export async function readInitialCredential(config: Config): Promise<{ login: string; password: string }> {
  const value = JSON.parse(await readFile(path, 'utf8')) as Envelope;
  if (value.version !== 1) throw new Error('INITIAL_CREDENTIAL_FORMAT');
  const salt = Buffer.from(value.salt, 'base64');
  const secret = key(config, salt);
  try {
    const decipher = createDecipheriv('aes-256-gcm', secret, Buffer.from(value.iv, 'base64'));
    decipher.setAAD(Buffer.from('cpp-initial-admin-v1'));
    decipher.setAuthTag(Buffer.from(value.tag, 'base64'));
    return JSON.parse(Buffer.concat([decipher.update(Buffer.from(value.ciphertext, 'base64')), decipher.final()]).toString('utf8'));
  } finally { secret.fill(0); }
}
export async function prepareInitialCredential(config: Config): Promise<{ login: string; password: string }> {
  try { return await readInitialCredential(config); }
  catch (error) { if (!(error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT')) throw new Error('INITIAL_CREDENTIAL_UNREADABLE'); }
  const value = { login: process.env.APP_ADMIN_LOGIN || 'admin', password: `Cpp!${randomBytes(24).toString('base64url')}` };
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const secret = key(config, salt);
  try {
    const cipher = createCipheriv('aes-256-gcm', secret, iv);
    cipher.setAAD(Buffer.from('cpp-initial-admin-v1'));
    const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
    await mkdir('.local', { recursive: true });
    await writeFile(path, JSON.stringify({ version: 1, salt: salt.toString('base64'), iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), ciphertext: ciphertext.toString('base64') }), { flag: 'wx', mode: 0o600 });
  } finally { secret.fill(0); }
  return value;
}
