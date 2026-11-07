import { createServer } from './server.js';
import { loadConfig } from '../../../packages/config/src/index.js';
import { createOraclePool } from '../../../packages/db-oracle/src/index.js';
import { createSqlServerPool } from '../../../packages/db-sqlserver/src/index.js';
import { sqlSecurityRepository, assertSecuritySchema } from '../../../packages/db-sqlserver/src/security.js';
import { Sessions } from '../../../packages/auth/src/sessions.js';
import { assertAuditAvailable } from '../../../packages/audit/src/index.js';
import { registerApplicationRoutes } from './routes.js';

async function main() {
  const config = loadConfig();
  const app = await createServer();
  const oracle = await createOraclePool(config);
  app.addHook('onClose', async () => { await oracle.close(0); });
  try {
    const sqlserver = await createSqlServerPool(config);
    app.addHook('onClose', async () => { await sqlserver.close(); });
    const sessions = await Sessions.create(sqlSecurityRepository(sqlserver), config.SESSION_TTL_SECONDS);
    registerApplicationRoutes(app, oracle, sessions, config, sqlserver);
    app.get('/api/health/ready', async (_request, reply) => {
      try {
        const connection = await oracle.getConnection();
        try { await connection.execute('SELECT 1 FROM DUAL'); await assertAuditAvailable(connection); } finally { await connection.close(); }
        await sqlserver.request().query('SELECT 1 AS ready');
        await assertSecuritySchema(sqlserver);
        return { status: 'ready' };
      } catch { return reply.code(503).send({ status: 'unavailable' }); }
    });
    await app.listen({ host: config.API_HOST, port: config.API_PORT });
    for (const signal of ['SIGINT', 'SIGTERM'] as const) process.once(signal, () => { void app.close(); });
  } catch (error) { await app.close(); throw error; }
}
main().catch(() => { console.error('No se pudo iniciar la API. Revise configuración y conectividad de las bases.'); process.exitCode = 1; });
