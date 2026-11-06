import { Injectable, inject } from '@angular/core';
import { HeaderConfig, LineConfig, ListPageConfig, PageModule } from '../../platform/public-api';
import { RunModalContext } from '../../platform/run-modal/run-modal-config.token';
import { PageCatalogService } from './page-catalog.service';

const literal = (value: unknown) => "'" + String(value).replace(/'/g, "''") + "'";
const and = (filter: string | undefined, scope: string) => filter ? `(${filter}) and (${scope})` : scope;

/** Compose ordinary configs for this permission editor; no CRUD or permission evaluation here. */
@Injectable({ providedIn: 'root' })
export class PermissionPageContextService {
  private readonly catalog = inject(PageCatalogService);

  apply(module: PageModule, pageId: string, context: RunModalContext = {}): PageModule {
    if (pageId !== 'page-permissions' && pageId !== 'page-configuration') return module;
    const header = (context['headerData'] ?? {}) as Record<string, unknown>;
    const navigation = (context['navigationContext'] ?? {}) as Record<string, unknown>;
    const resource = String(header['resource'] ?? navigation['permissionResource'] ?? '').trim();
    const system = header['isSystem'] === true;
    if (!resource && !system) return module;
    if (resource) context['navigationContext'] = { ...navigation, permissionResource: resource };
    const catalogFilter = `resources eq ${literal(resource)}`;
    const controls = resource ? this.catalog.snapshot().controls.filter(row =>
      (row['resources'] as string[]).includes(resource)) : [];
    const pageIds = [...new Set(controls.map(row => String(row['pageId'])))];
    // Persisted rules have page/control identities, not a resource column. Filter
    // those actual identities; never send the virtual catalog filter to Laravel.
    const identities = [...new Set(controls.map(row =>
      ['pageId', 'targetType', 'surface'].map(key => `${key} eq ${literal(row[key])}`).join(' and ')))];
    const ruleFilter = identities.length ? identities.map(value => `(${value})`).join(' or ') : "pageId eq ''";
    const result: PageModule = { ...module };
    for (const [key, value] of Object.entries(module)) {
      if (!value || typeof value !== 'object') continue;
      if (key.endsWith('HeaderConfig')) {
        const config = value as HeaderConfig;
        result[key] = { ...config,
          sections: resource && pageId === 'page-permissions' ? [{
            id: 'resource-context', title: 'Selected resource', fields: [{
              key: 'resource', label: controls.length ? 'Resource' : 'Resource — no configured page uses this resource yet',
              type: 'text', readonly: true,
            }],
          }] : config.sections,
          toolbarButtons: config.toolbarButtons?.map(button => resource && button.runModalPageId === 'page-configuration'
            ? { ...button, runModalRecord: { source: 'header', fields: { resource: 'resource' } } } : button),
        } satisfies HeaderConfig;
      } else if (key.endsWith('LineConfig') || (value as ListPageConfig).pageId === pageId) {
        const config = value as LineConfig & ListPageConfig;
        if (!config.dataSource) continue;
        const filter = pageId === 'page-permissions' ? ruleFilter : catalogFilter;
        const blocked = system || (resource && !controls.length);
        const source = { ...config.dataSource,
          ...(resource ? { defaultFilter: and(config.dataSource.defaultFilter, filter) } : {}),
          ...(pageId === 'page-permissions' && blocked
            ? { supportsCreate: false, supportsUpdate: false, supportsDelete: false } : {}),
        };
        result[key] = { ...config, dataSource: source,
          ...(key.endsWith('LineConfig') ? {
            ...(pageId === 'page-permissions' && blocked ? { editable: false } : {}),
            columns: config.columns.map(column => {
              if (pageId !== 'page-permissions') return column;
              return resource && column.lookup?.endpoint.startsWith('/uiCatalog/')
                ? { ...column,
                    ...(column.id === 'pageId' && pageIds.length === 1 ? { defaultValue: pageIds[0] } : {}),
                    lookup: { ...column.lookup, filter: and(column.lookup.filter, catalogFilter) } }
                : column;
            }),
          } : {}),
        };
      }
    }
    return result;
  }
}
