import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import sql from 'mssql';
import { loadConfig } from '../packages/config/src/index.js';
import { createSqlServerPool } from '../packages/db-sqlserver/src/index.js';
import { securitySql } from '../packages/db-sqlserver/src/schema.js';
import { sqlSecurityRepository } from '../packages/db-sqlserver/src/security.js';
import { hashPassword, verifyPassword } from '../packages/auth/src/index.js';
import { resources } from '../packages/shared/src/resources.js';
import { securityResources } from '../packages/shared/src/security-resources.js';
import { profilePolicies, expectedProfilePermissions } from './profile-policy.js';
import { readProfileCredentials, saveProfileCredentials, type ProfileCredentials } from './profile-credentials.js';

async function main() {
  if (!process.argv.includes('--apply')) { console.log('Plan: cuatro cuentas de prueba con roles/perfiles separados; sin administracion ni eliminacion. Confirmar con auth:profiles -- --apply.'); return; }
  const config = loadConfig(), pool = await createSqlServerPool(config);
  try {
    const repository = sqlSecurityRepository(pool);
    let saved: ProfileCredentials | undefined;
    try { saved = await readProfileCredentials(config); } catch (e) { if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e; }
    if (saved) {
      for (const account of saved.accounts) {
        const user = await repository.findUser(account.login); const policy = profilePolicies.find(p=>p.login===account.login)!;
        assert.ok(user?.active && user.passwordHash && await verifyPassword(user.passwordHash,account.password));
        assert.deepEqual([...(await repository.getPrincipal(user.id))!.permissions].sort(),expectedProfilePermissions(policy));
      }
      assert.equal(saved.accounts.length,4); console.log('Las cuatro cuentas ya existen y coinciden; no se duplican ni cambian contraseñas.'); return;
    }
    const state: ProfileCredentials = { status: 'prepared', accounts: [] };
    const accountSource = await readFile('database/sqlserver/seed/060_profile_accounts.sql','utf8');
    const permissionSource = await readFile('database/sqlserver/seed/061_profile_permissions.sql','utf8');
    const transaction = new sql.Transaction(pool); await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
    try {
      const adminSql = securitySql(pool,"SELECT ID_USUARIO,USUARIO_LOGIN,ESTADO,PASSWORD_HASH FROM dbo.USUARIO WITH(UPDLOCK,HOLDLOCK) WHERE USUARIO_LOGIN='admin'");
      const before = (await new sql.Request(transaction).query(adminSql)).recordset;
      assert.equal(before.length,1); assert.equal(before[0].ESTADO,true);
      const menus = (await new sql.Request(transaction).query(securitySql(pool,'SELECT ID_MENU,RUTA,ESTADO FROM dbo.MENU WITH(HOLDLOCK) ORDER BY ID_MENU'))).recordset as {ID_MENU:number;RUTA:string;ESTADO:boolean}[];
      for (const resource of [...resources,...securityResources]) assert.equal(menus.filter(m=>m.RUTA===`/${resource.slug}`&&m.ESTADO).length,1,'Catalogo de menus incompleto o ambiguo');
      for (const policy of profilePolicies) {
        const password = `Cpp!${randomBytes(12).toString('base64url')}`, hash = await hashPassword(password);
        const account = await new sql.Request(transaction).input('login',sql.VarChar(50),policy.login).input('name',sql.VarChar(100),policy.name)
          .input('role',sql.VarChar(80),policy.role).input('profile',sql.VarChar(80),policy.profile).input('hash',sql.VarChar(255),hash)
          .query(securitySql(pool,accountSource));
        const ids = account.recordset[0] as {user_id:number;role_id:number;profile_id:number};
        state.accounts.push({login:policy.login,password,role:policy.role,userId:ids.user_id,roleId:ids.role_id,profileId:ids.profile_id});
        for (const menu of menus) {
          const slug = menu.RUTA.replace(/^\//,'');
          const read = policy.read.includes(slug), write = policy.write.includes(slug);
          assert.ok(!write||read); assert.ok(!write||(!slug.startsWith('admin/')&&slug!=='auditoria'));
          await new sql.Request(transaction).input('profileId',sql.Int,ids.profile_id).input('menuId',sql.Int,menu.ID_MENU)
            .input('read',sql.Bit,read).input('create',sql.Bit,write).input('update',sql.Bit,write)
            .query(securitySql(pool,permissionSource));
        }
      }
      assert.deepEqual((await new sql.Request(transaction).query(adminSql)).recordset,before,'Administrador modificado');
      await saveProfileCredentials(config,state,true); // Recuperable antes de COMMIT; nunca texto plano.
      await transaction.commit();
    } catch (e) { await transaction.rollback(); throw e; }
    state.status='committed';await saveProfileCredentials(config,state,false);
    for (const account of state.accounts) {
      const policy=profilePolicies.find(p=>p.login===account.login)!;
      assert.deepEqual([...(await repository.getPrincipal(String(account.userId)))!.permissions].sort(),expectedProfilePermissions(policy));
    }
    console.log('Cuatro cuentas creadas y permisos verificados. Admin conservado. Solo hashes en SQL y credenciales cifradas en .local; no se imprimen contraseñas.');
  } finally { await pool.close(); }
}
main().catch(()=>{console.error('No se completo la carga de perfiles. Revisar estado y archivo cifrado local antes de repetir; no se muestran secretos.');process.exitCode=1;});
