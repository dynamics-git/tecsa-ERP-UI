import {TestBed} from '@angular/core/testing';
import {provideRouter} from '@angular/router';
import {firstValueFrom, of, Subject, filter} from 'rxjs';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {DataSourceService, DATA_REST_SERVICE} from './data-source.service';
import {EntityContractService} from './entity-contract.service';
import {SessionService} from '../../core/services/session.service';
import {providePlatformGovernance} from '../../core/providers/platform-governance.provider';
import {PurchaseRequisitionPage} from '../../features/purchasing/purchase-requisition/purchase-requisition';
import {purchaseRequisitionListConfig, purchaseRequisitionLineConfig} from '../../features/purchasing/purchase-requisition/purchase-requisition.config';
import {ListPage} from '../pages/list-page/list-page';
import {DocumentLines} from '../document/document-lines/document-lines';
import {By} from '@angular/platform-browser';
import {prPageContractFixture, prLineContractFixture} from '../../testing/pr-reference.fixture';
import {RunModalService} from '../run-modal/run-modal.service';
import {RunModalStackService} from '../run-modal/run-modal-stack.service';
import {ActionDispatcherService} from '../../shared/ui/action-dispatcher.service';

describe('Page Object to existing shared PR Core integration', () => {
  let get: ReturnType<typeof vi.fn>, post: ReturnType<typeof vi.fn>, patch: ReturnType<typeof vi.fn>;
  const header = {systemId:'header-uuid',number:'PR-OBJECT',documentType:'purchase_requisition',status:'open',
    requestDate:'2026-11-06',purpose:'Reference',systemRowVersion:1};
  beforeEach(() => {
    localStorage.clear();
    get=vi.fn((url:string) => {
      if(url.includes('/fieldContracts?objectId='))return of(structuredClone(prPageContractFixture));
      if(url.includes('/fieldContracts?path='))return of(structuredClone(prLineContractFixture));
      if(url.startsWith('/purchaseRequisitions/'))return of({data:header});
      if(url.startsWith('/purchaseRequisitions'))return of({data:[header],meta:{total:1}});
      return of({data:[],meta:{total:0}});
    });
    post=vi.fn((_url:string,payload:Record<string,unknown>)=>of({data:{...header,...payload}}));
    patch=vi.fn((_url:string,payload:Record<string,unknown>)=>of({data:{...header,...payload,systemRowVersion:2}}));
    TestBed.configureTestingModule({imports:[PurchaseRequisitionPage],providers:[provideRouter([]),...providePlatformGovernance(),
      {provide:DATA_REST_SERVICE,useValue:{get,post,patch,delete:()=>of(null)}}]});
    const session=TestBed.inject(SessionService);session.Company='company-a';session.SuperAdmin=true;
  });
  afterEach(()=>{TestBed.resetTestingModule();localStorage.clear();});

  it('shows Page identity and inert commands while Object metadata is pending', async () => {
    const pending = new Subject<unknown>();
    const originalGet = get.getMockImplementation()!;
    get.mockImplementation((url: string) =>
      url.includes('/fieldContracts?objectId=') ? pending : originalGet(url));
    const dispatcher = TestBed.inject(ActionDispatcherService);
    const context = firstValueFrom(dispatcher.pageContext$.pipe(filter(value => !!value?.title)));
    const fixture = TestBed.createComponent(PurchaseRequisitionPage);
    fixture.detectChanges();
    expect((await context)?.title).toBe('Purchase Requisition');
    expect((await firstValueFrom(dispatcher.pageContext$))?.pageId).toBeUndefined();
    const pendingCommands = await firstValueFrom(dispatcher.pageCommands$);
    expect(pendingCommands.length).toBeGreaterThan(0);
    expect(pendingCommands.every(command => command.disabled)).toBe(true);
    expect(post).not.toHaveBeenCalled();
    expect(patch).not.toHaveBeenCalled();
    pending.next(structuredClone(prPageContractFixture));
    pending.complete();
    await fixture.whenStable();
    await vi.waitFor(() => expect(fixture.debugElement.query(By.directive(ListPage)).componentInstance.rows).toHaveLength(1));
    expect((await firstValueFrom(dispatcher.pageContext$))?.pageId).toBe('purchase-requisition');
    fixture.destroy();
  });

  it('resolves only the header source and retains the Angular composite link', async () => {
    const data=TestBed.inject(DataSourceService);
    const first=await data.preparePage(purchaseRequisitionListConfig,purchaseRequisitionLineConfig);
    const second=await data.preparePage(purchaseRequisitionListConfig,purchaseRequisitionLineConfig);
    expect(first.config.dataSource).toMatchObject({endpoint:'/purchaseRequisitions',keyField:'systemId',headerPKProp:'number'});
    expect(first.lineConfig!.dataSource).toMatchObject({endpoint:'/purchaseRequisitionLines',headerPKProp:'number',lineFKProp:'documentNumber',parentFieldMap:{documentType:'documentType'}});
    expect(second).toEqual(first);
    expect(await firstValueFrom(data.loadSourceContract(first.config.dataSource))).toBe(true);
    expect(await firstValueFrom(data.loadSourceContract(first.lineConfig!.dataSource))).toBe(true);
    expect(get).toHaveBeenCalledTimes(2);
    expect(get.mock.calls[0][0]).toContain('/fieldContracts?objectId=10000');
  });

  it('renders the real thin component, infers Header/List/FactBox types and autosaves with record UUID', async () => {
    const fixture=TestBed.createComponent(PurchaseRequisitionPage);
    fixture.detectChanges();await fixture.whenStable();fixture.detectChanges();
    const page=fixture.debugElement.query(By.directive(ListPage)).componentInstance as ListPage;
    await vi.waitFor(()=>expect(page.rows).toHaveLength(1));
    expect(page.headerConfig.sections.flatMap(section=>section.fields).find(field=>field.key==='purpose')).toMatchObject({type:'textarea',validation:{maxLength:250}});
    expect(page.lineConfig!.columns.find(column=>column.id==='description')).toMatchObject({type:'text',validation:{maxLength:100}});
    expect(page.listConfig.dataSurface!.columns.find(column=>column.field==='requestDate')?.type).toBe('date');
    expect(page.listConfig.factBox!.sections?.map(section => section.id)).toEqual(['requisition','amounts','audit']);
    expect(page.headerConfig.sections.flatMap(section=>section.fields).find(field=>field.key==='requestDate')?.valueType).toBe('date');
    await page.openRecord(header);fixture.detectChanges();await fixture.whenStable();
    const modal=TestBed.inject(RunModalStackService);
    let popups:any[]=[];const subscription=modal.stack$.subscribe(value=>popups=value);
    await vi.waitFor(()=>expect(popups.length, TestBed.inject(RunModalService).getLastOpenFailureReason()).toBeGreaterThan(0));
    expect(popups.at(-1).data.runtimePage.module.purchaseRequisitionLineConfig.dataSource.parentFieldMap).toEqual({documentType:'documentType'});
    subscription.unsubscribe();fixture.destroy();
  });

  it('runs normal header CRUD through the resolved declaration without publishing Object IDs as record data', async () => {
    const fixture=TestBed.createComponent(PurchaseRequisitionPage);
    fixture.componentRef.setInput('runModal',{record:header,close:()=>undefined});
    fixture.detectChanges();await fixture.whenStable();fixture.detectChanges();
    const page=fixture.debugElement.query(By.directive(ListPage)).componentInstance as ListPage;
    await vi.waitFor(()=>expect(page.inlineDocumentWindowConfig?.contentReady).toBe(true));
    page.handleInlineAction({actionKey:'header:changed',payload:{fieldKey:'purpose',value:'Changed',previousValue:'Reference'}});
    await vi.waitFor(()=>expect(patch).toHaveBeenCalledOnce());
    expect(patch.mock.calls[0][0]).toBe('/purchaseRequisitions/header-uuid');
    expect(patch.mock.calls[0][1]).toEqual({purpose:'Changed'});
    expect(post).not.toHaveBeenCalled();fixture.destroy();
  });

  it('rejects wrong Object identity but allows unrelated sources and Page-specific links', async () => {
    const contracts=TestBed.inject(EntityContractService);
    expect(contracts.acceptPageMetadata(prPageContractFixture,999)).toBe(false);
    await TestBed.inject(DataSourceService).preparePage(purchaseRequisitionListConfig,purchaseRequisitionLineConfig);
    const alternate={...purchaseRequisitionLineConfig,dataSource:{endpoint:'/purchaseOrderLines',
      headerPKProp:'number',lineFKProp:'externalReference',parentFieldMap:{sourceType:'documentType'},
      defaultFilter:"status eq 'open'"}};
    const resolved=contracts.resolvePage(purchaseRequisitionListConfig,alternate);
    expect(resolved.lineConfig?.dataSource).toMatchObject(alternate.dataSource);
    expect(resolved.lineConfig?.dataSource).not.toHaveProperty('relationship');
    expect(contracts.resolvePage(purchaseRequisitionListConfig).lineConfig).toBeUndefined();
    const linesOnly=contracts.resolvePage(purchaseRequisitionListConfig,{...alternate,dataSource:{
      endpoint:'/comments',headerPKProp:'systemId',lineFKProp:'recordId',parentFixedFields:{tableName:'purchase_requisitions'},
    }});
    expect(linesOnly.lineConfig?.dataSource.lineFKProp).toBe('recordId');
  });

  it('does not create default-only rows and creates a description-first draft with resolved business parent keys', async () => {
    post.mockImplementation((_url:string,payload:Record<string,unknown>)=>of({data:{...payload,systemId:'line-uuid',lineNo:10000,systemRowVersion:1}}));
    const fixture=TestBed.createComponent(PurchaseRequisitionPage);
    fixture.componentRef.setInput('runModal',{record:header,close:()=>undefined});
    fixture.detectChanges();await fixture.whenStable();fixture.detectChanges();
    const page=fixture.debugElement.query(By.directive(ListPage)).componentInstance as ListPage;
    await vi.waitFor(()=>expect(page.inlineDocumentWindowConfig?.contentReady).toBe(true));
    fixture.detectChanges();
    expect(post).not.toHaveBeenCalled();expect(page.hasUnsavedChanges).toBe(false);
    const grid=fixture.debugElement.query(By.directive(DocumentLines)).componentInstance as DocumentLines;
    const row=grid.rows.find(row=>row['__entryPlaceholder'])!;
    grid.updateCellValue(grid.columns.find(column=>column.id==='description')!,row,'Draft before selecting a master');
    await vi.waitFor(()=>expect(post).toHaveBeenCalledOnce());
    expect(post.mock.calls[0][0]).toBe('/purchaseRequisitionLines');
    expect(post.mock.calls[0][1]).toMatchObject({documentNumber:'PR-OBJECT',documentType:'purchase_requisition',description:'Draft before selecting a master'});
    expect(post.mock.calls[0][1]).not.toHaveProperty('objectId');
    expect(post.mock.calls[0][1]).not.toHaveProperty('systemId');
    fixture.destroy();
  });

  it('does not accept an Object response after Company changes and does not issue CRUD on resolution failure', async () => {
    const pending=new Subject<unknown>();get.mockReturnValue(pending);
    const data=TestBed.inject(DataSourceService);
    const response=firstValueFrom(data.loadPageContract(10000));
    TestBed.inject(SessionService).Company='company-b';
    pending.next(prPageContractFixture);pending.complete();expect(await response).toBe(false);
    expect(post).not.toHaveBeenCalled();expect(patch).not.toHaveBeenCalled();
  });
});
