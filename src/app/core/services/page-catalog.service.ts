import { Injectable, Injector, inject } from '@angular/core';
import { defer, of, throwError, Observable } from 'rxjs';
import { featurePageModules } from '../../features/feature-pages.generated';
import { HeaderConfig, LineConfig, ListPageConfig, PageModule } from '../../platform/public-api';
import { DocumentPageCommandAssemblerService } from '../../platform/pages/document-page-command-assembler.service';
import { lineConfigDefaults } from '../../platform/data/document-config-defaults';
import { EntityContractService } from '../../platform/data/entity-contract.service';
import { StandardListActionsService } from '../../platform/pages/standard-list-actions.service';
import { PermissionService } from './permission.service';
import { queryCatalog } from './page-catalog-query';

export type CatalogRow = Record<string, unknown>;

/** Read-only projections of discovered UI configs. Permission rules remain server records. */
@Injectable({ providedIn: 'root' })
export class PageCatalogService {
  private readonly injector = inject(Injector);
  private readonly permissions = inject(PermissionService);

  read(endpoint: string): Observable<unknown> | undefined {
    const url = new URL(endpoint, 'https://ui.local');
    if (!url.pathname.startsWith('/uiCatalog/')) return undefined;
    return defer(() => {
      if (!this.permissions.canView('permission-sets'))
        return throwError(() => new Error('Permission Set read access is required.'));
      const snapshot = this.snapshot();
      const parts = url.pathname.split('/').filter(Boolean).map(decodeURIComponent);
      if (parts[1] === 'controls' && parts.length === 2)
        return of(queryCatalog(snapshot.controls, url.searchParams));
      if (parts[1] === 'areas' && parts.length === 2) {
        const areas = new Map<string, CatalogRow>();
        for (const control of snapshot.controls) {
          const surface = String(control['surface']);
          const label =
            (
              {
                header: 'Header',
                line: 'Lines',
                list: 'List',
                detail: 'Details',
                factBox: 'FactBox',
              } as Record<string, string>
            )[surface] ?? surface;
          const key = JSON.stringify([control['pageId'], control['targetType'], surface]);
          areas.set(key, {
            systemId: key,
            pageId: control['pageId'],
            targetType: control['targetType'],
            surface,
            label,
          });
        }
        return of(queryCatalog([...areas.values()], url.searchParams));
      }
      if (parts[1] !== 'pages') return throwError(() => new Error('Unknown UI catalogue.'));
      if (parts.length === 2) return of(queryCatalog(snapshot.pages, url.searchParams));
      const page = snapshot.pages.find((row) => row['pageId'] === parts[2]);
      if (!page) return throwError(() => new Error('Page configuration was not found.'));
      if (parts.length === 3) return of({ data: page });
      if (parts[3] === 'controls' && parts.length === 4)
        return of(
          queryCatalog(
            snapshot.controls.filter((row) => row['pageId'] === parts[2]),
            url.searchParams,
          ),
        );
      return throwError(() => new Error('Unknown UI catalogue.'));
    });
  }

  snapshot(modules: PageModule[] = featurePageModules): {
    pages: CatalogRow[];
    controls: CatalogRow[];
  } {
    const pages: CatalogRow[] = [];
    const controls = new Map<string, CatalogRow>();
    for (const module of modules) {
      const page = Object.values(module).find(
        (value) => value && typeof value === 'object' && 'pageId' in value,
      ) as ListPageConfig | undefined;
      if (!page?.pageId || !page.dataSource) continue;
      const header = Object.entries(module).find(([name]) => name.endsWith('HeaderConfig'))?.[1] as
        | HeaderConfig
        | undefined;
      const declaredLine = Object.entries(module).find(([name]) =>
        name.endsWith('LineConfig'),
      )?.[1] as LineConfig | undefined;
      const line = declaredLine ? lineConfigDefaults(declaredLine) : undefined;
      pages.push({
        systemId: page.pageId,
        pageId: page.pageId,
        title: page.title ?? page.pageId,
        module: page.module ?? '',
        pageType: page.pageType,
        route: page.menu?.route ?? '',
        endpoint: page.dataSource.endpoint,
        related: !page.menu,
      });
      const add = (
        targetType: string,
        surface: string,
        targetKey: string,
        label: string,
        endpoint = '',
      ) => {
        const systemId = JSON.stringify([page.pageId, targetType, surface, targetKey]);
        const source = surface === 'line' ? line?.dataSource : page.dataSource;
        const apiSource =
          targetType === 'field' && source
            ? this.injector.get(EntityContractService).sourceName(source)
            : undefined;
        controls.set(systemId, {
          systemId,
          pageId: page.pageId,
          targetType,
          surface,
          targetKey,
          label,
          endpoint,
          apiSource: apiSource ?? null,
        });
      };
      add('page', 'header', '*', page.title ?? page.pageId);
      for (const field of header?.sections.flatMap((section) => section.fields) ?? [])
        if (!field.hidden) add('field', 'header', field.key, field.label, page.dataSource.endpoint);
      for (const column of line?.columns ?? [])
        if (!column.hidden)
          add('field', 'line', column.field ?? column.id, column.label, line!.dataSource.endpoint);
      // List and FactBox values use the same header field permission identity as the shared renderer.
      for (const column of page.dataSurface?.columns ?? [])
        if (!column.hidden && (column.field ?? column.id))
          add(
            'field',
            'header',
            (column.field ?? column.id)!,
            column.label,
            page.dataSource.endpoint,
          );
      for (const section of page.factBox?.sections ?? [])
        for (const field of section.fields ?? [])
          if (field.field)
            add('field', 'header', field.field, field.label, page.dataSource.endpoint);
      for (const [key, command] of Object.entries(
        this.injector.get(StandardListActionsService).resolve(page),
      ))
        if (command && typeof command === 'object')
          add('command', 'list', key, command.label ?? key);
      const headerCommands = this.injector
        .get(DocumentPageCommandAssemblerService)
        .resolveHeaderToolbarButtons({
          dataSource: page.dataSource,
          toolbarButtons: header?.toolbarButtons,
          pageId: page.pageId,
        });
      const lineCommands = this.injector
        .get(DocumentPageCommandAssemblerService)
        .resolveLineToolbarButtons({ lineConfig: line, pageId: page.pageId });
      for (const command of [
        ...headerCommands.map((command) => ({ ...command, surface: command.surface ?? 'header' })),
        ...lineCommands.map((command) => ({ ...command, surface: command.surface ?? 'line' })),
        ...(page.commands ?? []),
        ...(header?.detailToolbarButtons ?? []).map((command) => ({
          ...command,
          surface: command.surface ?? 'detail',
        })),
        ...(page.factBox?.buttons ?? []).map((command) => ({
          ...command,
          surface: command.surface ?? 'factBox',
        })),
        ...(page.factBox?.sections ?? [])
          .flatMap((section) => section.buttons ?? [])
          .map((command) => ({ ...command, surface: command.surface ?? 'factBox' })),
      ])
        add(
          'command',
          command.surface ?? 'header',
          command.actionKey.replace(/^cmd:/i, '').toLowerCase(),
          command.label,
        );
    }
    return { pages, controls: [...controls.values()] };
  }
}
