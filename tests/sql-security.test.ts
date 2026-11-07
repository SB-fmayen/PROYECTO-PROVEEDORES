import { test } from 'node:test';
import assert from 'node:assert/strict';
import { permissionsFromRows } from '../packages/db-sqlserver/src/security.js';

test('permisos SQL separan ver, crear, editar y eliminar y descartan rutas desconocidas', () => {
  const permissions = permissionsFromRows([
    { RUTA: '/proveedores', PUEDE_VER: true, PUEDE_CREAR: false, PUEDE_EDITAR: true, PUEDE_ELIMINAR: false },
    { RUTA: '/desconocido', PUEDE_VER: true, PUEDE_CREAR: true, PUEDE_EDITAR: true, PUEDE_ELIMINAR: true },
    { RUTA: null, PUEDE_VER: true, PUEDE_CREAR: true, PUEDE_EDITAR: true, PUEDE_ELIMINAR: true }
  ]);
  assert.deepEqual([...permissions], ['proveedores.read', 'proveedores.update']);
});
test('auditoría nunca concede escritura aunque una fila de permisos lo indique', () => {
  const permissions = permissionsFromRows([{ RUTA: '/auditoria', PUEDE_VER: true, PUEDE_CREAR: true, PUEDE_EDITAR: true, PUEDE_ELIMINAR: true }]);
  assert.deepEqual([...permissions], ['auditoria.read']);
});
test('rutas de administración conceden únicamente sus acciones explícitas', () => {
  const permissions = permissionsFromRows([{ RUTA: '/admin/usuarios', PUEDE_VER: true, PUEDE_CREAR: true, PUEDE_EDITAR: false, PUEDE_ELIMINAR: false }]);
  assert.deepEqual([...permissions], ['admin/usuarios.read', 'admin/usuarios.create']);
});
