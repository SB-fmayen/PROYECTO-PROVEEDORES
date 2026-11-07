import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { resources } from '../packages/shared/src/resources.js';
import { securityResources } from '../packages/shared/src/security-resources.js';
import { buildRecordPayload } from '../apps/web/src/form-payload.js';
import { SmartField, booleanLabel, referenceLabel } from '../apps/web/src/SmartField.js';
import { moduleGuides } from '../apps/web/src/guidance-content.js';
import { fullTourPlan, moduleTourPlan, hasSeenOnboarding, rememberOnboarding } from '../apps/web/src/tours.js';

const user = securityResources.find(resource => resource.slug === 'admin/usuarios')!;
const permissions = securityResources.find(resource => resource.slug === 'admin/perfil-menus')!;
test('Activo/Inactivo conserva false real y los permisos apagados no se convierten en true', () => {
  const state = user.fields.find(field => field.name === 'ESTADO')!;
  const form = new FormData(); form.set('ESTADO', 'false');
  assert.deepEqual(buildRecordPayload([state], form, null), { ESTADO: false });
  assert.deepEqual(buildRecordPayload([state], form, { ESTADO: true }), { ESTADO: false });
  assert.deepEqual(buildRecordPayload([state], form, { ESTADO: false }), {});
  const controls = permissions.fields.filter(field => field.type === 'boolean');
  form.set('PUEDE_VER', 'on');
  assert.deepEqual(buildRecordPayload(controls, form, null), { PUEDE_VER: true, PUEDE_CREAR: false, PUEDE_EDITAR: false, PUEDE_ELIMINAR: false });
});
test('listas envían IDs numéricos y valores originales, sin modificar fechas sin cambios', () => {
  const document = resources.find(resource => resource.slug === 'documentos-compra')!;
  const fields = document.fields.filter(field => ['IDPROVEEDOR', 'ESTADO', 'FECHAEMISION'].includes(field.name));
  const form = new FormData(); form.set('IDPROVEEDOR', '21'); form.set('ESTADO', 'ESTADO LEGADO'); form.set('FECHAEMISION', '2026-11-04');
  assert.deepEqual(buildRecordPayload(fields, form, { IDPROVEEDOR: 1, ESTADO: 'PENDIENTE', FECHAEMISION: '2026-11-04T14:23:00' }), { IDPROVEEDOR: 21, ESTADO: 'ESTADO LEGADO' });
});
test('controles renderizan estado legible, interruptores accesibles y rutas de módulos', () => {
  const state = user.fields.find(field => field.name === 'ESTADO')!;
  const html = renderToStaticMarkup(<SmartField resource={user} field={state} caption="Estado" value={false} />);
  assert.match(html, /<select name="ESTADO"/); assert.match(html, /value="false" selected="">Inactivo/);
  const permit = permissions.fields.find(field => field.name === 'PUEDE_VER')!;
  const control = renderToStaticMarkup(<SmartField resource={permissions} field={permit} caption="Ver" value={false} />);
  assert.match(control, /role="switch"/); assert.match(control, /No permitido/);
  assert.equal(booleanLabel('ESTADO', true), 'Activo');
  const menus = securityResources.find(resource => resource.slug === 'admin/menus')!;
  const route = renderToStaticMarkup(<SmartField resource={menus} field={menus.fields.find(field => field.name === 'RUTA')!} caption="Módulo asociado" value="/proveedores" />);
  assert.match(route, /<select name="RUTA"/); assert.match(route, /Proveedores/);
});
test('lista conserva valores legados y referencias presentan nombre y código', () => {
  const supplier = resources.find(resource => resource.slug === 'proveedores')!;
  const state = supplier.fields.find(field => field.name === 'ESTADO')!;
  const html = renderToStaticMarkup(<SmartField resource={supplier} field={state} caption="Estado" value="ESTADO LEGADO" />);
  assert.match(html, /ESTADO LEGADO/); assert.match(html, /Otro valor/);
  assert.equal(referenceLabel(supplier, { IDPROVEEDOR: 7, RAZONSOCIAL: 'Empresa verificada' }), 'Empresa verificada · #7');
});
test('cada módulo y resumen tienen explicación específica basada en su función', () => {
  for (const resource of [...resources, ...securityResources]) {
    const guide = moduleGuides[resource.slug]; assert.ok(guide, resource.slug);
    assert.ok(guide.summary.length > 45); assert.ok(guide.fields.length > 40); assert.ok(guide.workflow.length > 40);
  }
  assert.ok(moduleGuides.dashboard);
});
test('recorrido completo incluye solo módulos permitidos y ayuda de consulta no ofrece crear', () => {
  const supplier = resources.find(resource => resource.slug === 'proveedores')!;
  const audit = resources.find(resource => resource.slug === 'auditoria')!;
  const plan = fullTourPlan([supplier], ['proveedores.read']);
  assert.ok(plan.some(step => step.page === 'proveedores'));
  assert.ok(plan.every(step => ['dashboard', 'proveedores'].includes(step.page)));
  assert.ok(plan.every(step => !step.selector?.includes('"create"')));
  const module = moduleTourPlan(audit, ['auditoria.read', 'auditoria.create']);
  assert.ok(module.every(step => !step.selector?.includes('"create"')));
  const complete = fullTourPlan([...resources, ...securityResources], []);
  for (const resource of [...resources, ...securityResources]) assert.ok(complete.some(step => step.page === resource.slug));
});
test('omitir o terminar bienvenida se recuerda por usuario, incluso sin localStorage', () => {
  assert.equal(hasSeenOnboarding('ux-test-new-user'), false);
  rememberOnboarding('ux-test-new-user', 'skipped');
  assert.equal(hasSeenOnboarding('ux-test-new-user'), true);
  assert.equal(hasSeenOnboarding('ux-test-another-user'), false);
  rememberOnboarding('ux-test-another-user', 'completed');
  assert.equal(hasSeenOnboarding('ux-test-another-user'), true);
});
