import 'dotenv/config';
import { z } from 'zod';

const bool = z.enum(['true', 'false']).transform(value => value === 'true');
export const configSchema = z.object({
  API_HOST: z.string().default('127.0.0.1'),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  WEB_ORIGIN: z.url().default('http://localhost:5173'),
  ORACLE_HOST: z.string().default('localhost'),
  ORACLE_PORT: z.coerce.number().int().min(1).max(65535).default(1521),
  ORACLE_SERVICE: z.string().default('FREEPDB1'),
  ORACLE_USER: z.literal('CRUD_PROVEEDORES').default('CRUD_PROVEEDORES'),
  ORACLE_PASSWORD: z.string().min(1),
  SQLSERVER_HOST: z.string().default('localhost'),
  SQLSERVER_INSTANCE: z.string().default('SQLEXPRESS'),
  SQLSERVER_PORT: z.preprocess(v => v === '' ? undefined : v, z.coerce.number().int().min(1).max(65535).optional()),
  SQLSERVER_DATABASE: z.literal('CuentasPorPagarDB').default('CuentasPorPagarDB'),
  SQLSERVER_AUTH: z.enum(['windows', 'sql']).default('windows'),
  SQLSERVER_USER: z.string().default(''), SQLSERVER_PASSWORD: z.string().default(''),
  SQLSERVER_ENCRYPT: bool.default(true), SQLSERVER_TRUST_CERTIFICATE: bool.default(false),
  SESSION_TTL_SECONDS: z.coerce.number().int().min(60).max(86400).default(1800),
  SESSION_SECURE: bool.default(false)
});
export type Config = z.infer<typeof configSchema>;
export function loadConfig(): Config { return configSchema.parse(process.env); }
