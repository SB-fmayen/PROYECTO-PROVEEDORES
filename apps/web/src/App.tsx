import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import type { ResourceDefinition } from '../../../packages/shared/src/resources.js';
import { api, ApiError, type Row, type Page } from './client.js';
import { buildRecordPayload } from './form-payload.js';
import { SmartField, booleanLabel } from './SmartField.js';
import { moduleGuides } from './guidance-content.js';
import { GuidedTours, fullTourPlan, moduleTourPlan, hasSeenOnboarding, rememberOnboarding } from './tours.js';

interface User { userId: string; permissions: string[]; }
const labels: Record<string, string> = {
  IDPROVEEDOR: 'Proveedor', RAZONSOCIAL: 'Razón social', NIT: 'NIT', DIRECCION: 'Dirección', TIPOCONTRIBUYENTE: 'Tipo de contribuyente', SALDOACTUAL: 'Saldo actual',
  IDCENTROCOSTO: 'Centro de costo', IDDOCUMENTOCOMPRA: 'Documento de compra', TIPODOCUMENTO: 'Tipo de documento', NUMERODOCUMENTO: 'Número de documento', FECHAEMISION: 'Fecha de emisión', FECHAVENCIMIENTO: 'Fecha de vencimiento',
  IDUSUARIO: 'Responsable', IDPAGO: 'Pago', PRECIOUNITARIO: 'Precio unitario', MONTOAPLICADO: 'Monto aplicado', SALDOPENDIENTE: 'Saldo pendiente', FECHALIQUIDACION: 'Fecha de liquidación',
  MONTORETENIDO: 'Monto retenido', NUMEROCONSTANCIA: 'Número de constancia', CUENTACONTABLE: 'Cuenta contable', FECHASOLICITUD: 'Fecha de solicitud',
  ID_AUDITORIA: 'Auditoría', USUARIO_DB: 'Usuario de conexión', ID_REGISTRO: 'Registro', DATOS_ANTERIORES: 'Datos anteriores', DATOS_NUEVOS: 'Datos nuevos', IP_ORIGEN: 'IP de origen', HOST_ORIGEN: 'Host de origen',
  ID_USUARIO: 'Usuario', ID_ROL: 'Rol', ID_PERFIL: 'Perfil', ID_MENU: 'Menú', PASSWORD: 'Contraseña', USUARIO_LOGIN: 'Usuario de acceso', ESTADO: 'Estado', IVA: 'IVA',
  PUEDE_VER: 'Ver', PUEDE_CREAR: 'Crear', PUEDE_EDITAR: 'Editar', PUEDE_ELIMINAR: 'Eliminar', NOMBRE_ROL: 'Nombre del rol', NOMBRE_PERFIL: 'Nombre del perfil', NOMBRE_MENU: 'Nombre del menú', RUTA: 'Módulo asociado', ORDEN: 'Orden', PERIODO: 'Período', FECHA_CREACION: 'Fecha de creación', FECHA_ASIGNACION: 'Fecha de asignación'
};
const label = (name: string) => labels[name] ?? name.toLowerCase().replaceAll('_', ' ').replace(/^./, char => char.toUpperCase());
const recordId = (resource: ResourceDefinition, row: Row) => resource.fields.filter(field => field.primaryKey).map(field => row[field.name]).join(':');
function display(value: Row[string]) { return value === null ? '—' : typeof value === 'boolean' ? value ? 'Sí' : 'No' : String(value); }
function displayFieldValue(name: string, value: Row[string]) { return typeof value === 'boolean' ? booleanLabel(name, value) : display(value); }

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [modules, setModules] = useState<ResourceDefinition[]>([]);
  const [modulesReady, setModulesReady] = useState(false);
  const [selected, setSelected] = useState('dashboard');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [reload, setReload] = useState(0);
  const tours = useRef<GuidedTours | null>(null);
  const automaticAttempted = useRef(new Set<string>());
  if (!tours.current) tours.current = new GuidedTours(setSelected, setError);
  const resource = modules.find(item => item.slug === selected);
  function handleError(error: unknown) {
    setError(error instanceof Error ? error.message : 'Ocurrió un error.');
    if (error instanceof ApiError && error.status === 401) { setUser(null); setModules([]); setModulesReady(false); }
  }
  useEffect(() => { api<User>('auth/me').then(setUser).catch(error => { if (!(error instanceof ApiError && error.status === 401)) handleError(error); }).finally(() => setChecking(false)); }, []);
  useEffect(() => {
    if (!user) return;
    api<ResourceDefinition[]>('modules').then(items => { setModules(items); setModulesReady(true); setSelected(current => current === 'dashboard' || items.some(item => item.slug === current) ? current : 'dashboard'); }).catch(handleError);
  }, [user, reload]);
  useEffect(() => () => { tours.current?.stop(); }, [user?.userId]);
  useEffect(() => {
    if (!user || !modulesReady || hasSeenOnboarding(user.userId) || automaticAttempted.current.has(user.userId)) return;
    const timer = window.setTimeout(() => {
      if (automaticAttempted.current.has(user.userId)) return;
      automaticAttempted.current.add(user.userId);
      void tours.current?.start(fullTourPlan(modules, user.permissions), outcome => rememberOnboarding(user.userId, outcome));
    }, 600);
    return () => window.clearTimeout(timer);
  }, [user?.userId, modulesReady, modules]);
  function navigate(page: string) { tours.current?.stop(); setSelected(page); setError(''); }
  function startFullTour() {
    if (!user) return;
    automaticAttempted.current.add(user.userId);
    void tours.current?.start(fullTourPlan(modules, user.permissions), outcome => rememberOnboarding(user.userId, outcome));
  }
  function explainModule(module: ResourceDefinition | undefined) {
    if (!user) return;
    automaticAttempted.current.add(user.userId);
    if (module) void tours.current?.start(moduleTourPlan(module, user.permissions));
    else void tours.current?.start([
      { page: 'dashboard', selector: '[data-tour-page="dashboard"] [data-tour="module-heading"]', title: 'Resumen de tu operación', description: moduleGuides.dashboard!.summary },
      { page: 'dashboard', title: 'Qué significan los importes', description: moduleGuides.dashboard!.fields },
      { page: 'dashboard', selector: '[data-tour="guide-launch"]', title: 'Cómo comenzar', description: moduleGuides.dashboard!.workflow }
    ]);
  }
  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('');
    const form = new FormData(event.currentTarget);
    try { setUser(await api<User>('auth/login', 'POST', { username: form.get('username'), password: form.get('password') })); }
    catch (error) { handleError(error); }
    finally { setBusy(false); }
  }
  async function logout() {
    setBusy(true);
    try { await api('auth/logout', 'POST'); setUser(null); setModules([]); setModulesReady(false); setError(''); }
    catch (error) { handleError(error); }
    finally { setBusy(false); }
  }
  if (checking) return <main className="loading" aria-live="polite">Conectando con su espacio de trabajo…</main>;
  if (!user) return <main className="login-layout">
    <section className="welcome"><div className="brand-mark">CP</div><p className="eyebrow">CUENTAS POR PAGAR</p><h1>Todo en orden.<br />Cada pago, claro.</h1><p>Administre proveedores, documentos y pagos desde un solo espacio, con trazabilidad en cada operación.</p><div className="welcome-line" /><span className="subtle">Gestión de proveedores · Control de obligaciones</span></section>
    <section className="login-card"><p className="eyebrow">BIENVENIDO</p><h2>Iniciar sesión</h2><p className="muted">Ingrese con su cuenta de la aplicación.</p>{error && <div className="alert" role="alert">{error}</div>}<form onSubmit={login}><label>Usuario<input name="username" autoComplete="username" maxLength={50} required autoFocus /></label><label>Contraseña<input name="password" type="password" autoComplete="current-password" maxLength={256} required /></label><button className="primary" disabled={busy}>{busy ? 'Ingresando…' : 'Ingresar →'}</button></form><p className="login-note">Las opciones disponibles dependen de sus permisos.</p></section>
  </main>;
  return <div className="workspace">
    <aside className="sidebar"><a className="brand" href="#" onClick={() => navigate('dashboard')}><span className="brand-mark small">CP</span><span>Cuentas<br /><strong>por pagar</strong></span></a><p className="nav-caption">ESPACIO DE TRABAJO</p><nav aria-label="Módulos" data-tour="navigation"><div className="nav-item"><button className="nav-link" aria-current={selected === 'dashboard' ? 'page' : undefined} onClick={() => navigate('dashboard')}><span className="nav-dot" />Resumen</button><InfoButton name="Resumen" onClick={() => explainModule(undefined)} /></div>{modules.filter(item => !item.slug.startsWith('admin/')).map(item => <div className="nav-item" key={item.slug}><button className="nav-link" aria-current={selected === item.slug ? 'page' : undefined} onClick={() => navigate(item.slug)}><span className="nav-dot" />{item.label}</button><InfoButton name={item.label} onClick={() => explainModule(item)} /></div>)}{modules.some(item => item.slug.startsWith('admin/')) && <p className="nav-caption">ADMINISTRACIÓN</p>}{modules.filter(item => item.slug.startsWith('admin/')).map(item => <div className="nav-item" key={item.slug}><button className="nav-link" aria-current={selected === item.slug ? 'page' : undefined} onClick={() => navigate(item.slug)}><span className="nav-dot" />{item.label}</button><InfoButton name={item.label} onClick={() => explainModule(item)} /></div>)}</nav><div className="sidebar-foot"><span className="avatar">U</span><div>Cuenta #{user.userId}<button className="logout" disabled={busy} onClick={logout}>Cerrar sesión</button></div></div></aside>
    <main className="content"><header className="topbar"><span>Gestión / {resource?.label ?? 'Resumen'}</span><div className="topbar-actions"><button className="guide-launch" data-tour="guide-launch" onClick={startFullTour}>Recorrido completo</button><span className="connection"><i /> Sesión activa <button className="mobile-logout" disabled={busy} onClick={logout}>Salir</button></span></div></header>{error && <div className="alert" role="alert">{error}<button aria-label="Cerrar mensaje" onClick={() => setError('')}>×</button></div>}{selected === 'dashboard' ? <Dashboard refresh={reload} onOpen={navigate} onError={handleError} onHelp={() => explainModule(undefined)} /> : resource ? <Records key={resource.slug} resource={resource} user={user} onError={handleError} onChanged={() => setReload(value => value + 1)} onHelp={() => explainModule(resource)} /> : <section className="empty"><h1>Su cuenta está activa</h1><p>No tiene módulos asignados. Solicite los permisos correspondientes al administrador.</p></section>}</main>
  </div>;
}

interface DashboardItem { slug: string; label: string; count: number; amount: number | null; amountLabel: string | null; }
function InfoButton({ name, onClick, anchor = false }: { name: string; onClick: () => void; anchor?: boolean }) {
  return <button type="button" className="module-info" data-tour={anchor ? 'module-info' : undefined} aria-label={`Información de ${name}`} title={`¿Para qué sirve ${name}?`} onClick={onClick}><span aria-hidden="true">i</span></button>;
}
function Dashboard({ refresh, onOpen, onError, onHelp }: { refresh: number; onOpen: (slug: string) => void; onError: (error: unknown) => void; onHelp: () => void }) {
  const [items, setItems] = useState<DashboardItem[] | null>(null);
  useEffect(() => { let active = true; api<DashboardItem[]>('dashboard').then(data => { if (active) setItems(data); }).catch(error => { if (active) onError(error); }); return () => { active = false; }; }, [refresh]);
  return <div data-tour-page="dashboard"><div className="page-heading"><div data-tour="module-heading" tabIndex={-1}><p className="eyebrow">VISTA GENERAL</p><h1>Su operación, de un vistazo</h1><p className="muted">Información registrada en los módulos que puede consultar.</p></div><InfoButton name="Resumen" onClick={onHelp} anchor /></div>{items === null ? <div className="table-message" role="status">Cargando resumen…</div> : !items.length ? <section className="empty"><h2>Sin módulos asignados</h2><p>Solicite al administrador los permisos necesarios.</p></section> : <div className="dashboard-grid">{items.map(item => <button className="dashboard-card" key={item.slug} onClick={() => onOpen(item.slug)}><span className="eyebrow">{item.label}</span><strong>{item.count.toLocaleString('es-GT')}</strong><span className="muted">registros</span>{item.amount !== null && <span className="dashboard-amount">{item.amountLabel}<b>{item.amount.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b></span>}<span className="dashboard-link">Abrir módulo →</span></button>)}</div>}</div>;
}

function Records({ resource, user, onError, onChanged, onHelp }: { resource: ResourceDefinition; user: User; onError: (error: unknown) => void; onChanged: () => void; onHelp: () => void }) {
  const [data, setData] = useState<Page | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);
  const [editing, setEditing] = useState<Row | null | undefined>(undefined);
  const [deleting, setDeleting] = useState<Row | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [detail, setDetail] = useState<Row | null>(null);
  const allowed = (action: string) => !resource.readOnly && user.permissions.includes(`${resource.slug}.${action}`);
  useEffect(() => {
    let current = true;
    setLoading(true);
    api<Page>(`${resource.slug}?page=${page}&pageSize=20&search=${encodeURIComponent(query)}`).then(result => { if (current) setData(result); }).catch(error => { if (current) onError(error); }).finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [resource.slug, page, query, refresh]);
  async function save(body: Row) {
    setBusy(true);
    try { await api(`${resource.slug}${editing ? `/${recordId(resource, editing)}` : ''}`, editing ? 'PATCH' : 'POST', body); setEditing(undefined); setNotice('Registro guardado correctamente.'); setRefresh(value => value + 1); onChanged(); }
    finally { setBusy(false); }
  }
  async function remove() {
    if (!deleting) return;
    setBusy(true);
    try { await api(`${resource.slug}/${recordId(resource, deleting)}`, 'DELETE'); setDeleting(null); setNotice('Registro eliminado correctamente.'); setPage(1); setRefresh(value => value + 1); onChanged(); }
    catch (error) { onError(error); }
    finally { setBusy(false); }
  }
  const fields = resource.readOnly ? resource.fields.filter(field => !['DATOS_ANTERIORES', 'DATOS_NUEVOS', 'IP_ORIGEN', 'HOST_ORIGEN'].includes(field.name)) : resource.fields;
  return <div data-tour-page={resource.slug}>
    <div className="page-heading"><div data-tour="module-heading" tabIndex={-1}><p className="eyebrow">{resource.slug.startsWith('admin/') ? 'ADMINISTRACIÓN' : resource.readOnly ? 'TRAZABILIDAD' : 'GESTIÓN OPERATIVA'}</p><h1>{resource.label}</h1><p className="muted module-summary">{moduleGuides[resource.slug]?.summary}</p></div><div className="page-actions"><InfoButton name={resource.label} onClick={onHelp} anchor />{allowed('create') && <button className="primary" data-tour="create" onClick={() => { setEditing(null); setNotice(''); }}>＋ Nuevo registro</button>}</div></div>
    {notice && <div className="success" role="status">✓ {notice}<button aria-label="Cerrar mensaje" onClick={() => setNotice('')}>×</button></div>}
    <section className="records-card" data-tour="records"><div className="table-toolbar"><form data-tour="search" onSubmit={event => { event.preventDefault(); setPage(1); setQuery(search); }} role="search"><input aria-label="Buscar registros" placeholder="Buscar en este módulo…" value={search} maxLength={100} onChange={event => setSearch(event.target.value)} /><button type="submit" className="secondary">Buscar</button></form><span className="record-count">{data?.total ?? '—'} registros</span><button className="text-button" disabled={loading} onClick={() => setRefresh(value => value + 1)}>↻ Actualizar</button></div>
    <div className="table-scroll" aria-busy={loading}><table><thead><tr>{fields.map(field => <th key={field.name}>{label(field.name)}</th>)}<th className="actions">Acciones</th></tr></thead><tbody>{data?.rows.map(row => <tr key={recordId(resource, row)}>{fields.map(field => <td key={field.name} title={displayFieldValue(field.name, row[field.name] ?? null)}>{field.name === 'ESTADO' ? <span className={`state-tag${row[field.name] === false || row[field.name] === 'INACTIVO' ? ' inactive' : ''}`}>{displayFieldValue(field.name, row[field.name] ?? null)}</span> : displayFieldValue(field.name, row[field.name] ?? null)}</td>)}<td className="actions"><button onClick={() => setDetail(row)}>Ver</button>{allowed('update') && <button onClick={() => setEditing(row)}>Editar</button>}{allowed('delete') && <button className="danger-text" onClick={() => setDeleting(row)}>Eliminar</button>}</td></tr>)}</tbody></table>{loading && <div className="table-message" role="status">Cargando registros…</div>}{!loading && !data?.rows.length && <div className="table-message"><strong>{query ? 'No se encontraron coincidencias' : 'Todavía no hay registros'}</strong><p>{query ? 'Pruebe con otra búsqueda.' : allowed('create') ? 'Cree el primer registro para comenzar.' : 'Aquí aparecerá la información disponible.'}</p></div>}</div>
    <footer className="pagination"><span>Página {page} de {Math.max(1, Math.ceil((data?.total ?? 0) / 20))}</span><div><button className="secondary" disabled={page === 1 || loading} onClick={() => setPage(value => value - 1)}>← Anterior</button><button className="secondary" disabled={loading || page * 20 >= (data?.total ?? 0)} onClick={() => setPage(value => value + 1)}>Siguiente →</button></div></footer></section>
    {editing !== undefined && <RecordForm resource={resource} row={editing} busy={busy} onSave={save} onClose={() => setEditing(undefined)} />}
    {deleting && <ModalFrame titleId="delete-title" compact disabled={busy} onClose={() => setDeleting(null)}><h2 id="delete-title">Eliminar registro</h2><p>Se eliminará el registro #{recordId(resource, deleting)}. Los registros relacionados pueden impedir esta operación.</p><div className="modal-actions"><button className="secondary" disabled={busy} onClick={() => setDeleting(null)}>Cancelar</button><button className="danger" disabled={busy} onClick={remove}>{busy ? 'Eliminando…' : 'Eliminar registro'}</button></div></ModalFrame>}
    {detail && <ModalFrame titleId="detail-title" onClose={() => setDetail(null)}><div className="modal-heading"><h2 id="detail-title">Detalle del registro</h2><button onClick={() => setDetail(null)} aria-label="Cerrar detalle">×</button></div><dl className="detail-list">{resource.fields.map(field => <div key={field.name}><dt>{label(field.name)}</dt><dd>{['DATOS_ANTERIORES', 'DATOS_NUEVOS'].includes(field.name) ? <pre>{prettyJson(detail[field.name])}</pre> : displayFieldValue(field.name, detail[field.name] ?? null)}</dd></div>)}</dl><div className="modal-actions"><button className="primary" onClick={() => setDetail(null)}>Cerrar</button></div></ModalFrame>}
  </div>;
}
function prettyJson(value: Row[string] | undefined) { try { return JSON.stringify(JSON.parse(String(value)), null, 2); } catch { return display(value ?? null); } }
function ModalFrame({ children, titleId, compact = false, disabled = false, onClose }: { children: ReactNode; titleId: string; compact?: boolean; disabled?: boolean; onClose: () => void }) {
  const element = useRef<HTMLElement>(null);
  const close = useRef(onClose);
  const pending = useRef(disabled);
  close.current = onClose; pending.current = disabled;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const dialog = element.current;
    (dialog?.querySelector<HTMLElement>('input,button') ?? dialog)?.focus();
    function key(event: KeyboardEvent) {
      if (document.querySelector('.driver-popover')) return;
      if (event.key === 'Escape' && !pending.current) { event.preventDefault(); close.current(); }
      if (event.key !== 'Tab') return;
      const items = [...(dialog?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),a[href],select:not(:disabled)') ?? [])];
      const first = items[0]; const last = items.at(-1);
      if (!first) { event.preventDefault(); dialog?.focus(); }
      else if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('keydown', key); previous?.focus(); };
  }, []);
  return <div className="modal-backdrop"><section ref={element} tabIndex={-1} className={`modal${compact ? ' compact' : ''}`} role="dialog" aria-modal="true" aria-labelledby={titleId}>{children}</section></div>;
}
function RecordForm({ resource, row, busy, onSave, onClose }: { resource: ResourceDefinition; row: Row | null; busy: boolean; onSave: (body: Row) => Promise<void>; onClose: () => void }) {
  const fields = resource.fields.filter(field => !field.identity && !field.generated && (!field.primaryKey || (!row && resource.slug.startsWith('admin/'))));
  const [error, setError] = useState('');
  const [options, setOptions] = useState<Record<string, string[]>>({});
  useEffect(() => {
    if (resource.slug.startsWith('admin/')) return;
    let active = true;
    api<Record<string, string[]>>(`form-options?module=${encodeURIComponent(resource.slug)}`).then(result => { if (active) setOptions(result); }).catch(() => {});
    return () => { active = false; };
  }, [resource.slug]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError('');
    const body = buildRecordPayload(fields, new FormData(event.currentTarget), row);
    if (!Object.keys(body).length) { setError('No hay cambios para guardar.'); return; }
    try { await onSave(body); }
    catch (error) { setError(error instanceof Error ? error.message : 'No se pudo guardar.'); }
  }
  return <ModalFrame titleId="form-title" disabled={busy} onClose={onClose}><div className="modal-heading"><div><p className="eyebrow">{resource.label}</p><h2 id="form-title">{row ? 'Editar registro' : 'Nuevo registro'}</h2></div><button disabled={busy} onClick={onClose} aria-label="Cerrar formulario">×</button></div><p className="muted form-hint">{moduleGuides[resource.slug]?.workflow} Los campos marcados con * son obligatorios.</p>{error && <div className="alert" role="alert">{error}</div>}<form onSubmit={submit}><div className="form-grid">{fields.map(field => <SmartField key={field.name} resource={resource} field={field} caption={label(field.name)} value={row?.[field.name] ?? null} options={options[field.name] ?? []} />)}{resource.slug === 'admin/usuarios' && <label>Contraseña {row ? '(dejar vacía para conservar)' : '*'}<input name="PASSWORD" type="password" autoComplete="new-password" minLength={12} maxLength={256} required={!row} /><small>Mínimo 12 caracteres.</small></label>}</div><div className="modal-actions"><button type="button" className="secondary" disabled={busy} onClick={onClose}>Cancelar</button><button className="primary" disabled={busy}>{busy ? 'Guardando…' : 'Guardar registro'}</button></div></form></ModalFrame>;
}
