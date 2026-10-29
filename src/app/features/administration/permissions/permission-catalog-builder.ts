import type { CommandConfig, HeaderConfig, LineConfig, ListPageConfig } from '../../../platform/public-api';
import type { PermissionPage } from './permission-admin-api.service';

type PageTarget = {surface: string; targetType: string; targetKey: string; label: string};
export type CatalogRegistration = Pick<PermissionPage, 'pageId' | 'title' | 'pageType' | 'module' | 'route' | 'resource'> & {
  targets: PageTarget[];
};

/**
 * HLB's auto-Page Configuration pattern, but based on the one TecSA page
 * registry. Only stable config keys are stored - never captions as identities.
 * Backend resource names are selected from the server's approved catalogue.
 */
export function discoverPermissionCatalog(
  modules: ReadonlyArray<Record<string, unknown>>,
  approvedResources: ReadonlyArray<string>,
): { mapped: CatalogRegistration[]; unmapped: string[] } {
  const allowed = new Set(approvedResources);
  const mapped: CatalogRegistration[] = [];
  const unmapped: string[] = [];
  const registered = new Set<string>();

  for (const moduleRef of modules) {
    const values = Object.entries(moduleRef);
    const page = values.map(([, value]) => value).find(isPageConfig);
    if (!page?.pageId || !page.pageType || registered.has(page.pageId)) continue;
    registered.add(page.pageId);
    const targetMap = new Map<string, PageTarget>();
    const add = (surface: string, targetType: string, targetKey: unknown, label?: string): void => {
      const key = String(targetKey ?? '').trim();
      if (!/^[A-Za-z0-9_.:-]+$/.test(key) || !key) return;
      const composite = [surface, targetType, key].join('|');
      if (!targetMap.has(composite)) {
        targetMap.set(composite, {surface, targetType, targetKey: key, label: String(label || key).slice(0, 160)});
      }
    };
    const commands = (surface: string, items?: CommandConfig[]): void => {
      for (const action of items ?? []) {
        if (action.hidden) continue;
        add(surface, 'command', action.actionKey, action.label);
        if (action.runModalPageId) add('runModal', 'page', action.runModalPageId, action.label);
      }
    };
    const header = values.find(([key]) => key.endsWith('HeaderConfig'))?.[1] as HeaderConfig | undefined;
    const line = values.find(([key]) => key.endsWith('LineConfig'))?.[1] as LineConfig | undefined;
    const fields = (surface: string, input?: Array<{key: string; label: string; factBox?: unknown}>): void => {
      for (const field of input ?? []) {
        add(surface, 'field', field.key, field.label);
        if (field.factBox) add('factBox', 'field', field.key, field.label);
      }
    };

    for (const section of header?.sections ?? []) fields('header', section.fields);
    fields('line', line?.fields);
    for (const col of line?.columns ?? []) add('line', 'field', col.id, col.label);
    for (const col of page.dataSurface?.columns ?? []) add('list', 'column', col.field ?? col.id, col.label);
    for (const section of page.factBox?.sections ?? []) {
      for (const field of section.fields ?? []) add('factBox', 'field', field.field ?? field.id, field.label);
    }
    commands('list', page.commands);
    commands('header', header?.toolbarButtons);
    commands('line', line?.toolbarButtons);
    for (const [surface, action, label] of [
      ['list', 'new', 'New'], ['list', 'delete', 'Delete'], ['list', 'refresh', 'Refresh'],
      ['header', 'save', 'Save'], ['header', 'delete', 'Delete'], ['header', 'refresh', 'Refresh'],
      ['line', 'line-new', 'New Line'], ['line', 'line-delete', 'Delete Line'], ['line', 'line-refresh', 'Refresh Lines'],
    ]) {
      if (surface === 'line' && !line) continue;
      if (surface === 'list' && action === 'new' && page.standardActions?.new === false) continue;
      if (surface === 'list' && action === 'delete' && page.standardActions?.delete === false) continue;
      add(surface, 'command', action, label);
    }

    const rawEndpoint = page.dataSource?.endpoint?.replace(/^\/+/, '').split(/[/?]/)[0] ?? '';
    const resource = rawEndpoint.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
    if (!allowed.has(resource)) {
      unmapped.push(page.pageId);
      continue; // Never register a page with an unknown resource and lock out users.
    }
    mapped.push({
      pageId: page.pageId,
      title: String(page.title ?? page.pageId).slice(0, 160),
      pageType: page.pageType,
      module: page.menu?.module ?? page.module ?? null,
      route: page.menu?.route ?? null,
      resource,
      targets: [...targetMap.values()],
    });
  }
  return {mapped, unmapped};
}

function isPageConfig(value: unknown): value is ListPageConfig {
  return typeof value === 'object' && value !== null
    && typeof (value as ListPageConfig).pageId === 'string'
    && typeof (value as ListPageConfig).pageType === 'string';
}
