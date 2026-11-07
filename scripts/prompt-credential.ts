import { createInterface } from 'node:readline/promises';
import { Writable } from 'node:stream';

export async function promptCredential(): Promise<{ login: string; password: string }> {
  if (!process.stdin.isTTY || !process.stdout.isTTY) throw new Error('CREDENTIAL_PROMPT_REQUIRES_LOCAL_TERMINAL');
  let hidden = false;
  const output = new Writable({ write(chunk, _encoding, done) { if (!hidden) process.stdout.write(chunk); done(); } });
  const terminal = createInterface({ input: process.stdin, output, terminal: true });
  try {
    const login = (await terminal.question('Usuario administrador: ')).trim();
    process.stdout.write('Contraseña (no se muestra ni guarda): ');
    hidden = true;
    const password = await terminal.question('');
    return { login, password };
  } finally { hidden = false; terminal.close(); process.stdout.write('\n'); }
}
