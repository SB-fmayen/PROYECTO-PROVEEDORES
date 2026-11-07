import { defineConfig, loadEnv } from 'vite';
import { resolve } from 'node:path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, resolve(process.cwd(), '../..'), 'API_');
  const proxy = { '/api': `http://127.0.0.1:${env.API_PORT || 3001}` };
  return { server: { host: '127.0.0.1', port: 5173, strictPort: true, proxy }, preview: { host: '127.0.0.1', port: 5173, strictPort: true, proxy } };
});
