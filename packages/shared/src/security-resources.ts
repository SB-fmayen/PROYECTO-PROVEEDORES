import type { ResourceDefinition, ResourceField } from './resources.js';

// Dbo y columnas contrastados con docs/evidence/sqlserver.json.
const field = (name: string, options: Partial<ResourceField> = {}): ResourceField => ({
  name, type: 'text', maxBytes: null, precision: null, scale: null,
  nullable: false, identity: false, primaryKey: false, reference: null, ...options
});
const id = (name: string, reference: string | null = null, identity = false) => field(name, { type: 'number', scale: 0, primaryKey: true, reference, identity });
const text = (name: string, maxBytes: number, nullable = false) => field(name, { maxBytes, nullable });
const state = () => field('ESTADO', { type: 'boolean' });
export const securityResources: ResourceDefinition[] = [
  { table: 'USUARIO', slug: 'admin/usuarios', label: 'Usuarios', readOnly: false, fields: [id('ID_USUARIO', null, true), text('NOMBRE', 100), text('USUARIO_LOGIN', 50), text('CORREO', 120, true), state(), field('FECHA_CREACION', { type: 'date', generated: true })] },
  { table: 'ROL', slug: 'admin/roles', label: 'Roles', readOnly: false, fields: [id('ID_ROL', null, true), text('NOMBRE_ROL', 80), text('DESCRIPCION', 250, true), state()] },
  { table: 'PERFIL', slug: 'admin/perfiles', label: 'Perfiles', readOnly: false, fields: [id('ID_PERFIL', null, true), text('NOMBRE_PERFIL', 80), text('DESCRIPCION', 250, true), state()] },
  { table: 'MENU', slug: 'admin/menus', label: 'Menús', readOnly: false, fields: [id('ID_MENU', null, true), text('NOMBRE_MENU', 100), text('RUTA', 200, true), field('ORDEN', { type: 'number', scale: 0, nullable: true }), state()] },
  { table: 'USUARIO_ROL', slug: 'admin/usuario-roles', label: 'Roles de usuarios', readOnly: false, fields: [id('ID_USUARIO', 'admin/usuarios'), id('ID_ROL', 'admin/roles'), field('FECHA_ASIGNACION', { type: 'date', generated: true }), state()] },
  { table: 'ROL_PERFIL', slug: 'admin/rol-perfiles', label: 'Perfiles de roles', readOnly: false, fields: [id('ID_ROL', 'admin/roles'), id('ID_PERFIL', 'admin/perfiles'), state()] },
  { table: 'PERFIL_MENU', slug: 'admin/perfil-menus', label: 'Permisos de perfiles', readOnly: false, fields: [id('ID_PERFIL', 'admin/perfiles'), id('ID_MENU', 'admin/menus'), ...['PUEDE_VER', 'PUEDE_CREAR', 'PUEDE_EDITAR', 'PUEDE_ELIMINAR'].map(name => field(name, { type: 'boolean' }))] }
];
export const permissionActions = ['read', 'create', 'update', 'delete'] as const;
