import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { firstValueFrom, of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { providePlatformGovernance } from '../providers/platform-governance.provider';
import { dataRestProvider } from '../api/rest.provider';
import { RestService } from './rest.service';
import { SessionService } from './session.service';
import { PageCatalogService } from './page-catalog.service';
import { PermissionPageContextService } from './permission-page-context.service';
import { resolvePageModule } from './page-registry';
import { permissionSetsLineConfig } from '../../features/administration/permission-sets/permission-sets.config';
import { pagePermissionsLineConfig } from '../../features/administration/page-permissions/page-permissions.config';
import { LineConfig, ListPageConfig, HeaderConfig, PageModule } from '../../platform/public-api';
import { RunModalHostData } from '../../platform/models/run-modal-host-data.model';
import { DocumentPageCommandRoutingResolverService } from '../../platform/pages/document-page-command-routing-resolver.service';
import { RunModalService } from '../../platform/run-modal/run-modal.service';
import { RunModalStackService } from '../../platform/run-modal/run-modal-stack.service';
import { lookupQuery } from '../../platform/data/lookup-dependencies';
import { queryCatalog } from './page-catalog-query';
import { lineConfigDefaults } from '../../platform/data/document-config-defaults';
import { DocumentConfigDataService } from '../../platform/data/document-config-data.service';
import { RunModalHost } from '../../platform/run-modal/run-modal-host/run-modal-host';
import { PageConfigurationPage } from '../../features/administration/page-configuration/page-configuration';
import { ListPage, DocumentLines } from '../../platform/public-api';

describe('Selected resource permission navigation', () => {
  let scope: PermissionPageContextService;
  let catalog: PageCatalogService;
  let get: ReturnType<typeof vi.fn>;
  const parent = { code: 'AR', name: 'Receivables', isSystem: false };
  const row = { systemId: 'resource-row', permissionSetCode: 'AR', resource: 'user_permission_sets' };
  const pickLine = (module: PageModule) => Object.entries(module).find(([key]) => key.endsWith('LineConfig'))![1] as LineConfig;
  const pickList = (module: PageModule, pageId: string) => Object.values(module).find(value =>
    (value as ListPageConfig)?.pageId === pageId) as ListPageConfig;
  const request = (resourceRow = row) => {
    const button = permissionSetsLineConfig.toolbarButtons!.find(button => button.runModalPageId === 'page-permissions')!;
    return TestBed.inject(DocumentPageCommandRoutingResolverService).buildEntryRunModalRequest({
      pageId: button.runModalPageId!, target: button.runModalTarget, headerData: parent,
      activeLine: resourceRow, lineRows: [resourceRow], payload: {}, recordMapping: button.runModalRecord,
    });
  };
  beforeEach(() => {
    localStorage.clear();
    get = vi.fn(() => of({ data: [], meta: { total: 0 } }));
    TestBed.configureTestingModule({ imports: [RunModalHost], providers: [
      provideRouter([]), ...providePlatformGovernance(), dataRestProvider,
      { provide: RestService, useValue: { get } },
    ] });
    const session = TestBed.inject(SessionService);
    session.SuperAdmin = true;
    session.Permissions = [
      { apiPath: '/users', apiSource: 'users', ObjectName: 'users' },
      { apiPath: '/userPermissionSets', apiSource: 'userPermissionSets', ObjectName: 'user_permission_sets' },
      { apiPath: '/salesLines', apiSource: 'salesLines', ObjectName: 'sales_lines' },
    ];
    scope = TestBed.inject(PermissionPageContextService);
    catalog = TestBed.inject(PageCatalogService);
  });

  it('carries the selected business key and header context without copying the resource row UUID', () => {
    const context = request().context!;
    expect(context['headerData']).toEqual({ ...parent, resource: 'user_permission_sets' });
    expect(context['recordMappingComplete']).toBe(true);
    expect(context['headerData']).not.toHaveProperty('systemId');
    expect(request({ ...row, resource: '' }).context!['recordMappingComplete']).toBe(false);
  });

  it('discovers pages by their LINE source and supplies only that source’s fields and areas', async () => {
    const module = scope.apply(resolvePageModule('page-permissions')!, 'page-permissions', request().context);
    const line = pickLine(module);
    const page = line.columns.find(column => column.id === 'pageId')!;
    const pages = lookupQuery(page.lookup!, {});
    const result = await firstValueFrom(catalog.read(pages.endpoint + '?$filter=' + encodeURIComponent(pages.filter!))!) as {data: Record<string, unknown>[]};
    expect(result.data.map(row => row['pageId'])).toEqual(['users']);
    expect(page.defaultValue).toBe('users');
    const target = line.columns.find(column => column.id === 'targetKey')!;
    const query = lookupQuery(target.lookup!, { pageId: 'users', targetType: 'field', surface: 'line' });
    const fields = await firstValueFrom(catalog.read(query.endpoint + '?$filter=' + encodeURIComponent(query.filter!))!) as {data: Record<string, unknown>[]};
    expect(fields.data.some(row => row['targetKey'] === 'permissionSetCode')).toBe(true);
    expect(fields.data.some(row => row['targetKey'] === 'email')).toBe(false);
    expect(fields.data.every(row => row['apiSource'] === 'userPermissionSets')).toBe(true);
    expect(line.columns.find(column => column.id === 'apiSource')).toMatchObject({ type: 'text',
      readonlyWhen: {field: 'targetType', values: ['page', 'command', 'field']} });
    expect(lineConfigDefaults(line).dataSource.createFields).toContain('apiSource');
    expect(lineConfigDefaults(line).dataSource.updateFields).toContain('apiSource');
    const core = TestBed.inject(DocumentConfigDataService);
    const payload = core.buildLineCreatePayload({permissionSetCode: 'AR', pageId: 'users',
      targetType: 'field', surface: 'line', targetKey: 'permissionSetCode', apiSource: 'userPermissionSets',
      resource: 'user_permission_sets'}, line);
    expect(payload?.['apiSource']).toBe('userPermissionSets');
    expect(payload).not.toHaveProperty('resource');
    expect(core.buildLineUpdatePayload({apiSource: 'userPermissionSets'}, ['apiSource'], line)).toEqual({apiSource: 'userPermissionSets'});
    expect(get).not.toHaveBeenCalled();
  });

  it('filters stored rules by actual page/control identities and preserves parent binding for normal CRUD', () => {
    const module = scope.apply(resolvePageModule('page-permissions')!, 'page-permissions', request().context);
    const source = pickLine(module).dataSource;
    const rules = [
      { pageId: 'users', targetType: 'field', surface: 'line', targetKey: 'permissionSetCode' },
      { pageId: 'users', targetType: 'field', surface: 'header', targetKey: 'email' },
      { pageId: 'users', targetType: 'page', surface: 'header', targetKey: '*' },
      { pageId: 'companies', targetType: 'page', surface: 'header', targetKey: '*' },
    ];
    expect((queryCatalog(rules, new URLSearchParams({ $filter: source.defaultFilter! })) as {data: unknown[]}).data).toEqual([rules[0], rules[2]]);
    expect(source).toMatchObject({ endpoint: '/pagePermissions', headerPKProp: 'code', lineFKProp: 'permissionSetCode' });
    expect(source.defaultFilter).not.toContain('resources');
    expect(pagePermissionsLineConfig.dataSource.defaultFilter).toBeUndefined();
    expect(pagePermissionsLineConfig.columns.find(column => column.id === 'pageId')!.lookup!.filter).toBeUndefined();
  });

  it('shows no unrelated pages or editable rules for a resource whose UI has not been built', async () => {
    const module = scope.apply(resolvePageModule('page-permissions')!, 'page-permissions', request({ ...row, resource: 'sales_lines' }).context);
    expect(pickLine(module).dataSource.supportsCreate).toBe(false);
    const page = pickLine(module).columns.find(column => column.id === 'pageId')!;
    const query = lookupQuery(page.lookup!, {});
    const result = await firstValueFrom(catalog.read(query.endpoint + '?$filter=' + encodeURIComponent(query.filter!))!) as {data: unknown[]};
    expect(result.data).toEqual([]);
    const header = Object.entries(module).find(([key]) => key.endsWith('HeaderConfig'))![1] as HeaderConfig;
    expect(header.sections[0].fields[0].label).toContain('no configured page');
  });

  it('keeps resource scope from the filtered catalog list into its read-only control detail', async () => {
    const fixture = TestBed.createComponent(RunModalHost);
    fixture.detectChanges();
    const modal = TestBed.inject(RunModalService);
    let popups: {id: string; data?: unknown}[] = [];
    TestBed.inject(RunModalStackService).stack$.subscribe(value => popups = value);
    const context = { headerData: { resource: 'user_permission_sets' } };
    expect(await modal.open({pageId: 'page-configuration', target: 'list', context})).toBe(true);
    const parentPopup = popups[0];
    await vi.waitFor(() => expect((popups[0].data as RunModalHostData).runModalList!.loading).toBe(false));
    // Read the latest published list state, which is replaced after loading.
    const rows = (popups[0].data as RunModalHostData).runModalList!.rows as Record<string, unknown>[];
    expect(rows.map(row => row['pageId'])).toEqual(['users']);
    expect(await modal.openEntryFromList(parentPopup.id, rows[0])).toBe(true);
    const detail = (popups[1].data as RunModalHostData).runtimePage!;
    const source = pickLine(detail.module).dataSource;
    expect(source.defaultFilter).toContain('user_permission_sets');
    const controls = (queryCatalog(catalog.snapshot().controls, new URLSearchParams({$filter: source.defaultFilter!})) as {data: Record<string, unknown>[]}).data;
    expect(controls.some(row => row['targetKey'] === 'email')).toBe(false);
    expect(controls.some(row => row['targetKey'] === 'permissionSetCode')).toBe(true);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const child = fixture.debugElement.query(By.directive(PageConfigurationPage));
    expect(child.query(By.directive(ListPage)).componentInstance.lineConfig.dataSource.defaultFilter).toContain('user_permission_sets');
    await vi.waitFor(() => {
      fixture.detectChanges();
      const rows = child.query(By.directive(DocumentLines)).componentInstance.rows as Record<string, unknown>[];
      expect(rows.some(row => row['targetKey'] === 'permissionSetCode')).toBe(true);
    });
    const renderedRows = child.query(By.directive(DocumentLines)).componentInstance.rows as Record<string, unknown>[];
    expect(renderedRows.some(row => row['targetKey'] === 'permissionSetCode')).toBe(true);
    expect(renderedRows.some(row => row['targetKey'] === 'email')).toBe(false);
    expect(get).not.toHaveBeenCalled();
    fixture.destroy();
  });

  it('keeps the all-pages route unscoped and system-owned sets protected', () => {
    const module = resolvePageModule('page-permissions')!;
    expect(scope.apply(module, 'page-permissions', { headerData: parent })).toBe(module);
    const system = scope.apply(module, 'page-permissions', { headerData: {...parent, isSystem: true} });
    expect(pickLine(system).editable).toBe(false);
    expect(pickList(system, 'page-permissions').dataSource!.supportsCreate).toBe(false);
  });
});
