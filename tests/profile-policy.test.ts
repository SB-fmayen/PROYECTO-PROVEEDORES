import { test } from 'node:test';
import assert from 'node:assert/strict';
import { profilePolicies, expectedProfilePermissions } from '../scripts/profile-policy.js';
import { resources } from '../packages/shared/src/resources.js';

test('cuentas de demostracion no conceden administracion, eliminacion ni escritura de auditoria', () => {
  assert.equal(new Set(profilePolicies.map(p=>p.login)).size,4);
  for(const policy of profilePolicies) {
    const permissions=expectedProfilePermissions(policy);
    assert.equal(new Set(permissions).size,permissions.length);
    assert.ok(permissions.every(p=>!p.startsWith('admin/')&&!p.endsWith('.delete')));
    assert.ok(!permissions.includes('auditoria.create')&&!permissions.includes('auditoria.update'));
    if(policy.login==='consulta_cpp'||policy.login==='auditor_cpp')assert.ok(permissions.every(p=>p.endsWith('.read')));
  }
});
test('formularios permitidos conservan lectura de los modulos referenciados por FK', () => {
  for(const policy of profilePolicies)for(const slug of policy.write) {
    const resource=resources.find(r=>r.slug===slug);assert.ok(resource&&!resource.readOnly);
    assert.ok(policy.read.includes(slug));
    for(const field of resource.fields.filter(f=>f.reference))assert.ok(policy.read.includes(field.reference!),`${policy.login}:${slug}:${field.reference}`);
  }
});
