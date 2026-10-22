import { By } from '@angular/platform-browser';
import { delay } from 'rxjs/operators';
import { ListPage } from './list-page/list-page';

import { RUNTIME_TIMEOUT_POLICY } from '../data/runtime-timeout-policy.token';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, it, expect, vi } from 'vitest';
import { firstValueFrom, of, throwError } from 'rxjs';
import { routes } from '../../app.routes';
import { runModalPageModules } from '../../features/run-modal-page-modules';
import { SessionService } from '../../core/services/session.service';
import { providePlatformGovernance } from '../../core/providers/platform-governance.provider';
import { DATA_REST_SERVICE, DataSourceService } from '../../platform/data/data-source.service';
import { lookupQuery } from '../../platform/data/lookup-dependencies';
import { fieldIsReadonly } from '../../platform/models/field-state';
import { ListPageConfig } from '../../platform/models/page-config.model';
import { HeaderConfig } from '../../platform/models/document-window-config.model';
import { DocumentHydrationOrchestratorService } from '../../platform/data/document-hydration-orchestrator.service';

const pageIds = [
  'vendors',
  'items',
  'units-of-measure',
  'payment-terms',
  'payment-methods',
  'currencies',
  'vendor-posting-groups',
  'general-business-posting-groups',
  'general-product-posting-groups',
  'vat-business-posting-groups',
  'vat-product-posting-groups',
  'inventory-posting-groups',
  'item-charges',
  'gl-accounts',
  'locations',
  'warehouse-zones',
  'warehouse-bins',
  'dimensions',
  'source-codes',
  'reason-codes',
  'general-posting-setup',
  'vat-posting-setup',
  'inventory-posting-setup',
  'inventory-setup',
  'general-ledger-setup',
  'source-code-setup',
  'accounting-periods',
  'dimension-combinations',
];
const registered = runModalPageModules.map((module) => Object.values(module)).flat();
const pages = pageIds.map(
  (id) => registered.find((value) => (value as ListPageConfig)?.pageId === id) as ListPageConfig,
);

describe('Purchase master configuration integration', () => {
  it('covers all 28 master surfaces with explicit capabilities and no duplicated FactBoxes', () => {
    expect(pages).toHaveLength(28);
    for (const page of pages) {
      expect(page).toBeDefined();
      expect(page.factBox?.enabled).toBe(false);
      expect(page.dataSource?.supportsDelete).toBeUndefined();
      expect(page.dataSource?.keyField).toBe('systemId');
      expect(page.dataSource?.endpoint).toMatch(/^\/[A-Za-z]+$/);
      expect(page.menu?.route).toBe('/' + page.pageId);
      expect(page.dataSurface?.columns.length).toBeGreaterThanOrEqual(4);
      const module = runModalPageModules.find((module) => Object.values(module).includes(page));
      const header = Object.entries(module!).find(([key]) => key.endsWith('HeaderConfig'))![1] as HeaderConfig;
      for (const field of header.sections.flatMap((section) => section.fields)) {
        expect(field.valueType ?? field.type).toBeDefined();
        if (field.type === 'lookup') {
          expect(field.valueType).toBe('guid');
          expect(field.lookup?.valueField).toBe('systemId');
          expect(field.lookup?.endpoint).not.toContain('API');
        }
      }
    }
  });

  it('places shared prerequisites in their owning modules and gives every master a distinct icon', () => {
    const moduleFor = (id: string) => pages.find((page) => page.pageId === id)!.menu!.module;
    expect(moduleFor('vendors')).toBe('Purchase');
    expect(moduleFor('gl-accounts')).toBe('Finance');
    expect(moduleFor('vat-posting-setup')).toBe('Finance');
    expect(moduleFor('items')).toBe('Inventory');
    expect(moduleFor('warehouse-bins')).toBe('Warehouse');
    expect(moduleFor('source-codes')).toBe('Administration');
    expect(new Set(pages.map((page) => page.menu?.icon)).size).toBe(28);
  });

  for (const id of pageIds)
    it('renders the shared master page ' + id, async () => {
      const route = routes.find((route) => route.path === '')!.children!.find((route) => route.path === id)!;
      const page = pages.find((page) => page.pageId === id)!;
      const get = vi.fn((_endpoint: string) =>
        of({
          data: page.dataSource?.singleton ? { systemId: 'fixture-id' } : [],
          meta: { total: 0 },
        }),
      );
      TestBed.configureTestingModule({
        imports: [route.component!],
        providers: [
          provideRouter([]),
          ...providePlatformGovernance(),
          {
            provide: DATA_REST_SERVICE,
            useValue: { get, post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() },
          },
        ],
      });
      TestBed.inject(SessionService).SuperAdmin = true;
      const fixture = TestBed.createComponent(route.component!);
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('app-list-page')).not.toBeNull();
      expect(get).toHaveBeenCalled();
      const runtime = fixture.debugElement.query(By.directive(ListPage)).componentInstance as ListPage;
      expect(runtime.listConfig.title).toBe(page.title);
      if (page.pageType === 'setup') {
        expect(fixture.nativeElement.querySelector('app-document-window')).not.toBeNull();
        expect(fixture.nativeElement.querySelector('app-list-grid')).toBeNull();
      } else {
        expect(page.pageType).toBe('card');
        expect(fixture.nativeElement.querySelector('app-list-grid')).not.toBeNull();
        expect(fixture.nativeElement.querySelector('app-document-window')).toBeNull();
      }
      expect(fixture.nativeElement.querySelector('app-fact-box')).toBeNull();
      fixture.destroy();
    });

  it('uses one parent-scoped path for nested value search and selected-value hydration', async () => {
    const id = '11111111-1111-4111-8111-111111111111';
    const lookup = {
      endpoint: '/dimensions/{dimensionId}/values',
      valueField: 'systemId',
      displayField: 'code',
      searchFields: ['code', 'name'],
      recordRead: 'collection' as const,
      dependsOn: [{ field: 'dimensionId', valueFrom: 'dimensionId', in: 'path' as const }],
    };
    expect(lookupQuery(lookup, {}).ready).toBe(false);
    expect(lookupQuery(lookup, { dimensionId: '../other' }).ready).toBe(false);
    const query = lookupQuery(lookup, { dimensionId: id }, 'PUR');
    expect(query.endpoint).toBe('/dimensions/' + id + '/values');
    expect(query.filter).toContain("contains(code, 'PUR')");
    const get = vi.fn((_endpoint: string) =>
      of({
        data: [{ systemId: 'value-id', code: 'PURCH', name: 'Purchasing' }],
        meta: { total: 1 },
      }),
    );
    TestBed.configureTestingModule({
      providers: [...providePlatformGovernance(), { provide: DATA_REST_SERVICE, useValue: { get } }],
    });
    const source = TestBed.inject(DataSourceService);
    const record = await firstValueFrom(source.loadLookup(lookup, 'value-id', { dimensionId: id }));
    expect(record).toMatchObject({ code: 'PURCH' });
    expect(get.mock.calls[0][0]).toContain('/dimensions/' + id + '/values?');
    expect(decodeURIComponent(get.mock.calls[0][0].replaceAll('+', ' '))).toContain("systemId eq 'value-id'");
    expect(get.mock.calls[0][0]).not.toContain('/value-id');
  });

  it('keeps an authorized master readable when a related resource is restricted', async () => {
    const get = vi.fn(() => throwError(() => ({ status: 403 })));
    TestBed.configureTestingModule({
      providers: [...providePlatformGovernance(), { provide: DATA_REST_SERVICE, useValue: { get } }],
    });
    const hydration = TestBed.inject(DocumentHydrationOrchestratorService);
    const rows = await hydration.resolveListLookups(
      [{ number: 'V001', paymentTermsId: 'private-id' }],
      [
        {
          key: 'paymentTermsId',
          label: 'Terms',
          lookup: { endpoint: '/paymentTerms', valueField: 'systemId', displayField: 'code' },
        },
      ],
    );
    expect(rows[0]['number']).toBe('V001');
    expect(rows[0]['paymentTermsId']).toBe('private-id');
    expect(rows[0]['__display_paymentTermsId']).toBe('Restricted');
    expect(rows[0]['__lookupRestricted_paymentTermsId']).toBe(true);
  });

  for (const slowRequest of [false, true])
    it(
      slowRequest
        ? 'retains the individual header request deadline'
        : 'allows healthy sequential hydration phases to exceed one request deadline in total',
      async () => {
        vi.useFakeTimers();
        let fixture: ReturnType<typeof TestBed.createComponent> | undefined;
        try {
          const route = routes
            .find((route) => route.path === '')!
            .children!.find((route) => route.path === 'units-of-measure')!;
          const get = vi.fn((url: string) =>
            url.includes('/saved-id')
              ? of({ data: { systemId: 'saved-id', code: 'EA', description: 'Each' } }).pipe(
                  delay(slowRequest ? 150 : 60),
                )
              : of({ data: [], meta: { total: 0 } }),
          );
          TestBed.configureTestingModule({
            imports: [route.component!],
            providers: [
              provideRouter([]),
              ...providePlatformGovernance(),
              { provide: DATA_REST_SERVICE, useValue: { get } },
              {
                provide: RUNTIME_TIMEOUT_POLICY,
                useValue: { hydrationTimeoutMs: 100, requestTimeoutMs: 300 },
              },
            ],
          });
          TestBed.inject(SessionService).SuperAdmin = true;
          vi.spyOn(TestBed.inject(DocumentHydrationOrchestratorService), 'resolveHeaderLookups').mockImplementation(
            (record) => new Promise((resolve) => setTimeout(() => resolve(record), 60)),
          );
          fixture = TestBed.createComponent(route.component!);
          fixture.detectChanges();
          const page = fixture.debugElement.query(By.directive(ListPage)).componentInstance as ListPage;
          page.documentOnly = true;
          page.openRecord({ systemId: 'saved-id', code: 'EA', description: 'Each' });
          await vi.advanceTimersByTimeAsync(slowRequest ? 110 : 125);
          fixture.detectChanges();
          if (slowRequest) expect(fixture.nativeElement.textContent).toContain('Timeout has occurred');
          else {
            expect(fixture.nativeElement.textContent).not.toContain('Timeout has occurred');
            expect(fixture.nativeElement.textContent).toContain('Ready');
            expect(
              fixture.nativeElement.querySelector('input[value="EA"]') ?? fixture.nativeElement.textContent,
            ).toBeTruthy();
          }
        } finally {
          fixture?.destroy();
          vi.useRealTimers();
        }
      },
    );

  it('batches only selected relationship IDs and reuses repeated values across rows', async () => {
    const get = vi.fn(() => of({ data: [], meta: { total: 0 } }));
    TestBed.configureTestingModule({
      providers: [...providePlatformGovernance(), { provide: DATA_REST_SERVICE, useValue: { get } }],
    });
    const fields = [
      {
        key: 'paymentTermsId',
        label: 'Terms',
        lookup: {
          endpoint: '/paymentTerms',
          valueField: 'systemId',
          displayField: 'code',
        },
      },
    ];
    const rows = Array.from({ length: 200 }, (_, index) => ({
      paymentTermsId: 'term-' + (index % 85),
    }));
    await TestBed.inject(DocumentHydrationOrchestratorService).resolveListLookups(rows, fields);
    expect(get).toHaveBeenCalledTimes(3);
    const requestedIds: string[] = [];
    for (const [url] of get.mock.calls as unknown as [string][]) {
      const query = new URL(url, 'http://localhost').searchParams;
      const ids = [...(query.get('$filter') ?? '').matchAll(/systemId eq '([^']+)'/g)].map((match) => match[1]);
      expect(ids.length).toBeGreaterThan(0);
      expect(ids.length).toBeLessThanOrEqual(40);
      expect(Number(query.get('$top'))).toBe(ids.length);
      requestedIds.push(...ids);
    }
    expect(new Set(requestedIds).size).toBe(85);
    expect(requestedIds.length).toBe(85);
  });

  it('hydrates human-readable relationship captions without changing stored IDs or sending writes', async () => {
    const get = vi.fn((_endpoint: string) =>
      of({
        data: [{ systemId: 'term-id', code: 'NET30', description: '30 days' }],
        meta: { total: 1 },
      }),
    );
    const post = vi.fn();
    TestBed.configureTestingModule({
      providers: [...providePlatformGovernance(), { provide: DATA_REST_SERVICE, useValue: { get, post } }],
    });
    const hydration = TestBed.inject(DocumentHydrationOrchestratorService);
    const fields = [
      {
        key: 'paymentTermsId',
        label: 'Payment Terms',
        valueType: 'guid' as const,
        displayFormat: '[code] — [description]',
        lookup: { endpoint: '/paymentTerms', valueField: 'systemId', displayField: 'code' },
      },
    ];
    const rows = await hydration.resolveListLookups([{ systemId: 'vendor-id', paymentTermsId: 'term-id' }], fields);
    expect(rows[0]['paymentTermsId']).toBe('term-id');
    expect(rows[0]['__display_paymentTermsId']).toBe('NET30 — 30 days');
    expect(post).not.toHaveBeenCalled();
    expect(fieldIsReadonly({ readonlyAfterCreate: true }, { systemId: 'saved' })).toBe(true);
    expect(fieldIsReadonly({ readonlyAfterCreate: true }, {})).toBe(false);
  });
});
