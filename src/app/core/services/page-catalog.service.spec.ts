import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PageConfigurationPage } from '../../features/administration/page-configuration/page-configuration';
import { providePlatformGovernance } from '../providers/platform-governance.provider';
import { ListPage, RunModalHost, DocumentLines } from '../../platform/public-api';
import { By } from '@angular/platform-browser';
import { firstValueFrom, of } from 'rxjs';
import { vi } from 'vitest';
import { describe, expect, it } from 'vitest';
import { PageCatalogService } from './page-catalog.service';
import { PermissionService } from './permission.service';
import { SessionService } from './session.service';
import { RestService } from './rest.service';
import { dataRestProvider } from '../api/rest.provider';
import { DATA_REST_SERVICE, DataSourceService } from '../../platform/data/data-source.service';
import { EntityContractService } from '../../platform/data/entity-contract.service';
import { resolvePageModule } from './page-registry';
import { pagePermissionsLineConfig } from '../../features/administration/page-permissions/page-permissions.config';
import { lookupQuery } from '../../platform/data/lookup-dependencies';
import { queryCatalog } from './page-catalog-query';

describe('Config-derived Page Configuration catalogue', () => {
  function setup(allowed = true) {
    TestBed.resetTestingModule();
    const get = vi.fn(() => of({ data: [] }));
    TestBed.configureTestingModule({
      providers: [
        dataRestProvider,
        { provide: RestService, useValue: { get } },
        { provide: PermissionService, useValue: { canView: () => allowed } },
        {
          provide: SessionService,
          useValue: { SuperAdmin: true, CompanySuper: true, Permissions: [], PagePermissions: [] },
        },
      ],
    });
    return { catalog: TestBed.inject(PageCatalogService), get };
  }
  it('discovers every page and its header/line identities, including standard commands', () => {
    const { catalog } = setup();
    const { pages, controls } = catalog.snapshot();
    expect(pages.some((page) => page['pageId'] === 'page-configuration')).toBe(true);
    expect(pages.some((page) => page['pageId'] === 'user-company-access' && page['related'])).toBe(
      true,
    );
    expect(
      controls.some(
        (row) =>
          row['pageId'] === 'users' &&
          row['targetKey'] === 'userName' &&
          row['surface'] === 'header',
      ),
    ).toBe(true);
    expect(
      controls.some(
        (row) =>
          row['pageId'] === 'users' &&
          row['targetKey'] === 'permissionSetCode' &&
          row['surface'] === 'line',
      ),
    ).toBe(true);
    expect(
      controls.some(
        (row) =>
          row['pageId'] === 'users' &&
          row['targetKey'] === 'company-access' &&
          row['targetType'] === 'command',
      ),
    ).toBe(true);
    expect(
      controls.some((row) => row['pageId'] === 'users' && row['targetKey'] === 'line-new'),
    ).toBe(true);
    expect(new Set(controls.map((row) => row['systemId'])).size).toBe(controls.length);
    // A new config becomes available without a second manual registration.
    const module = resolvePageModule('users')!;
    expect(catalog.snapshot([module]).pages).toHaveLength(1);
  });
  it('serves shared list/detail/child reads without HTTP or a circular provider dependency', async () => {
    const { get } = setup();
    const data = TestBed.inject(DataSourceService);
    const response = await firstValueFrom(
      data.loadList({ endpoint: '/uiCatalog/pages', defaultFilter: "pageId eq 'users'" }),
    );
    expect((response as { value: unknown[] }).value).toHaveLength(1);
    const rest = TestBed.inject(DATA_REST_SERVICE);
    expect(
      ((await firstValueFrom(rest.get('/uiCatalog/pages/users'))) as { data: { pageId: string } })
        .data.pageId,
    ).toBe('users');
    const child = (await firstValueFrom(rest.get('/uiCatalog/pages/users/controls?$top=1000'))) as {
      data: Record<string, unknown>[];
    };
    expect(child.data.length).toBeGreaterThan(5);
    expect(child.data.every((row) => row['pageId'] === 'users')).toBe(true);
    expect(get).not.toHaveBeenCalled();
    await firstValueFrom(rest.get('/users'));
    expect(get).toHaveBeenCalledWith('/users');
  });
  it('narrows target selection by page, control type and area, including lookup search', async () => {
    const { catalog } = setup();
    const field = pagePermissionsLineConfig.columns.find((column) => column.id === 'targetKey')!;
    const query = lookupQuery(
      field.lookup!,
      { pageId: 'users', targetType: 'field', surface: 'header' },
      'mail',
    );
    const response = (await firstValueFrom(
      catalog.read(query.endpoint + '?$filter=' + encodeURIComponent(query.filter!))!,
    )) as { data: Record<string, unknown>[] };
    expect(response.data.map((row) => row['targetKey'])).toEqual(['email']);
    expect(lookupQuery(field.lookup!, { pageId: 'users' }).ready).toBe(false);
  });
  it('offers only supported areas for the chosen page/control and includes shared row commands', async () => {
    const { catalog } = setup();
    const areas = (await firstValueFrom(
      catalog.read(
        '/uiCatalog/areas?$filter=' +
          encodeURIComponent("pageId eq 'users' and targetType eq 'field'"),
      )!,
    )) as { data: Record<string, unknown>[] };
    expect(areas.data.map((row) => row['surface']).sort()).toEqual(['header', 'line']);
    expect(
      catalog
        .snapshot()
        .controls.some((row) => row['pageId'] === 'users' && row['targetKey'] === 'line-paste'),
    ).toBe(true);
  });

  it('uses published metadata to fill field API source identities without naming guesses', () => {
    const { catalog } = setup();
    vi.spyOn(TestBed.inject(EntityContractService), 'sourceName').mockReturnValue('users');
    const row = catalog
      .snapshot()
      .controls.find((row) => row['pageId'] === 'users' && row['targetKey'] === 'email');
    expect(row?.['apiSource']).toBe('users');
  });
  it('renders the catalogue through the existing list page and opens read-only control lines', async () => {
    TestBed.resetTestingModule();
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [PageConfigurationPage],
      providers: [
        provideRouter([]),
        ...providePlatformGovernance(),
        dataRestProvider,
        { provide: RestService, useValue: { get: () => of({ data: [] }) } },
      ],
    });
    TestBed.inject(SessionService).SuperAdmin = true;
    const fixture = TestBed.createComponent(PageConfigurationPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const page = fixture.debugElement.query(By.directive(ListPage)).componentInstance as ListPage;
    expect(fixture.nativeElement.textContent).toContain('Page Configuration');
    const users = page.rows.find((row) => (row as Record<string, unknown>)['pageId'] === 'users')!;
    expect(users).toBeTruthy();
    const host = TestBed.createComponent(RunModalHost);
    host.detectChanges();
    await page.openRecord(users);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    host.detectChanges();
    await host.whenStable();
    host.detectChanges();
    await vi.waitFor(() => {
      host.detectChanges();
      expect(host.debugElement.query(By.directive(DocumentLines))).not.toBeNull();
    });
    const lines = host.debugElement.query(By.directive(DocumentLines))
      .componentInstance as DocumentLines;
    expect(lines.rows.some((row) => row['targetKey'] === 'userName')).toBe(true);
    expect(lines.columns.every((column) => lines.isReadonly(column, lines.rows[0]))).toBe(true);
    host.destroy();
    fixture.destroy();
    localStorage.clear();
  });

  it('guards the catalogue and rejects nonexistent records', async () => {
    let { catalog } = setup(false);
    await expect(firstValueFrom(catalog.read('/uiCatalog/pages')!)).rejects.toThrow('read access');
    ({ catalog } = setup());
    await expect(firstValueFrom(catalog.read('/uiCatalog/pages/missing')!)).rejects.toThrow(
      'not found',
    );
  });
  it('supports search, ordering, paging and escaped literals without evaluating query code', () => {
    const rows = [
      { name: "O'Brien", count: 2 },
      { name: 'Beta', count: 3 },
      { name: 'Alpha', count: 1 },
    ];
    const result = queryCatalog(
      rows,
      new URLSearchParams({
        $filter: "(count ge 1) and (contains(name, 'a') or name eq 'O''Brien')",
        $orderby: 'count desc',
        $skip: '1',
        $top: '1',
      }),
    ) as { data: unknown[]; meta: { total: number; hasMore: boolean } };
    expect(result.data).toEqual([rows[0]]);
    expect(result.meta).toEqual({ total: 3, hasMore: true });
    expect(() => queryCatalog(rows, new URLSearchParams({ $filter: "eval('bad')" }))).toThrow();
  });
});
