import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import oracledb from 'oracledb';
import { loadConfig } from '../packages/config/src/index.js';
import { createSqlServerPool } from '../packages/db-sqlserver/src/index.js';
import { sqlSecurityRepository } from '../packages/db-sqlserver/src/security.js';
import { createOraclePool } from '../packages/db-oracle/src/index.js';
import { recordUnitOfWork } from '../packages/db-oracle/src/unit-of-work.js';
import { getRecord, keyOf } from '../packages/db-oracle/src/records.js';
import { mutateRecord } from '../packages/application/src/records.js';
import { Sessions } from '../packages/auth/src/sessions.js';
import { createServer } from '../apps/api/src/server.js';
import { registerApplicationRoutes } from '../apps/api/src/routes.js';
import { resources } from '../packages/shared/src/resources.js';
import { securityResources } from '../packages/shared/src/security-resources.js';
import { profilePolicies, expectedProfilePermissions } from './profile-policy.js';
import { readProfileCredentials } from './profile-credentials.js';

async function main() {
  const config=loadConfig(),credentials=await readProfileCredentials(config);
  assert.equal(credentials.status,'committed');
  const security=await createSqlServerPool(config),oracle=await createOraclePool(config);
  const marker=`PF${randomBytes(4).toString('hex')}`;
  const fixtures: {slug:string;id:number}[]=[];
  const reports: {login:string;modules:number;permissions:number;routeChecks:number;liveLogin:boolean}[]=[];
  let providerId=0,totalRouteChecks=0,fixturesRemoved=false;
  try {
    const repository=sqlSecurityRepository(security);
    const admin=await repository.findUser('admin');assert.ok(admin?.active);
    const beforeAdmin=admin.passwordHash;
    assert.equal((await repository.getPrincipal(admin.id))?.permissions.size,69);
    for(const policy of profilePolicies) {
      const account=credentials.accounts.find(a=>a.login===policy.login)!;assert.ok(account);
      const expected=new Set(expectedProfilePermissions(policy));
      assert.ok([...expected].every(p=>!p.startsWith('admin/')&&!p.endsWith('.delete')));
      const app=await createServer({logging:false});
      const sessions=await Sessions.create(repository,config.SESSION_TTL_SECONDS);
      registerApplicationRoutes(app,oracle,sessions,config,security);
      let routeChecks=0;
      try {
        const login=await app.inject({method:'POST',url:'/api/auth/login',headers:{origin:config.WEB_ORIGIN},payload:{username:account.login,password:account.password}});
        assert.equal(login.statusCode,200,`${policy.login}:login`);
        const cookie=String(login.headers['set-cookie']).split(';')[0]!;
        assert.deepEqual([...login.json().permissions].sort(),[...expected].sort());
        const headers={origin:config.WEB_ORIGIN,cookie};
        const modules=await app.inject({method:'GET',url:'/api/modules',headers});assert.equal(modules.statusCode,200);
        assert.deepEqual(modules.json().map((r:{slug:string})=>r.slug).sort(),[...policy.read].sort());
        const dashboard=await app.inject({method:'GET',url:'/api/dashboard',headers});assert.equal(dashboard.statusCode,200);
        assert.deepEqual(dashboard.json().map((r:{slug:string})=>r.slug).sort(),[...policy.read].sort());
        for(const resource of [...resources,...securityResources]) {
          const slug=resource.slug;
          const read=await app.inject({method:'GET',url:`/api/${slug}?pageSize=1`,headers});
          assert.equal(read.statusCode,expected.has(`${slug}.read`)?200:403,`${policy.login}:read:${slug}`);routeChecks++;
          for(const [method,action] of [['POST','create'],['PATCH','update'],['DELETE','delete']] as const) {
            const response=await app.inject({method,url:`/api/${slug}${method==='POST'?'':'/9007199254740990'}`,headers,...(method==='DELETE'?{}:{payload:{}})});
            assert.equal(response.statusCode,expected.has(`${slug}.${action}`)?400:403,`${policy.login}:${action}:${slug}`);routeChecks++;
          }
        }
        // Escrituras reales temporales: el operador crea/edita proveedor y Tesoreria un pago.
        if(policy.login==='operador_cpp'||policy.login==='tesoreria_cpp') {
          const slug=policy.login==='operador_cpp'?'proveedores':'pagos-bancarios';
          const data=slug==='proveedores'?{NIT:marker,RAZONSOCIAL:`Prueba perfiles ${marker}`,SALDOACTUAL:0,ESTADO:'ACTIVO'}
            :{IDPROVEEDOR:providerId,MONTO:10,FECHA:'2026-11-07',TIPOPAGO:'TRANSFERENCIA',NUMERODOCUMENTO:marker,BANCO:'DEMO-PRUEBA',ESTADO:'PRUEBA'};
          assert.ok(slug==='proveedores'||providerId>0);
          const created=await app.inject({method:'POST',url:`/api/${slug}`,headers,payload:data});assert.equal(created.statusCode,201,`${slug}:create-real`);
          const resource=resources.find(r=>r.slug===slug)!,id=Number(created.json()[keyOf(resource)]);assert.ok(id>0);
          fixtures.push({slug,id});await mkdir('.local',{recursive:true});await writeFile('.local/profile-test-fixtures.json',JSON.stringify({marker,fixtures},null,2));
          if(slug==='proveedores')providerId=id;
          const patch=slug==='proveedores'?{RAZONSOCIAL:`Prueba editada ${marker}`}:{MONTO:12};
          assert.equal((await app.inject({method:'PATCH',url:`/api/${slug}/${id}`,headers,payload:patch})).statusCode,200);
          assert.equal((await app.inject({method:'DELETE',url:`/api/${slug}/${id}`,headers})).statusCode,403);
          const connection=await oracle.getConnection();
          try {
            const result=await connection.execute<{TOTAL:number}>(`SELECT COUNT(*) AS TOTAL FROM ADMIN_CU_PROVEEDORES.LOG_AUDITORIA_ODC
              WHERE NOMBRE_TABLA=:tableName AND ID_REGISTRO=:id AND DATOS_NUEVOS LIKE :actor`,
              {tableName:resource.table,id:String(id),actor:`%"applicationUserId":"${account.userId}"%`},{outFormat:oracledb.OUT_FORMAT_OBJECT});
            assert.equal(result.rows?.[0]?.TOTAL,2,'Actor real de aplicacion en INSERT y UPDATE');
          }finally{await connection.close();}
        }
        assert.equal((await app.inject({method:'POST',url:'/api/auth/logout',headers})).statusCode,204);
        assert.equal((await app.inject({method:'GET',url:'/api/auth/me',headers})).statusCode,401);
        // Login por red en el servidor que usa el navegador. No imprime cookies ni passwords.
        const live=await fetch(`${config.WEB_ORIGIN}/api/auth/login`,{method:'POST',headers:{Origin:config.WEB_ORIGIN,'Content-Type':'application/json'},body:JSON.stringify({username:account.login,password:account.password}),signal:AbortSignal.timeout(10000)});
        assert.equal(live.status,200,`${policy.login}:live-login`);
        const liveCookie=live.headers.get('set-cookie')?.split(';')[0];assert.ok(liveCookie);
        try {
          const response=await fetch(`${config.WEB_ORIGIN}/api/modules`,{headers:{Cookie:liveCookie},signal:AbortSignal.timeout(10000)});assert.equal(response.status,200);
          const value=await response.json() as {slug:string}[];assert.deepEqual(value.map(r=>r.slug).sort(),[...policy.read].sort());
        }finally{await fetch(`${config.WEB_ORIGIN}/api/auth/logout`,{method:'POST',headers:{Origin:config.WEB_ORIGIN,Cookie:liveCookie},signal:AbortSignal.timeout(10000)});}
        reports.push({login:policy.login,modules:policy.read.length,permissions:expected.size,routeChecks,liveLogin:true});totalRouteChecks+=routeChecks;
        console.log(`${policy.login}: ${policy.read.length} modulos; ${routeChecks} comprobaciones de rutas; login por red correcto.`);
      }finally{await app.close();}
    }
    assert.equal((await repository.findUser('admin'))?.passwordHash,beforeAdmin,'Password admin conservado');
    assert.equal((await repository.getPrincipal(admin.id))?.permissions.size,69,'Permisos admin conservados');
  }finally{
    try {
      for(const fixture of [...fixtures].reverse()) {
        const resource=resources.find(r=>r.slug===fixture.slug)!;
        const c=await oracle.getConnection();try{const row=await getRecord(c,resource,fixture.id);assert.equal(row[fixture.slug==='proveedores'?'NIT':'NUMERODOCUMENTO'],marker);}finally{await c.close();}
        await mutateRecord(recordUnitOfWork(oracle,{ip:null,host:'profile-test-cleanup'}),resource,
          {userId:'profile-test-cleanup',permissions:new Set([`${fixture.slug}.delete`])},'DELETE',fixture.id,undefined);
      }
      fixturesRemoved=true;await mkdir('docs/evidence',{recursive:true});
      await writeFile('docs/evidence/profile-accounts.json',JSON.stringify({verifiedAt:new Date().toISOString(),status:reports.length===4?'passed':'failed',reports,totalRouteChecks,fixturesRemoved,retainedAuditEvents:fixtures.length*3},null,2));
      await writeFile('.local/profile-test-fixtures.json',JSON.stringify({marker,fixtures:[],removed:true},null,2));
    }finally{await oracle.close(0);await security.close();}
  }
  assert.equal(reports.length,4);assert.ok(fixturesRemoved);
  console.log(`${totalRouteChecks} comprobaciones de autorizacion aprobadas; fixtures retirados y auditoria conservada.`);
}
main().catch(()=>{console.error('Validacion de perfiles incompleta; consultar evidencia local y fixtures antes de repetir. No se muestran secretos.');process.exitCode=1;});
