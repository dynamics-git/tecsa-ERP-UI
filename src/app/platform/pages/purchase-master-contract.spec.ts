import { itemsHeaderConfig } from '../../features/purchase-masters/items/items.config';
import { By } from '@angular/platform-browser';
import { delay, finalize } from 'rxjs/operators';
import { ListPage } from './list-page/list-page';

import { RUNTIME_TIMEOUT_POLICY } from '../data/runtime-timeout-policy.token';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, it, expect, vi } from 'vitest';
import { firstValueFrom, of, throwError, Subject } from 'rxjs';
import { routes } from '../../app.routes';
import { featurePageModules } from '../../features/feature-pages.generated';
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
const registered = featurePageModules.map((module) => Object.values(module)).flat();
const pages = pageIds.map(
  (id) => registered.find((value) => (value as ListPageConfig)?.pageId === id) as ListPageConfig,
);

describe('Purchase master configuration integration', () => {
  it('covers all 28 master surfaces with explicit capabilities and no duplicated FactBoxes', () => {
    expect(pages).toHaveLength(28);
    for (const page of pages) {
      expect(page).toBeDefined();
      expect(page.factBox?.enabled).toBe(true);
      expect(page.dataSource?.supportsDelete).toBeUndefined();
      expect(page.dataSource?.keyField).toBe('systemId');
      expect(page.dataSource?.endpoint).toMatch(/^\/[A-Za-z]+$/);
      expect(page.menu?.route).toBe('/' + page.pageId);
      expect(page.dataSurface?.columns.length).toBeGreaterThanOrEqual(4);
      const module = featurePageModules.find((module) => Object.values(module).includes(page));
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

  it('preserves each page’s declared FactBox policy and enables it for the business masters', () => {
    const allPages = registered.filter(value => value && typeof value === 'object' && 'pageId' in value && 'dataSource' in value) as ListPageConfig[];
    expect(allPages.length).toBeGreaterThanOrEqual(41);
    expect(new Set(allPages.map(page => page.pageType))).toEqual(new Set(['card', 'document', 'setup', 'worksheet']));
    for (const page of allPages) expect(typeof page.factBox?.enabled, page.pageId).toBe('boolean');
    for (const page of pages) expect(page.factBox?.enabled, page.pageId).toBe(true);
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
      expect(fixture.nativeElement.querySelectorAll('app-fact-box').length).toBe(page.pageType === 'setup' ? 1 : 0);
      expect(fixture.nativeElement.querySelectorAll('app-list-fact-box').length).toBe(page.pageType === 'setup' ? 0 : 1);
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

  it('opens a complete list item immediately without another header or selected-UOM request or a document loader',async()=>{
    const route=routes.find(route=>route.path==='')!.children!.find(route=>route.path==='items')!;
    const item={...Object.fromEntries(itemsHeaderConfig.sections.flatMap(section=>section.fields).map(field=>[field.key,null])),systemId:'item-reused',number:'REUSE',description:'Reuse',baseUnitOfMeasureId:'unit-reused',systemRowVersion:1};
    const get=vi.fn((url:string)=>url.endsWith('/apiCapabilities') ? of({data:{contractVersion:'1.0',entities:{},endpoints:[]}}) : url.startsWith('/items?') ? of({data:[item],meta:{total:1,recordShape:'complete'}}) : url.startsWith('/unitsOfMeasure?') ? of({data:[{systemId:'unit-reused',code:'EA',description:'Each',systemRowVersion:1}],meta:{total:1,recordShape:'complete'}}) : of({data:[],meta:{total:0}}));
    TestBed.configureTestingModule({imports:[route.component!],providers:[provideRouter([]),...providePlatformGovernance(),{provide:DATA_REST_SERVICE,useValue:{get}}]});
    TestBed.inject(SessionService).SuperAdmin=true;
    const fixture=TestBed.createComponent(route.component!);fixture.detectChanges();
    const page=fixture.debugElement.query(By.directive(ListPage)).componentInstance as ListPage;
    await vi.waitFor(()=>expect((page.rows[0] as any)?.__display_baseUnitOfMeasureId).toBe('EA — Each'));
    get.mockClear();page.openRecord(page.rows[0]);
    await fixture.whenStable();fixture.detectChanges();
    let card!:ListPage;
    await vi.waitFor(()=>{
      fixture.detectChanges();
      card=fixture.debugElement.queryAll(By.directive(ListPage)).map(element=>element.componentInstance as ListPage).find(runtime=>runtime.documentOnly)!;
      expect(card?.inlineDocumentWindowConfig?.headerData?.['description']).toBe('Reuse');
    });
    expect(card.popupLoading).toBe(false);expect(get.mock.calls.filter(([url])=>!url.endsWith('/apiCapabilities'))).toHaveLength(0);
    expect(fixture.nativeElement.textContent).not.toContain('Loading document...');
    expect(fixture.debugElement.query(By.directive(ListPage))).toBeTruthy();fixture.destroy();
  });

  it('reuses all selected card fields across close/open and row changes beyond the HTTP cache TTL',async()=>{
    const route=routes.find(route=>route.path==='')!.children!.find(route=>route.path==='items')!;
    const empty=Object.fromEntries(itemsHeaderConfig.sections.flatMap(section=>section.fields).map(field=>[field.key,null]));
    const rows=['a','b'].map(id=>({...empty,systemId:id,number:id,description:id,baseUnitOfMeasureId:'unit',generalProductPostingGroupId:'group',systemRowVersion:1}));
    const get=vi.fn((url:string)=>url.endsWith('/apiCapabilities') ? of({data:{contractVersion:'1.0',entities:{},endpoints:[]}}) : url.startsWith('/items?') ? of({data:rows,meta:{total:2,recordShape:'complete'}})
      : url.startsWith('/unitsOfMeasure?') ? of({data:[{systemId:'unit',code:'EA',description:'Each',systemRowVersion:1}],meta:{recordShape:'complete'}})
      : url.startsWith('/generalProductPostingGroups?') ? of({data:[{systemId:'group',code:'TRADE',description:'Trade',systemRowVersion:1}],meta:{recordShape:'complete'}})
      : of({data:[],meta:{total:0}}));
    TestBed.configureTestingModule({imports:[route.component!],providers:[provideRouter([]),...providePlatformGovernance(),{provide:DATA_REST_SERVICE,useValue:{get}}]});
    TestBed.inject(SessionService).SuperAdmin=true;
    const fixture=TestBed.createComponent(route.component!);fixture.detectChanges();
    const page=fixture.debugElement.query(By.directive(ListPage)).componentInstance as ListPage;
    await vi.waitFor(()=>expect(page.rows).toHaveLength(2));
    const now=vi.spyOn(Date,'now');const later=Date.now()+120000;now.mockReturnValue(later);get.mockClear();
    try {
      for(const index of [0,1,0]){
        page.openRecord(page.rows[index]);await fixture.whenStable();fixture.detectChanges();
        let card!:ListPage;
        await vi.waitFor(()=>{fixture.detectChanges();card=fixture.debugElement.queryAll(By.directive(ListPage)).map(e=>e.componentInstance as ListPage).find(p=>p.documentOnly)!;expect(card?.inlineDocumentWindowConfig?.contentReady).toBe(true);});
        expect(card.inlineDocumentWindowConfig!.headerData!['__display_generalProductPostingGroupId']).toBe('TRADE — Trade');
        expect(card.popupLoading).toBe(false);expect(get.mock.calls.filter(([url])=>!url.endsWith('/apiCapabilities'))).toHaveLength(0);
        await card.requestClose();await fixture.whenStable();fixture.detectChanges();
      }
      expect(get.mock.calls.filter(([url])=>!url.endsWith('/apiCapabilities'))).toHaveLength(0);
    }finally{now.mockRestore();fixture.destroy();}
  });

  it('keeps a cold header visibly loading until its selected values are prepared', async () => {
    const route = routes.find(route => route.path === '')!.children!.find(route => route.path === 'items')!;
    const caption = new Subject<unknown>();
    const get = vi.fn((url: string) => url.includes('/items/saved-item')
      ? of({data:{systemId:'saved-item',number:'ITEM-1',description:'Item',baseUnitOfMeasureId:'saved-unit'}})
      : url.startsWith('/unitsOfMeasure?') ? caption : of({data:[],meta:{total:0}}));
    TestBed.configureTestingModule({imports:[route.component!],providers:[provideRouter([]),...providePlatformGovernance(),{provide:DATA_REST_SERVICE,useValue:{get}}]});
    TestBed.inject(SessionService).SuperAdmin=true;
    const fixture=TestBed.createComponent(route.component!);fixture.detectChanges();
    const page=fixture.debugElement.query(By.directive(ListPage)).componentInstance as ListPage;
    page.documentOnly=true;page.openRecord({systemId:'saved-item',number:'ITEM-1'});
    await vi.waitFor(()=>expect(caption.observers.length).toBeGreaterThan(0));
    fixture.detectChanges();expect(page.inlineDocumentWindowConfig?.contentReady).toBe(false);expect(page.popupLoading).toBe(true);
    caption.next({data:[{systemId:'saved-unit',code:'EA',description:'Each'}],meta:{total:1}});caption.complete();
    await vi.waitFor(()=>{fixture.detectChanges();expect(page.inlineDocumentWindowConfig?.contentReady).toBe(true);expect(page.popupLoading).toBe(false);});
    expect(fixture.nativeElement.querySelector('app-dynamic-form').textContent).toBeTruthy();
    fixture.destroy();
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

  it('caps caption batches at six concurrent requests and 40 IDs per request', async () => {
    let active=0,peak=0;
    const pending:Subject<unknown>[]=[];
    const get=vi.fn(()=>{active++;peak=Math.max(peak,active);const request=new Subject<unknown>();pending.push(request);return request.pipe(finalize(()=>active--));});
    TestBed.configureTestingModule({providers:[...providePlatformGovernance(),{provide:DATA_REST_SERVICE,useValue:{get}}]});
    const fields=[{key:'unit',label:'Unit',lookup:{endpoint:'/unitsOfMeasure',valueField:'systemId',displayField:'code'}}];
    const rows=Array.from({length:250},(_,index)=>({unit:'unit-'+index}));
    const result=TestBed.inject(DocumentHydrationOrchestratorService).resolveListLookups(rows,fields);
    expect(get).toHaveBeenCalledTimes(6);
    pending.slice().forEach(request=>{request.next({data:[]});request.complete();});
    await vi.waitFor(()=>expect(get).toHaveBeenCalledTimes(7));
    pending[6].next({data:[]});pending[6].complete();await result;
    expect(peak).toBe(6);expect(active).toBe(0);
    for(const [url] of get.mock.calls as unknown as [string][]){
      const params=new URL(url,'http://fixture').searchParams;
      expect(Number(params.get('$top'))).toBeLessThanOrEqual(40);expect(params.get('$count')).toBe('false');
    }
  });

  it('prepares selected header values before publishing a new list-page snapshot', async () => {
    const route=routes.find(route=>route.path==='')!.children!.find(route=>route.path==='items')!;
    const caption=new Subject<unknown>();
    const get=vi.fn((url:string)=>url.startsWith('/unitsOfMeasure?') ? caption : of({data:[{systemId:'item-1',number:'ITEM-1',description:'Item',baseUnitOfMeasureId:'unit-1'}],meta:{total:1}}));
    TestBed.configureTestingModule({imports:[route.component!],providers:[provideRouter([]),...providePlatformGovernance(),{provide:DATA_REST_SERVICE,useValue:{get}}]});
    TestBed.inject(SessionService).SuperAdmin=true;
    const fixture=TestBed.createComponent(route.component!);fixture.detectChanges();
    const page=fixture.debugElement.query(By.directive(ListPage)).componentInstance as ListPage;
    await vi.waitFor(()=>expect(caption.observers.length).toBeGreaterThan(0));
    expect(page.rows).toHaveLength(0);expect(page.loading).toBe(true);
    caption.next({data:[{systemId:'unit-1',code:'EA',description:'Each'}],meta:{total:1}});caption.complete();
    await vi.waitFor(()=>expect((page.rows[0] as any)?.__display_baseUnitOfMeasureId).toBe('EA — Each'));
    fixture.destroy();
  });

  it('reuses an already loaded empty child collection without a request or a loading notification',async()=>{
    const get=vi.fn(()=>of({data:[],meta:{total:0}}));
    TestBed.configureTestingModule({providers:[...providePlatformGovernance(),{provide:DATA_REST_SERVICE,useValue:{get}}]});
    const hydrate=TestBed.inject(DocumentHydrationOrchestratorService),loading=vi.fn();
    const source={endpoint:'/lines',navigation:{parentEndpoint:'/items',parentIdFields:['systemId'],childCollection:'lines'}};
    await hydrate.loadLineRowsForHeader(source,{systemId:'item-1'},{onRequest:loading});
    expect(get).toHaveBeenCalledTimes(1);expect(loading).toHaveBeenCalledOnce();
    loading.mockClear();
    expect(await hydrate.loadLineRowsForHeader(source,{systemId:'item-1'},{onRequest:loading})).toEqual([]);
    expect(get).toHaveBeenCalledTimes(1);expect(loading).not.toHaveBeenCalled();
  });

  it('retains unchanged empty line snapshots past the HTTP TTL and still honors explicit invalidation',async()=>{
    const get=vi.fn(()=>of({data:[],meta:{total:0}}));
    TestBed.configureTestingModule({providers:[...providePlatformGovernance(),{provide:DATA_REST_SERVICE,useValue:{get}}]});
    const hydrate=TestBed.inject(DocumentHydrationOrchestratorService),source=TestBed.inject(DataSourceService),loading=vi.fn();
    const config={endpoint:'/lines',navigation:{parentEndpoint:'/items',parentIdFields:['systemId'],childCollection:'lines'}};
    await hydrate.loadLineRowsForHeader(config,{systemId:'item-1'},{onRequest:loading,reuseSnapshot:true});
    const now=vi.spyOn(Date,'now'),later=Date.now()+120000;now.mockReturnValue(later);loading.mockClear();
    try{
      expect(await hydrate.loadLineRowsForHeader(config,{systemId:'item-1'},{onRequest:loading,reuseSnapshot:true})).toEqual([]);
      expect(get).toHaveBeenCalledTimes(1);expect(loading).not.toHaveBeenCalled();
      source.invalidateReadCache();await hydrate.loadLineRowsForHeader(config,{systemId:'item-1'},{onRequest:loading,reuseSnapshot:true});
      expect(get).toHaveBeenCalledTimes(2);expect(loading).toHaveBeenCalledOnce();
    }finally{now.mockRestore();}
  });

  it('keeps records available with an explicit caption error when a lookup request fails',async()=>{
    TestBed.configureTestingModule({providers:[...providePlatformGovernance(),{provide:DATA_REST_SERVICE,useValue:{get:()=>throwError(()=>({status:503}))}}]});
    const rows=await TestBed.inject(DocumentHydrationOrchestratorService).resolveListLookups([{unit:'unit-1'}],[{key:'unit',label:'Unit',lookup:{endpoint:'/unitsOfMeasure',valueField:'systemId',displayField:'code'}}]);
    expect(rows[0]['unit']).toBe('unit-1');expect(rows[0]['__display_unit']).toBe('Unable to load selected value');
  });

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
