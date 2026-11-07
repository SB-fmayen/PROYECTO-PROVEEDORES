import { useEffect, useState } from 'react';
import { resources, type ResourceDefinition, type ResourceField } from '../../../packages/shared/src/resources.js';
import { securityResources } from '../../../packages/shared/src/security-resources.js';
import { categoricalFields, suggestedOptions } from '../../../packages/shared/src/form-options.js';
import { api, ApiError, type Row, type Page } from './client.js';

const allResources = [...resources, ...securityResources];
export function booleanLabel(field: string, value: boolean): string { return field === 'ESTADO' ? value ? 'Activo' : 'Inactivo' : value ? 'Permitido' : 'No permitido'; }
export function referenceLabel(resource: ResourceDefinition, row: Row): string {
  const preferred = ['RAZONSOCIAL', 'NOMBRE', 'NOMBRE_ROL', 'NOMBRE_PERFIL', 'NOMBRE_MENU', 'NUMERODOCUMENTO', 'DESCRIPCION'];
  const text = preferred.map(name => row[name]).find(value => typeof value === 'string' && value.trim());
  const keys = resource.fields.filter(field => field.primaryKey).map(field => row[field.name]).join(':');
  const extra = resource.table === 'USUARIO' && resource.slug.startsWith('admin/') && row.USUARIO_LOGIN ? ` · ${row.USUARIO_LOGIN}` : '';
  const date = row.FECHAEMISION ?? row.FECHA;
  const amount = row.MONTO ?? row.TOTAL;
  const detail = resource.table === 'PAGO_BANCARIO' ? `${row.BANCO ? ` · ${row.BANCO}` : ''}${typeof amount === 'number' ? ` · ${amount.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : ''}` : '';
  return `${text || resource.label}${extra}${detail}${date ? ` · ${String(date).slice(0, 10)}` : ''} · #${keys}`;
}

export function SmartField({ resource, field, value, caption, options = [] }: { resource: ResourceDefinition; field: ResourceField; value: Row[string]; caption: string; options?: string[] }) {
  if (field.reference) return <ReferenceField field={field} value={value} caption={caption} />;
  if (field.type === 'boolean') return <BooleanField field={field} value={value} caption={caption} />;
  if (resource.slug === 'admin/menus' && field.name === 'RUTA') {
    const current = value === null ? '' : String(value);
    return <label>{caption}<select name={field.name} defaultValue={current}><option value="">Sin módulo asociado</option>{current && !allResources.some(item => `/${item.slug}` === current) && <option value={current}>{current} (valor existente)</option>}{allResources.map(item => <option key={item.slug} value={`/${item.slug}`}>{item.label}{item.slug.startsWith('admin/') ? ' · Administración' : ''}</option>)}</select><small>Elige la pantalla a la que dará acceso este menú. Los permisos se configuran por separado.</small></label>;
  }
  if (field.type === 'text' && categoricalFields.has(field.name)) {
    const choices = [...new Set([...(suggestedOptions[resource.slug]?.[field.name] ?? []), ...options, ...(value === null ? [] : [String(value)])])];
    return <CategoryField field={field} value={value} caption={caption} choices={choices} />;
  }
  const month = field.name === 'PERIODO' && (value === null || /^\d{4}-\d{2}$/.test(String(value)));
  return <label>{caption} {!field.nullable && '*'}<input name={field.name} type={month ? 'month' : field.type === 'date' ? 'date' : field.type === 'number' ? 'number' : field.name === 'CORREO' ? 'email' : 'text'}
    required={!field.nullable} maxLength={field.maxBytes ?? undefined} min={field.type === 'number' ? field.primaryKey ? 1 : 0 : undefined} step={field.type === 'number' ? 10 ** -(field.scale ?? 0) : undefined}
    defaultValue={value === null ? '' : field.type === 'date' ? String(value).slice(0, 10) : String(value)} /></label>;
}
function BooleanField({ field, value, caption }: { field: ResourceField; value: Row[string]; caption: string }) {
  const [checked, setChecked] = useState(value === null ? field.name === 'ESTADO' : value === true);
  if (field.name === 'ESTADO') return <label>Estado *<select name={field.name} value={String(checked)} onChange={event => setChecked(event.target.value === 'true')}><option value="true">Activo</option><option value="false">Inactivo</option></select><small>Activo habilita este registro. Inactivo suspende su participación en el acceso.</small></label>;
  return <label className={`permission-switch${checked ? ' enabled' : ''}`}><span><strong>{caption}</strong><small>{booleanLabel(field.name, checked)}</small></span><input type="checkbox" role="switch" name={field.name} checked={checked} onChange={event => setChecked(event.target.checked)} /><span className="switch-track" aria-hidden="true" /></label>;
}
function CategoryField({ field, value, caption, choices }: { field: ResourceField; value: Row[string]; caption: string; choices: string[] }) {
  const [selection, setSelection] = useState(value === null ? '' : String(value));
  const [custom, setCustom] = useState('');
  const [entering, setEntering] = useState(false);
  return <div className="category-field"><input type="hidden" name={field.name} value={entering ? custom : selection} /><label>{caption} {!field.nullable && '*'}<select aria-label={caption} value={entering ? 'custom' : selection ? `value:${selection}` : ''} onChange={event => { setEntering(event.target.value === 'custom'); if (event.target.value !== 'custom') setSelection(event.target.value.slice(6)); }} required={!field.nullable && !entering}>
    <option value="">{field.nullable ? 'Sin especificar' : 'Selecciona una opción'}</option>{choices.map(choice => <option key={choice} value={`value:${choice}`}>{choice.replaceAll('_', ' ')}</option>)}<option value="custom">Otro valor…</option>
  </select></label>{entering && <label className="custom-option-label">Nuevo valor de {caption.toLowerCase()}<input maxLength={field.maxBytes ?? undefined} value={custom} onChange={event => setCustom(event.target.value)} required placeholder="Escribe el valor que usa tu organización" /></label>}<small>{choices.length ? 'Opciones sugeridas y valores ya registrados. Puedes conservar o agregar otro valor.' : 'Todavía no hay opciones registradas. Usa Otro valor para indicar la primera.'}</small></div>;
}
function ReferenceField({ field, value, caption }: { field: ResourceField; value: Row[string]; caption: string }) {
  const target = allResources.find(item => item.slug === field.reference)!;
  const [selected, setSelected] = useState(value === null ? '' : String(value));
  const [search, setSearch] = useState('');
  const [choices, setChoices] = useState<Row[]>([]);
  const [current, setCurrent] = useState<Row | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    if (value === null) return;
    let active = true;
    api<Row>(`${field.reference}/${value}`).then(row => { if (active) setCurrent(row); }).catch(() => {});
    return () => { active = false; };
  }, [field.reference, value]);
  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      setLoading(true); setError('');
      api<Page>(`${field.reference}?pageSize=100&search=${encodeURIComponent(search)}`).then(result => { if (active) setChoices(result.rows); }).catch(error => { if (active) setError(error instanceof ApiError && error.status === 403 ? 'Tu cuenta no puede consultar estas opciones. Solicita permiso de consulta para este módulo.' : 'No se pudieron cargar las opciones. Cambia la búsqueda para reintentar.'); }).finally(() => { if (active) setLoading(false); });
    }, search ? 250 : 0);
    return () => { active = false; window.clearTimeout(timer); };
  }, [field.reference, search]);
  const key = target.fields.find(item => item.primaryKey)!.name;
  const displayed = current && !choices.some(row => String(row[key]) === String(current[key])) ? [current, ...choices] : choices;
  return <div className="reference-field"><label className="reference-search-label">Buscar {caption.toLowerCase()}<input type="search" placeholder="Escribe un nombre o referencia…" value={search} maxLength={100} onChange={event => setSearch(event.target.value)} /></label><label>{caption} {!field.nullable && '*'}
    <select name={field.name} aria-label={`Seleccionar ${caption.toLowerCase()}`} required={!field.nullable} value={selected} onChange={event => {
      setSelected(event.target.value); setCurrent(displayed.find(row => String(row[key]) === event.target.value) ?? null);
    }}><option value="">{field.nullable ? 'Sin seleccionar' : 'Selecciona un registro'}</option>{selected && !displayed.some(row => String(row[key]) === selected) && <option value={selected}>Registro #{selected}</option>}{displayed.map(row => <option key={String(row[key])} value={String(row[key])}>{referenceLabel(target, row)}</option>)}</select>
  </label><small aria-live="polite">{loading ? 'Cargando opciones…' : error || (choices.length ? 'Selecciona por nombre. Si no aparece, utiliza la búsqueda.' : 'No hay coincidencias. Revisa la búsqueda o registra primero la referencia.')}</small></div>;
}
