import sql from 'mssql';
import type { Config } from '../../config/src/index.js';

export async function createSqlServerPool(config: Config): Promise<sql.ConnectionPool> {
  if (config.SQLSERVER_AUTH !== 'sql') throw new Error('WINDOWS_DIAGNOSTIC_ONLY: use npm run db:inspect:sqlserver');
  if (!config.SQLSERVER_USER || !config.SQLSERVER_PASSWORD) throw new Error('SQL_CREDENTIALS_REQUIRED');
  return new sql.ConnectionPool({
    server: config.SQLSERVER_HOST, database: config.SQLSERVER_DATABASE,
    user: config.SQLSERVER_USER, password: config.SQLSERVER_PASSWORD,
    ...(config.SQLSERVER_PORT ? { port: config.SQLSERVER_PORT } : {}),
    options: {
      encrypt: config.SQLSERVER_ENCRYPT, trustServerCertificate: config.SQLSERVER_TRUST_CERTIFICATE,
      ...(!config.SQLSERVER_PORT ? { instanceName: config.SQLSERVER_INSTANCE } : {})
    },
    pool: { min: 0, max: 5, idleTimeoutMillis: 30000 }, connectionTimeout: 10000
  }).connect();
}
