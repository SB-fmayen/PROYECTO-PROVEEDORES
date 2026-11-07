import { securitySql } from './schema.js';
import sql from 'mssql';
import type { SecurityRepository } from '../../auth/src/sessions.js';
import { AppError } from '../../domain/src/index.js';
import { resources } from '../../shared/src/resources.js';
import { securityResources } from '../../shared/src/security-resources.js';

export async function assertSecuritySchema(pool: sql.ConnectionPool): Promise<void> {
  const result = await pool.request().query(securitySql(pool, `SELECT COUNT(*) AS compatible FROM sys.columns
    WHERE object_id=OBJECT_ID('dbo.USUARIO') AND name='PASSWORD_HASH'
    AND TYPE_NAME(user_type_id)='varchar' AND max_length>=255 AND is_nullable=1`));
  if (result.recordset[0]?.compatible !== 1) throw new AppError(503, 'AUTH_SETUP_REQUIRED', 'Falta aplicar la migración de contraseñas de la aplicación.');
}
export function permissionsFromRows(rows: { RUTA: string | null; PUEDE_VER: boolean; PUEDE_CREAR: boolean; PUEDE_EDITAR: boolean; PUEDE_ELIMINAR: boolean }[]): Set<string> {
  const permissions = new Set<string>();
  const modules = [...resources, ...securityResources];
  for (const row of rows) {
    const route = row.RUTA?.replace(/^\/api(?=\/)/, '').replace(/^\/+|\/+$/g, '');
    const resource = modules.find(item => item.slug === route);
    if (!resource) continue; // Ruta desconocida nunca concede privilegios.
    if (row.PUEDE_VER) permissions.add(`${resource.slug}.read`);
    if (!resource.readOnly) {
      if (row.PUEDE_CREAR) permissions.add(`${resource.slug}.create`);
      if (row.PUEDE_EDITAR) permissions.add(`${resource.slug}.update`);
      if (row.PUEDE_ELIMINAR) permissions.add(`${resource.slug}.delete`);
    }
  }
  return permissions;
}
export function sqlSecurityRepository(pool: sql.ConnectionPool): SecurityRepository {
  return {
    async findUser(username) {
      await assertSecuritySchema(pool);
      const result = await pool.request().input('username', sql.VarChar(50), username).query(securitySql(pool, `SELECT ID_USUARIO,USUARIO_LOGIN,PASSWORD_HASH,ESTADO
        FROM dbo.USUARIO WHERE USUARIO_LOGIN=@username`));
      const row = result.recordset[0];
      return row ? { id: String(row.ID_USUARIO), username: row.USUARIO_LOGIN, passwordHash: row.PASSWORD_HASH, active: row.ESTADO === true } : null;
    },
    async getPrincipal(userId) {
      if (!/^\d+$/.test(userId) || Number(userId) > 2147483647) return null;
      const user = await pool.request().input('id', sql.Int, Number(userId)).query(securitySql(pool, 'SELECT ID_USUARIO FROM dbo.USUARIO WHERE ID_USUARIO=@id AND ESTADO=1'));
      if (!user.recordset.length) return null;
      const result = await pool.request().input('id', sql.Int, Number(userId)).query(securitySql(pool, `SELECT m.RUTA,pm.PUEDE_VER,pm.PUEDE_CREAR,pm.PUEDE_EDITAR,pm.PUEDE_ELIMINAR
        FROM dbo.USUARIO u
        JOIN dbo.USUARIO_ROL ur ON ur.ID_USUARIO=u.ID_USUARIO AND ur.ESTADO=1
        JOIN dbo.ROL r ON r.ID_ROL=ur.ID_ROL AND r.ESTADO=1
        JOIN dbo.ROL_PERFIL rp ON rp.ID_ROL=r.ID_ROL AND rp.ESTADO=1
        JOIN dbo.PERFIL p ON p.ID_PERFIL=rp.ID_PERFIL AND p.ESTADO=1
        JOIN dbo.PERFIL_MENU pm ON pm.ID_PERFIL=p.ID_PERFIL
        JOIN dbo.MENU m ON m.ID_MENU=pm.ID_MENU AND m.ESTADO=1
        WHERE u.ID_USUARIO=@id AND u.ESTADO=1`));
      return { userId, permissions: permissionsFromRows(result.recordset) };
    }
  };
}
