import Fastify from 'fastify';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { AppError } from '../../../packages/domain/src/index.js';
import type { HealthResponse } from '../../../packages/shared/src/index.js';

export async function createServer(options: { logging?: boolean } = {}) {
  const app = Fastify({ logger: options.logging === false ? false : { redact: ['req.headers.authorization', 'req.headers.cookie', 'res.headers.set-cookie', 'password', 'passwordHash'] }, bodyLimit: 65536 });
  await app.register(helmet);
  await app.register(rateLimit, { max: 100, timeWindow: '1 minute' });
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof AppError) return reply.code(error.statusCode).send({ code: error.code, message: error.message });
    const databaseCode = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
    const sqlNumber = error && typeof error === 'object' && 'number' in error ? Number(error.number) : 0;
    if ([2601, 2627, 547].includes(sqlNumber)) return reply.code(409).send({ code: 'DATA_CONFLICT', message: 'El registro está duplicado o tiene relaciones que impiden la operación.' });
    if ([207, 229].includes(sqlNumber)) return reply.code(503).send({ code: 'DATABASE_SETUP', message: 'Falta completar la configuración o los permisos de la base de datos.' });
    if (['ORA-00001', 'ORA-02291', 'ORA-02292', 'ORA-30006', 'ORA-00054'].includes(databaseCode)) {
      return reply.code(409).send({ code: 'DATA_CONFLICT', message: 'El registro está duplicado, relacionado con otros datos o bloqueado por otra operación.' });
    }
    if (['ORA-01031', 'ORA-02289'].includes(databaseCode)) {
      return reply.code(503).send({ code: 'DATABASE_PERMISSION', message: 'La operación requiere permisos de base de datos pendientes de configurar.' });
    }
    const status = typeof error === 'object' && error !== null && 'statusCode' in error ? Number(error.statusCode) : 500;
    if (status >= 400 && status < 500) return reply.code(status).send({ message: 'Solicitud inválida.' });
    request.log.error({ requestId: request.id }, 'Error interno');
    return reply.code(500).send({ message: 'Error interno del servidor.' });
  });
  app.get('/api/health/live', async (): Promise<HealthResponse> => ({ status: 'ok', service: 'cuentas-por-pagar-api' }));
  return app;
}
