import { driver, type Driver, type DriveStep } from 'driver.js';
import type { ResourceDefinition } from '../../../packages/shared/src/resources.js';
import { moduleGuides } from './guidance-content.js';

export interface TourStop { page: string; selector?: string; title: string; description: string; }
const target = (page: string, name: string) => `[data-tour-page="${page}"] [data-tour="${name}"]`;
export function moduleTourPlan(resource: ResourceDefinition, permissions: readonly string[]): TourStop[] {
  const guide = moduleGuides[resource.slug]!;
  return [
    { page: resource.slug, selector: target(resource.slug, 'module-heading'), title: resource.label, description: guide.summary },
    { page: resource.slug, selector: target(resource.slug, 'records'), title: 'Qué información encontrarás', description: guide.fields },
    { page: resource.slug, selector: target(resource.slug, 'search'), title: 'Buscar registros', description: 'Escribe un nombre, número o referencia y pulsa Buscar. Puedes cambiar de página o actualizar los datos sin modificar registros.' },
    ...(!resource.readOnly && permissions.includes(`${resource.slug}.create`) ? [{ page: resource.slug, selector: target(resource.slug, 'create'), title: 'Registrar información', description: `${guide.workflow} El botón abre un formulario; las listas muestran opciones y registros reales. No se guarda nada hasta pulsar Guardar registro.` }] : [{ page: resource.slug, title: 'Cómo se utiliza este módulo', description: guide.workflow }]),
    { page: resource.slug, selector: target(resource.slug, 'module-info'), title: 'Puedes volver cuando quieras', description: 'Usa este botón de información para repetir la explicación del módulo. También puedes abrir el Recorrido completo desde la barra superior.' }
  ];
}
export function fullTourPlan(modules: readonly ResourceDefinition[], permissions: readonly string[]): TourStop[] {
  const result: TourStop[] = [
    { page: 'dashboard', title: 'Bienvenido a Cuentas por pagar', description: 'Vamos a explicar para qué sirve cada módulo disponible en tu cuenta. El recorrido no crea ni modifica datos. Puedes omitirlo en cualquier momento y repetirlo desde Recorrido completo.' },
    { page: 'dashboard', selector: '[data-tour="navigation"]', title: 'Tus módulos y permisos', description: 'Aquí están las secciones que puedes consultar. El botón (i) explica cada una. Los permisos de tu cuenta determinan qué puedes ver, crear, editar o eliminar.' },
    { page: 'dashboard', selector: target('dashboard', 'module-heading'), title: 'Resumen', description: `${moduleGuides.dashboard!.summary} ${moduleGuides.dashboard!.workflow}` }
  ];
  for (const resource of modules) {
    const guide = moduleGuides[resource.slug];
    if (!guide) continue;
    result.push({ page: resource.slug, selector: target(resource.slug, 'module-heading'), title: resource.label, description: `${guide.summary}<br><br><strong>Datos principales</strong><br>${guide.fields}<br><br><strong>Cómo se utiliza</strong><br>${guide.workflow}` });
    if (resource.slug === modules[0]?.slug) {
      result.push({ page: resource.slug, selector: target(resource.slug, 'search'), title: 'Encuentra la información', description: 'Busca por nombre o referencia y recorre las páginas del listado. Ver abre un registro sin modificarlo; Editar y Eliminar solo aparecen cuando tu cuenta tiene permiso.' });
      if (!resource.readOnly && permissions.includes(`${resource.slug}.create`)) result.push({ page: resource.slug, selector: target(resource.slug, 'create'), title: 'Formularios fáciles de completar', description: 'Nuevo registro abre el formulario. Selecciona proveedores, documentos y otros registros por su nombre. Activo e Inactivo son opciones claras; los permisos tienen interruptores de Permitir o No permitir. Puedes cancelar sin guardar.' });
    }
  }
  result.push({ page: 'dashboard', selector: '[data-tour="guide-launch"]', title: 'Ya puedes comenzar', description: 'Repite aquí el recorrido completo o usa (i) para una explicación del módulo que estés usando. Registrar una compra, un pago o un asiento mantiene información; no ejecuta transferencias ni automatiza la contabilidad.' });
  return result;
}

export function onboardingKey(userId: string): string { return `cpp:welcome:v1:${userId}`; }
const seenInMemory = new Set<string>();
export function hasSeenOnboarding(userId: string): boolean {
  const key = onboardingKey(userId);
  if (seenInMemory.has(key)) return true;
  try { return !!window.localStorage.getItem(key); } catch { return false; }
}
export function rememberOnboarding(userId: string, outcome: 'completed' | 'skipped'): void {
  const key = onboardingKey(userId); seenInMemory.add(key);
  try { window.localStorage.setItem(key, outcome); } catch { /* La ayuda sigue disponible sin almacenamiento. */ }
}

export class GuidedTours {
  private current: Driver | null = null;
  private generation = 0;
  private silent = false;
  constructor(private navigate: (page: string) => void, private fail: (message: string) => void) {}
  stop(): void {
    this.generation++; this.silent = true;
    this.current?.destroy(); this.current = null; this.silent = false;
  }
  async start(plan: TourStop[], finished?: (outcome: 'completed' | 'skipped') => void): Promise<void> {
    this.stop();
    if (!plan.length) return;
    const generation = this.generation;
    const origin = document.activeElement as HTMLElement | null;
    let done = false;
    let moving = false;
    const steps: DriveStep[] = plan.map(stop => ({ ...(stop.selector ? { element: stop.selector } : {}), popover: { title: stop.title, description: stop.description, side: 'bottom', align: 'start' } }));
    const tour = driver({
      steps, animate: !window.matchMedia('(prefers-reduced-motion: reduce)').matches, smoothScroll: false,
      allowClose: true, allowKeyboardControl: true, overlayClickBehavior: 'none', disableActiveInteraction: true,
      showButtons: ['previous', 'next', 'close'], showProgress: true, progressText: 'Paso {{current}} de {{total}}',
      nextBtnText: 'Siguiente →', prevBtnText: '← Anterior', doneBtnText: 'Terminar', closeBtnLabel: 'Omitir recorrido',
      popoverClass: 'cpp-tour', stagePadding: 8, stageRadius: 9,
      onNextClick: () => { const index = tour.getActiveIndex() ?? 0; if (index === plan.length - 1) { done = true; tour.destroy(); } else void go(index + 1); },
      onPrevClick: () => { void go(Math.max(0, (tour.getActiveIndex() ?? 0) - 1)); },
      onDoneClick: () => { done = true; tour.destroy(); },
      onPopoverRender: popover => {
        const skip = document.createElement('button'); skip.type = 'button'; skip.textContent = 'Omitir recorrido';
        skip.className = 'tour-skip'; skip.addEventListener('click', () => tour.destroy());
        popover.footerButtons.prepend(skip);
      },
      onDestroyed: () => {
        if (!this.silent && this.current === tour) finished?.(done ? 'completed' : 'skipped');
        if (this.current === tour) { this.current = null; this.generation++; }
        if (!this.silent) window.requestAnimationFrame(() => {
          if (this.current) return;
          if (origin?.isConnected) origin.focus();
          else document.querySelector<HTMLElement>('[data-tour="module-heading"]')?.focus();
        });
      }
    });
    this.current = tour;
    const go = async (index: number) => {
      if (moving || this.generation !== generation) return;
      moving = true;
      const stop = plan[index]!;
      this.navigate(stop.page);
      const started = performance.now();
      while (this.generation === generation) {
        const page = document.querySelector(`[data-tour-page="${stop.page}"]`);
        if (page && (!stop.selector || document.querySelector(stop.selector))) {
          await new Promise<void>(resolve => window.requestAnimationFrame(() => resolve()));
          if (this.generation === generation) { if (tour.isActive()) tour.moveTo(index); else tour.drive(index); }
          moving = false; return;
        }
        if (performance.now() - started > 4000) {
          this.stop(); this.fail('No se pudo abrir el paso del recorrido. Puedes volver a iniciarlo desde el botón de información.'); return;
        }
        await new Promise<void>(resolve => window.setTimeout(resolve, 25));
      }
    };
    await go(0);
  }
}
