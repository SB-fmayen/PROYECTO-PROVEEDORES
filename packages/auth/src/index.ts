import argon2 from 'argon2';
import { randomBytes, createHash } from 'node:crypto';

export function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, { type: argon2.argon2id, memoryCost: 65536, timeCost: 3, parallelism: 1 });
}
export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  if (!hash.startsWith('$argon2id$')) return false;
  try { return await argon2.verify(hash, password); } catch { return false; }
}
export function newSessionToken(): string { return randomBytes(32).toString('base64url'); }
export function digestSessionToken(token: string): string { return createHash('sha256').update(token).digest('hex'); }
