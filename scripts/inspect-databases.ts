import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import oracledb from 'oracledb';
import { loadConfig } from '../packages/config/src/index.js';
import { createOraclePool } from '../packages/db-oracle/src/index.js';
import { createSqlServerPool } from '../packages/db-sqlserver/src/index.js';

const target = process.argv[2] ?? 'all';
const health = process.argv.includes('--health');
if (!['all', 'oracle', 'sqlserver'].includes(target)) throw new Error('Target invalido');
if (target !== 'sqlserver') {
  let pool: oracledb.Pool | undefined;
  try {
    const config = loadConfig();
    pool = await createOraclePool(config);
    const connection = await pool.getConnection();
    connection.callTimeout = 10000;
    try {
      const source = health
        ? "SELECT USER AS CURRENT_USER FROM DUAL; SELECT SYS_CONTEXT('USERENV','CON_NAME') AS CON_NAME FROM DUAL"
        : await readFile('database/oracle/validation/001_inspect.sql', 'utf8');
      const statements = source.replace(/^--.*$/gm, '').split(';').map(s => s.trim()).filter(Boolean);
      const data = [];
      for (const query of statements) {
        const result = await connection.execute(query, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });
        data.push({ query, rows: result.rows });
      }
      await mkdir('docs/evidence', { recursive: true });
      const path = `docs/evidence/oracle${health ? '-health' : ''}.json`;
      await writeFile(path, JSON.stringify({ capturedAt: new Date().toISOString(), results: data }, null, 2));
      console.log(`Oracle: conexion e inspeccion correctas; evidencia en ${path}`);
      const triggers = data.find(d => d.query.includes('TOTAL_USER_TRIGGERS'))?.rows as { TOTAL_USER_TRIGGERS: number }[] | undefined;
      if (triggers?.[0]?.TOTAL_USER_TRIGGERS !== undefined) {
        console.log(`Oracle: USER_TRIGGERS=${triggers[0].TOTAL_USER_TRIGGERS}; ALL_TRIGGERS del propietario solo certifica objetos visibles.`);
        if (triggers[0].TOTAL_USER_TRIGGERS !== 0) process.exitCode = 1;
      }
    } finally { await connection.close(); }
  } catch (error) {
    const raw = error && typeof error === 'object' && 'code' in error ? String(error.code) : 'CONFIG_OR_CONNECTION';
    const code = /^(ORA|NJS|DPI)-\d+$/.test(raw) ? raw : 'CONFIG_OR_CONNECTION';
    console.log(`Oracle: fallo ${code}; revise configuracion, listener, servicio y permisos. No se imprimen detalles sensibles.`);
    process.exitCode = 1;
  } finally { if (pool) await pool.close(0); }
}
if (target !== 'oracle') {
  const config = loadConfig();
  if (config.SQLSERVER_AUTH === 'sql') {
    let pool: Awaited<ReturnType<typeof createSqlServerPool>> | undefined;
    try {
      pool = await createSqlServerPool(config);
      const source = health
        ? "SELECT DB_NAME() AS database_name, CAST(SERVERPROPERTY('IsIntegratedSecurityOnly') AS int) AS windows_only"
        : await readFile('database/sqlserver/validation/001_inspect.sql', 'utf8');
      const result = await pool.request().query(source);
      const path = `docs/evidence/sqlserver${health ? '-health' : ''}.json`;
      await mkdir('docs/evidence', { recursive: true });
      await writeFile(path, JSON.stringify({ capturedAt: new Date().toISOString(), authentication: 'sql', recordsets: result.recordsets }, null, 2));
      console.log(`SQL Server: conexion SQL correcta; evidencia en ${path}`);
    } catch (error) {
      const raw = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
      const code = /^[A-Z0-9_]+$/.test(raw) ? raw : 'CONFIG_OR_CONNECTION';
      console.log(`SQL Server: fallo ${code}. ETIMEOUT: revisar host/puerto; ELOGIN: revisar login, acceso a la base y modo de autenticacion.`);
      process.exitCode = 1;
    } finally { if (pool) await pool.close(); }
  } else {
  const source = (await readFile('scripts/inspect-sqlserver.ps1', 'utf8')).replaceAll('$PSScriptRoot', '(Join-Path (Get-Location) \"scripts\")');
  const result = spawnSync('powershell.exe', ['-NoProfile', '-Command', `& {\n${source}\n} ${health ? '-HealthOnly' : ''}`], {
    stdio: 'inherit', timeout: 60000,
    env: { ...process.env, SQLSERVER_HOST: config.SQLSERVER_HOST, SQLSERVER_INSTANCE: config.SQLSERVER_INSTANCE,
      SQLSERVER_PORT: config.SQLSERVER_PORT?.toString() ?? '', SQLSERVER_DATABASE: config.SQLSERVER_DATABASE,
      SQLSERVER_ENCRYPT: String(config.SQLSERVER_ENCRYPT), SQLSERVER_TRUST_CERTIFICATE: String(config.SQLSERVER_TRUST_CERTIFICATE) }
  });
  if (result.status !== 0) process.exitCode = 1;
  }
}
