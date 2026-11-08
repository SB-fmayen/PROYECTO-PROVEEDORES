import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import type { Config } from '../packages/config/src/index.js';

const file = '.local/profile-accounts.enc.json';
const aad = Buffer.from('cpp-profile-accounts-v1');
export interface ProfileAccount { login: string; password: string; role: string; userId: number; roleId: number; profileId: number; }
export interface ProfileCredentials { status: 'prepared' | 'committed'; accounts: ProfileAccount[]; }
function key(config: Config, salt: Buffer) {
  if (!config.SQLSERVER_PASSWORD) throw new Error('CREDENTIAL_KEY_UNAVAILABLE');
  return scryptSync(config.SQLSERVER_PASSWORD, salt, 32, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
}
export async function readProfileCredentials(config: Config): Promise<ProfileCredentials> {
  const envelope = JSON.parse(await readFile(file, 'utf8'));
  if (envelope.version !== 1) throw new Error('CREDENTIAL_FORMAT');
  const secret = key(config, Buffer.from(envelope.salt, 'base64'));
  try {
    const decipher = createDecipheriv('aes-256-gcm', secret, Buffer.from(envelope.iv, 'base64'));
    decipher.setAAD(aad); decipher.setAuthTag(Buffer.from(envelope.tag, 'base64'));
    return JSON.parse(Buffer.concat([decipher.update(Buffer.from(envelope.ciphertext, 'base64')),decipher.final()]).toString('utf8')) as ProfileCredentials;
  } finally { secret.fill(0); }
}
export async function saveProfileCredentials(config: Config, value: ProfileCredentials, exclusive: boolean) {
  const salt = randomBytes(16), iv = randomBytes(12), secret = key(config, salt);
  try {
    const cipher = createCipheriv('aes-256-gcm', secret, iv); cipher.setAAD(aad);
    const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value),'utf8'),cipher.final()]);
    const envelope = { version: 1, salt: salt.toString('base64'), iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), ciphertext: ciphertext.toString('base64') };
    await mkdir('.local', { recursive: true });
    await writeFile(file, JSON.stringify(envelope), { flag: exclusive ? 'wx' : 'w', mode: 0o600 });
  } finally { secret.fill(0); }
}
