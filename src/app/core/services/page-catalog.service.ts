import { Injectable, Injector, inject } from '@angular/core';
import { defer, of, throwError, Observable } from 'rxjs';
import { featurePageModules } from '../../features/feature-pages.generated';
import { HeaderConfig, LineConfig, ListPageConfig, PageModule } from '../../platform/public-api';
import { DocumentPageCommandAssemblerService } from '../../platform/pages/document-page-command-assembler.service';
import { lineConfigDefaults } from '../../platform/data/document-config-defaults';
import { EntityContractService } from '../../platform/data/entity-contract.service';
import { StandardListActionsService } from '../../platform/pages/standard-list-actions.service';
import { PermissionService } from './permission.service';
import { SessionService } from './session.service';
import { queryCatalog } from './page-catalog-query';

export type CatalogRow = Record<string, unknown>;
const sourcePath = (value: string) => value.split('?')[0].replace(/\{[^}]*\}/g, '{}').replace(/^\/+|\/+$/g, '');

/** Read-only projections of discovered UI configs. Permission rules remain server records. */
@Injectable({ providedIn: 'root' })
export class PageCatalogService {
  private readonly injector = inject(Injector);
  private readonly permissions = inject(PermissionService);
  private readonly session = inject(SessionService);

  private sourceIdentity(source: NonNullable<ListPageConfig['dataSource']>, publishedSources: Map<string, CatalogRow>): { resource?: string; apiSource?: string } {
    const endpoint = source.navigation
      ? source.navigation.parentEndpoint + '/{parentId}/' + source.navigation.childCollection
      : source.endpoint;
    const published = publishedSources.get(sourcePath(endpoint));
    return {
      resource: typeof published?.['ObjectName'] === 'string' ? published['ObjectName'] : undefined,
      apiSource: typeof published?.['apiSource'] === 'string' ? published['apiSource']
        : this.injector.get(EntityContractService).sourceName(source),
    };
  }

  private pageSource(page: ListPageConfig, surface: string, declared: Partial<NonNullable<ListPageConfig['dataSource']>> | undefined,
    published: Map<string, CatalogRow>, relationship?: string): NonNullable<ListPageConfig['dataSource']> | undefined {
    if (declared?.endpoint) return declared as NonNullable<ListPageConfig['dataSource']>;
    const candidates = [...published.values()].filter(row => (Array.isArray(row['pageObjects']) &&
      (row['pageObjects'] as Array<{objectId:number;surface:string}>).some(binding => binding.objectId === page.objectId && binding.surface === surface)
      || row['pageId'] === (surface === 'line' ? page.pageId + '-lines' : page.pageId))
      && (!relationship || row['apiSource'] === relationship));
    if (new Set(candidates.map(row => row['apiSource'])).size !== 1) return undefined;
    return {endpoint: String(candidates[0]['apiPath']), ...declared};
  }

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
          const resources = [...new Set([
            ...((areas.get(key)?.['resources'] as string[] | undefined) ?? []),
            ...((control['resources'] as string[] | undefined) ?? []),
          ])];
          areas.set(key, {
            systemId: key,
            pageId: control['pageId'],
            targetType: control['targetType'],
            surface,
            label,
            resources,
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
    // Read the existing login snapshot once per projection, not once per field/page.
    const publishedSources = new Map<string, CatalogRow>();
    for (const value of this.session.Permissions) {
      const row = value as CatalogRow;
      if (typeof row?.['apiPath'] === 'string') publishedSources.set(sourcePath(row['apiPath']), row);
    }
    for (const module of modules) {
      const page = Object.values(module).find(
        (value) => value && typeof value === 'object' && 'pageId' in value,
      ) as ListPageConfig | undefined;
      if (!page?.pageId) continue;
      const pageSource = this.pageSource(page, 'header', page.dataSource, publishedSources);
      if (!pageSource) continue;
      const header = Object.entries(module).find(([name]) => name.endsWith('HeaderConfig'))?.[1] as
        | HeaderConfig
        | undefined;
      const declaredLine = Object.entries(module).find(([name]) =>
        name.endsWith('LineConfig'),
      )?.[1] as LineConfig | undefined;
      const lineSourceConfig = declaredLine ? this.pageSource(page, 'line', declaredLine.dataSource, publishedSources, declaredLine.relationship) : undefined;
      const line = declaredLine && lineSourceConfig ? lineConfigDefaults({...declaredLine, dataSource: lineSourceConfig}) : undefined;
      const headerSource = this.sourceIdentity(pageSource, publishedSources);
      const lineSource = line ? this.sourceIdentity(line.dataSource, publishedSources) : {};
      const resources = [...new Set([headerSource.resource, lineSource.resource].filter((value): value is string => !!value))];
      pages.push({
        systemId: page.pageId,
        pageId: page.pageId,
        title: page.title ?? page.pageId,
        module: page.module ?? '',
        pageType: page.pageType,
        route: page.menu?.route ?? '',
        endpoint: pageSource.endpoint,
        related: !page.menu,
        resources,
      });
      const add = (
        targetType: string,
        surface: string,
        targetKey: string,
        label: string,
        endpoint = '',
      ) => {
        const systemId = JSON.stringify([page.pageId, targetType, surface, targetKey]);
        const source = surface === 'line' ? lineSource : headerSource;
        const apiSource = targetType === 'field' ? source.apiSource : undefined;
        controls.set(systemId, {
          systemId,
          pageId: page.pageId,
          targetType,
          surface,
          targetKey,
          label,
          endpoint,
          apiSource: apiSource ?? null,
          resources: targetType === 'page' ? resources : source.resource ? [source.resource] : [],
        });
      };
      add('page', 'header', '*', page.title ?? page.pageId);
      for (const field of header?.sections.flatMap((section) => section.fields) ?? [])
        if (!field.hidden) add('field', 'header', field.key, field.label, pageSource.endpoint);
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
            pageSource.endpoint,
          );
      for (const section of page.factBox?.sections ?? [])
        for (const field of section.fields ?? [])
          if (field.field)
            add('field', 'header', field.field, field.label, pageSource.endpoint);
      for (const [key, command] of Object.entries(
        this.injector.get(StandardListActionsService).resolve(page),
      ))
        if (command && typeof command === 'object')
          add('command', 'list', key, command.label ?? key);
      const headerCommands = this.injector
        .get(DocumentPageCommandAssemblerService)
        .resolveHeaderToolbarButtons({
          dataSource: pageSource,
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
