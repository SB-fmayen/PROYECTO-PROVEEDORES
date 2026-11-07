import oracledb from 'oracledb';
import type { Config } from '../../config/src/index.js';
import { atomic } from '../../application/src/index.js';

export function createOraclePool(config: Config): Promise<oracledb.Pool> {
  return oracledb.createPool({
    user: config.ORACLE_USER, password: config.ORACLE_PASSWORD,
    connectString: `${config.ORACLE_HOST}:${config.ORACLE_PORT}/${config.ORACLE_SERVICE}`,
    poolMin: 0, poolMax: 5, poolTimeout: 60
  });
}
export async function inOracleTransaction<T>(pool: oracledb.Pool, work: (connection: oracledb.Connection) => Promise<T>): Promise<T> {
  const connection = await pool.getConnection();
  try { return await atomic(connection, () => work(connection)); }
  finally { await connection.close(); }
}
