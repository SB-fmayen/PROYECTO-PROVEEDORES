import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import type oracledb from 'oracledb';
import type sql from 'mssql';
import type { Config } from '../../../packages/config/src/index.js';
import { Sessions } from '../../../packages/auth/src/sessions.js';
import { AppError, requirePermission } from '../../../packages/domain/src/index.js';
import { resources } from '../../../packages/shared/src/resources.js';
import { listRecords, getRecord, resourceBySlug } from '../../../packages/db-oracle/src/records.js';
import { recordUnitOfWork } from '../../../packages/db-oracle/src/unit-of-work.js';
import { mutateRecord } from '../../../packages/application/src/records.js';
import { getDashboard } from '../../../packages/db-oracle/src/dashboard.js';
import { getFormOptions } from '../../../packages/db-oracle/src/form-options.js';
import { securityResources } from '../../../packages/shared/src/security-resources.js';
import { securityResource, listSecurityRecords, getSecurityRecord, mutateSecurityRecord } from '../../../packages/db-sqlserver/src/records.js';

export function sessionToken(request: FastifyRequest): string | undefined {
  const value = request.headers.cookie?.split(';').map(item => item.trim()).find(item => item.startsWith('cpp_session='))?.slice('cpp_session='.length);
  return value && /^[A-Za-z0-9_-]{43}$/.test(value) ? value : undefined;
}
export function registerApplicationRoutes(app: FastifyInstance, pool: oracledb.Pool, sessions: Sessions, config: Config, securityPool?: sql.ConnectionPool) {
  const cookie = (token: string, maxAge: number) => `cpp_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${config.SESSION_SECURE ? '; Secure' : ''}`;
  const principal = (request: FastifyRequest) => sessions.authenticate(sessionToken(request));
  app.addHook('onRequest', async (request, reply) => {
    if (request.url.startsWith('/api/')) reply.header('Cache-Control', 'no-store');
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method) && request.headers.origin !== config.WEB_ORIGIN) {
      throw new AppError(403, 'INVALID_ORIGIN', 'Origen no permitido.');
    }
  });
  app.post('/api/auth/login', { config: { rateLimit: { max: 5, timeWindow: '1 minute' } } }, async (request, reply) => {
    const body = z.strictObject({ username: z.string().trim().min(1).max(50), password: z.string().min(1).max(256) }).safeParse(request.body);
    if (!body.success) throw new AppError(400, 'INVALID_INPUT', 'Revise usuario y contraseña.');
    const result = await sessions.login(body.data.username, body.data.password, sessionToken(request));
    reply.header('Set-Cookie', cookie(result.token, config.SESSION_TTL_SECONDS));
    return { userId: result.principal.userId, permissions: [...result.principal.permissions], expiresAt: result.expiresAt };
  });
  app.post('/api/auth/logout', async (request, reply) => {
    const token = sessionToken(request);
    if (token) sessions.logout(token);
    reply.header('Set-Cookie', cookie('', 0));
    return reply.code(204).send();
  });
  app.get('/api/auth/me', async request => {
    const user = await principal(request);
    return { userId: user.userId, permissions: [...user.permissions] };
  });
  app.get('/api/modules', async request => {
    const user = await principal(request);
    return [...resources, ...(securityPool ? securityResources : [])].filter(item => user.permissions.has(`${item.slug}.read`));
  });
  app.get('/api/dashboard', async request => getDashboard(pool, (await principal(request)).permissions));
  app.get('/api/form-options', async request => {
    const parsed = z.strictObject({ module: z.string().min(1).max(80) }).safeParse(request.query);
    if (!parsed.success) throw new AppError(400, 'INVALID_QUERY', 'Módulo inválido.');
    const resource = resourceBySlug(parsed.data.module);
    requirePermission(await principal(request), `${resource.slug}.read`);
    return getFormOptions(pool, resource);
  });
  if (securityPool) {
    app.get('/api/admin/:module', async request => {
      const resource = securityResource((request.params as { module: string }).module);
      requirePermission(await principal(request), `${resource.slug}.read`);
      const parsed = z.strictObject({ page: z.coerce.number().int().min(1).max(1000000).default(1), pageSize: z.coerce.number().int().min(1).max(100).default(20), search: z.string().trim().max(100).default('') }).safeParse(request.query);
      if (!parsed.success) throw new AppError(400, 'INVALID_QUERY', 'Paginación o búsqueda inválida.');
      return listSecurityRecords(securityPool, resource, parsed.data.page, parsed.data.pageSize, parsed.data.search);
    });
    app.get('/api/admin/:module/:id', async request => {
      const params = request.params as { module: string; id: string };
      const resource = securityResource(params.module);
      requirePermission(await principal(request), `${resource.slug}.read`);
      return getSecurityRecord(securityPool, resource, params.id);
    });
    for (const [method, operation] of [['POST', 'INSERT'], ['PATCH', 'UPDATE'], ['DELETE', 'DELETE']] as const) {
      app.route({ method, url: operation === 'INSERT' ? '/api/admin/:module' : '/api/admin/:module/:id', handler: async (request, reply) => {
        const params = request.params as { module: string; id?: string };
        const resource = securityResource(params.module);
        const user = await principal(request);
        requirePermission(user, `${resource.slug}.${operation === 'INSERT' ? 'create' : operation === 'UPDATE' ? 'update' : 'delete'}`);
        const result = await mutateSecurityRecord(securityPool, resource, operation, params.id, request.body, user.userId);
        if (resource.table === 'USUARIO' && (operation === 'DELETE' || result.passwordChanged || (request.body as { ESTADO?: boolean } | undefined)?.ESTADO === false)) sessions.revokeUser(result.id);
        return operation === 'DELETE' ? reply.code(204).send() : reply.code(operation === 'INSERT' ? 201 : 200).send(await getSecurityRecord(securityPool, resource, result.id));
      } });
    }
  }
  app.get('/api/:module', async request => {
    const resource = resourceBySlug((request.params as { module: string }).module);
    const user = await principal(request);
    requirePermission(user, `${resource.slug}.read`);
    const query = z.strictObject({ page: z.coerce.number().int().min(1).max(1000000).default(1), pageSize: z.coerce.number().int().min(1).max(100).default(20), search: z.string().trim().max(100).default('') }).safeParse(request.query);
    if (!query.success) throw new AppError(400, 'INVALID_QUERY', 'Paginación o búsqueda inválida.');
    const connection = await pool.getConnection();
    connection.callTimeout = 10000;
    try { return await listRecords(connection, resource, query.data.page, query.data.pageSize, query.data.search); }
    finally { await connection.close(); }
  });
  app.get('/api/:module/:id', async request => {
    const parsed = z.object({ module: z.string(), id: z.coerce.number().int().positive().max(Number.MAX_SAFE_INTEGER) }).safeParse(request.params);
    if (!parsed.success) throw new AppError(400, 'INVALID_ID', 'Identificador inválido.');
    const params = parsed.data;
    const resource = resourceBySlug(params.module);
    requirePermission(await principal(request), `${resource.slug}.read`);
    const connection = await pool.getConnection();
    connection.callTimeout = 10000;
    try { return await getRecord(connection, resource, params.id); }
    finally { await connection.close(); }
  });
  for (const [method, operation] of [['POST', 'INSERT'], ['PATCH', 'UPDATE'], ['DELETE', 'DELETE']] as const) {
    app.route({ method, url: operation === 'INSERT' ? '/api/:module' : '/api/:module/:id', handler: async (request, reply) => {
      const params = z.object({ module: z.string(), id: z.coerce.number().int().positive().max(Number.MAX_SAFE_INTEGER).optional() }).safeParse(request.params);
      if (!params.success) throw new AppError(400, 'INVALID_ID', 'Identificador inválido.');
      const resource = resourceBySlug(params.data.module);
      const result = await mutateRecord(recordUnitOfWork(pool, { ip: request.ip, host: null }), resource, await principal(request), operation, params.data.id, request.body);
      return operation === 'DELETE' ? reply.code(204).send() : reply.code(operation === 'INSERT' ? 201 : 200).send(result);
    } });
  }
}
