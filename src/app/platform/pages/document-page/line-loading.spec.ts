import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { By } from '@angular/platform-browser';
import { firstValueFrom, of, Subject } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { providePlatformGovernance } from '../../../core/providers/platform-governance.provider';
import { SessionService } from '../../../core/services/session.service';
import {
  noSeriesHeaderConfig,
  noSeriesLineConfig,
  noSeriesListConfig,
} from '../../../features/administration/no-series/no-series.config';
import {
  purchaseRequisitionHeaderConfig,
  purchaseRequisitionLineConfig,
  purchaseRequisitionListConfig,
} from '../../../features/purchasing/purchase-requisition/purchase-requisition.config';
import { DATA_REST_SERVICE, DataSourceService } from '../../data/data-source.service';
import { DocumentLines } from '../../document/document-lines/document-lines';
import { ListPage } from '../list-page/list-page';
import { usersHeaderConfig, usersLineConfig, usersListConfig } from '../../../features/administration/users/users.config';

describe('Document line layout while the initial request is pending', () => {
  afterEach(() => TestBed.resetTestingModule());

  const pages = [
    {
      name: 'No. Series',
      list: noSeriesListConfig,
      header: noSeriesHeaderConfig,
      line: noSeriesLineConfig,
      record: { systemId: 'series-1', systemRowVersion: 1, code: 'PURCH-ORD', description: 'Orders' },
      isLines: (endpoint: string) => endpoint.startsWith('/noSeriesLines?'),
      savedLine: { systemId: 'line-1', systemRowVersion: 1, lineNo: 10000, startingNo: 'PO00001' },
    },
    {
      name: 'Purchase Requisition',
      list: purchaseRequisitionListConfig,
      header: purchaseRequisitionHeaderConfig,
      line: purchaseRequisitionLineConfig,
      record: {
        systemId: 'pr-1', systemRowVersion: 1, number: 'PR00001',
        documentType: 'purchase_requisition', status: 'open', requestDate: '2026-10-30',
      },
      isLines: (endpoint: string) => endpoint.startsWith('/purchaseRequisitionLines'),
      savedLine: {
        systemId: 'line-1', systemRowVersion: 1, lineNo: 10000,
        lineType: 'item', description: 'Saved line', quantity: '1', estimatedUnitCost: '0',
      },
    },
  ];

  it('requests saved names directly without first loading unrelated choice pages', async () => {
    const captions = new Subject<unknown>();
    const record = {systemId: 'user-1', systemRowVersion: 1, userName: 'ayan', name: 'Ayan Rahman', email: 'ayan@tecsa.com.my', isActive: true, lastLoginAt: null};
    const assignment = {systemId: 'assignment-1', systemRowVersion: 1, userName: 'ayan', permissionSetCode: 'REQ-ENTRY', companyCode: 'TECSA', isActive: true};
    const get = vi.fn((endpoint: string) => {
      if (endpoint.startsWith('/userPermissionSets')) return of({data: [assignment], meta: {total: 1}});
      if (endpoint.startsWith('/permissionSets')) return captions;
      if (endpoint.startsWith('/permissionCompanies')) return of({data:[{code:'TECSA',name:'TecSA'}],meta:{total:1}});
      return endpoint.startsWith('/users?') ? of({data: [record], meta: {total: 1, recordShape: 'complete'}}) : of({data: record});
    });
    const patch = vi.fn();
    TestBed.configureTestingModule({imports: [ListPage], providers: [provideRouter([]), ...providePlatformGovernance(),
      {provide: DATA_REST_SERVICE, useValue: {get, patch}}]});
    TestBed.inject(SessionService).SuperAdmin = true;
    await firstValueFrom(TestBed.inject(DataSourceService).loadList(usersListConfig.dataSource, {useCache: true}));
    const fixture = TestBed.createComponent(ListPage);
    fixture.componentRef.setInput('documentOnly', true);
    fixture.componentRef.setInput('initialRecord', record);
    fixture.componentRef.setInput('listConfig', usersListConfig);
    fixture.componentRef.setInput('headerConfig', usersHeaderConfig);
    fixture.componentRef.setInput('lineConfig', usersLineConfig);
    fixture.detectChanges();
    const page = fixture.componentInstance;
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(captions.observers.length).toBeGreaterThan(0);
    });
    expect(page.inlineDocumentWindowConfig?.contentReady).toBe(true);
    expect(page.popupLoading).toBe(false);
    expect(fixture.nativeElement.querySelector('.entry-complete-skeleton')).toBeNull();
    expect(fixture.nativeElement.querySelector('.entry-work').style.visibility).not.toBe('hidden');
    expect(page.inlineDocumentWindowConfig?.lineRows?.some(row => row['systemId'] === assignment.systemId)).toBe(true);
    expect(get.mock.calls.some(([endpoint]) => endpoint === '/users/user-1')).toBe(false);
    expect(patch).not.toHaveBeenCalled();

    captions.next({data: [{code:'REQ-ENTRY',name:'Requisition Entry'}], meta: {total: 1}});
    captions.complete();
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(page.inlineDocumentWindowConfig?.contentReady).toBe(true);
      expect(page.inlineDocumentWindowConfig?.lineRows?.some(row => row['systemId'] === assignment.systemId)).toBe(true);
      expect(page.inlineDocumentWindowConfig?.lineRows?.find(row => row['systemId'] === assignment.systemId)).toMatchObject({permissionSetName:'Requisition Entry'});
    });
    const row = page.inlineDocumentWindowConfig!.lineRows!.find(row => row['systemId'] === assignment.systemId)!;
    const editor = fixture.debugElement.query(By.directive(DocumentLines)).componentInstance as DocumentLines;
    expect(editor.disabled).toBe(false);
    expect(editor.lookupDisplay(usersLineConfig.columns[0], row)).toBe('REQ-ENTRY');
    expect(row['permissionSetName']).toBe('Requisition Entry');
    expect(row['permissionSetCode']).toBe('REQ-ENTRY');
    expect(get.mock.calls.filter(([endpoint]) => endpoint.startsWith('/userPermissionSets'))).toHaveLength(1);
    for (const resource of ['/permissionSets', '/permissionCompanies']) {
      const reads = get.mock.calls.filter(([endpoint]) => endpoint.startsWith(resource));
      expect(reads).toHaveLength(1);
      expect(new URL(reads[0][0], 'http://fixture').searchParams.get('$filter')).toContain(resource === '/permissionSets' ? 'REQ-ENTRY' : 'TECSA');
    }
    expect(patch).not.toHaveBeenCalled();
    fixture.destroy();
  });

  it('fills code-only assignments with one batched selected-name request and no unopened company dropdown read',async()=>{
    const header={systemId:'user-names',systemRowVersion:1,userName:'fixture-user',name:'Fixture User',email:'fixture@example.com',isActive:true};
    const assignments=[
      {systemId:'assignment-a',systemRowVersion:1,userName:'fixture-user',permissionSetCode:'INV',companyCode:null,isActive:true},
      {systemId:'assignment-b',systemRowVersion:1,userName:'fixture-user',permissionSetCode:'BASIC',companyCode:null,isActive:true},
    ];
    const get=vi.fn((endpoint:string)=>{
      if(endpoint==='/users/user-names')return of({data:header});
      if(endpoint.startsWith('/userPermissionSets?'))return of({data:assignments,meta:{total:2}});
      if(endpoint.startsWith('/permissionSets?'))return of({data:[{code:'INV',name:'Inventory Control'},{code:'BASIC',name:'Basic Lookup'}],meta:{hasMore:false}});
      if(endpoint.startsWith('/permissionCompanies?'))return of({data:[],meta:{hasMore:false}});
      throw new Error('Unexpected caption request: '+endpoint);
    });
    TestBed.configureTestingModule({imports:[ListPage],providers:[provideRouter([]),...providePlatformGovernance(),{provide:DATA_REST_SERVICE,useValue:{get}}]});
    TestBed.inject(SessionService).SuperAdmin=true;
    const fixture=TestBed.createComponent(ListPage);
    fixture.componentRef.setInput('documentOnly',true);fixture.componentRef.setInput('initialRecord',header);
    fixture.componentRef.setInput('listConfig',usersListConfig);fixture.componentRef.setInput('headerConfig',usersHeaderConfig);fixture.componentRef.setInput('lineConfig',usersLineConfig);
    fixture.detectChanges();await fixture.whenStable();
    await vi.waitFor(()=>expect(fixture.componentInstance.inlineDocumentWindowConfig?.contentReady).toBe(true));fixture.detectChanges();
    const names=Array.from(fixture.nativeElement.querySelectorAll('app-document-lines input[aria-label="Name"]') as NodeListOf<HTMLInputElement>).map(input=>input.value);
    expect(names.slice(0,2)).toEqual(['Inventory Control','Basic Lookup']);
    expect(get).toHaveBeenCalledTimes(3);
    const choiceReads = get.mock.calls.filter(([endpoint])=>endpoint.startsWith('/permissionSets?') || endpoint.startsWith('/permissionCompanies?'));
    expect(choiceReads).toHaveLength(1);
    const selectedQuery=new URL(choiceReads[0][0],'http://fixture').searchParams;
    expect(selectedQuery.get('$top')).toBe('2');
    expect(selectedQuery.get('$filter')).toContain("code eq 'INV'");
    expect(selectedQuery.get('$filter')).toContain("code eq 'BASIC'");
    expect(get.mock.calls.find(([endpoint])=>endpoint.startsWith('/userPermissionSets?'))?.[0]).toContain('fixture-user');
    expect(fixture.componentInstance.popupLoading).toBe(false);fixture.destroy();
  });

  it('does not load persisted Lines or show a loader for an unsaved New Card', () => {
    const get = vi.fn((_endpoint: string) => of({ data: [], meta: { total: 0 } }));
    TestBed.configureTestingModule({
      imports: [ListPage],
      providers: [
        provideRouter([]), ...providePlatformGovernance(),
        { provide: DATA_REST_SERVICE, useValue: { get } },
      ],
    });
    TestBed.inject(SessionService).SuperAdmin = true;
    const fixture = TestBed.createComponent(ListPage);
    fixture.componentRef.setInput('documentOnly', true);
    fixture.componentRef.setInput('initialRecord', {});
    fixture.componentRef.setInput('listConfig', usersListConfig);
    fixture.componentRef.setInput('headerConfig', usersHeaderConfig);
    fixture.componentRef.setInput('lineConfig', usersLineConfig);
    fixture.detectChanges();

    const page = fixture.componentInstance;
    expect(page.inlineDocumentWindowConfig?.contentReady).not.toBe(false);
    expect(page.popupLoading).toBe(false);
    expect(get).not.toHaveBeenCalled();

    // Even a refresh on a locally created Header must not query child data.
    (page as unknown as { refreshActiveLines(): void }).refreshActiveLines();
    fixture.detectChanges();
    expect(get).not.toHaveBeenCalled();
    expect(page.popupLoading).toBe(false);
    expect(page.inlineDocumentWindowConfig?.contentReady).not.toBe(false);
    fixture.destroy();
  });

  it('renders saved PR codes and Description without reading unopened choice pages',async()=>{
    const header={systemId:'pr-direct',systemRowVersion:1,number:'PR00001',documentType:'purchase_requisition',status:'open',locationCode:'MAIN'};
    const line={systemId:'pr-line',systemRowVersion:1,lineNo:10000,lineType:'item',number:'ITEM01',description:'Saved custom Description',unitOfMeasureCode:'PCS',locationCode:'MAIN',quantity:'2'};
    const choices=new Subject<unknown>();
    const get=vi.fn((endpoint:string)=>{
      if(endpoint==='/purchaseRequisitions/pr-direct')return of({data:header});
      if(endpoint.startsWith('/purchaseRequisitionLines?'))return of({data:[line],meta:{total:1}});
      if(/^\/(items|locations|unitsOfMeasure)\?/.test(endpoint))return choices;
      throw new Error('Unnecessary initial read: '+endpoint);
    });
    TestBed.configureTestingModule({imports:[ListPage],providers:[provideRouter([]),...providePlatformGovernance(),{provide:DATA_REST_SERVICE,useValue:{get}}]});
    TestBed.inject(SessionService).SuperAdmin=true;
    const fixture=TestBed.createComponent(ListPage);
    fixture.componentRef.setInput('documentOnly',true);fixture.componentRef.setInput('initialRecord',header);
    fixture.componentRef.setInput('listConfig',purchaseRequisitionListConfig);fixture.componentRef.setInput('headerConfig',purchaseRequisitionHeaderConfig);fixture.componentRef.setInput('lineConfig',purchaseRequisitionLineConfig);
    fixture.detectChanges();await fixture.whenStable();
    await vi.waitFor(()=>expect(fixture.componentInstance.inlineDocumentWindowConfig?.contentReady).toBe(true));fixture.detectChanges();
    const grid=fixture.debugElement.query(By.directive(DocumentLines)).componentInstance as DocumentLines;
    const saved=fixture.componentInstance.inlineDocumentWindowConfig!.lineRows!.find(row=>row['systemId']==='pr-line')!;
    expect(grid.lookupDisplay(purchaseRequisitionLineConfig.columns.find(column=>column.id==='itemNumber')!,saved)).toBe('ITEM01');
    expect(grid.lookupDisplay(purchaseRequisitionLineConfig.columns.find(column=>column.id==='unitOfMeasureCode')!,saved)).toBe('PCS');
    expect(fixture.nativeElement.querySelector('app-document-lines input[aria-label="Description"]').value).toBe('Saved custom Description');
    expect(get).toHaveBeenCalledTimes(2);
    const choiceReads=get.mock.calls.filter(([endpoint])=>/^\/(items|locations|unitsOfMeasure)\?/.test(endpoint));
    expect(choiceReads).toHaveLength(0);
    expect(choiceReads.every(([endpoint])=>new URL(endpoint,'http://fixture').searchParams.get('$top')==='10')).toBe(true);
    expect(get.mock.calls.some(([endpoint])=>endpoint.startsWith('/glAccounts'))).toBe(false);
    const filter=new URL(get.mock.calls.find(([endpoint])=>endpoint.startsWith('/purchaseRequisitionLines?'))![0],'http://fixture').searchParams.get('$filter');
    expect(filter).toContain("documentNumber eq 'PR00001'");expect(filter).toContain("documentType eq 'purchase_requisition'");
    expect(fixture.componentInstance.popupLoading).toBe(false);choices.next({data:[],meta:{hasMore:false}});choices.complete();fixture.destroy();
  });

  for (const page of pages) {
    it.each([false, true])(
      `${page.name} keeps full Card hidden behind skeleton, then shows the response (hasLines=%s)`,
      async hasLines => {
        const pending = new Subject<unknown>();
        const get = vi.fn((endpoint: string) => page.isLines(endpoint)
          ? pending : of({ data: structuredClone(page.record) }));
        const post = vi.fn(() => of({}));
        const patch = vi.fn(() => of({}));
        TestBed.configureTestingModule({
          imports: [ListPage],
          providers: [
            provideRouter([]), ...providePlatformGovernance(),
            { provide: DATA_REST_SERVICE, useValue: { get, post, patch } },
          ],
        });
        TestBed.inject(SessionService).SuperAdmin = true;
        const fixture = TestBed.createComponent(ListPage);
        fixture.componentRef.setInput('documentOnly', true);
        fixture.componentRef.setInput('initialRecord', structuredClone(page.record));
        fixture.componentRef.setInput('listConfig', page.list);
        fixture.componentRef.setInput('headerConfig', page.header);
        fixture.componentRef.setInput('lineConfig', page.line);
        fixture.detectChanges();
        await vi.waitFor(() => expect(get.mock.calls.some(([endpoint]) => page.isLines(endpoint))).toBe(true));
        fixture.detectChanges();

        const editor = fixture.debugElement.query(By.directive(DocumentLines)).componentInstance as DocumentLines;
        const rowCount = () => fixture.nativeElement.querySelectorAll('app-document-lines tbody tr').length;
        const state = fixture.componentInstance;
        expect(state.popupLoading).toBe(true);
        expect(state.popupLoadingMessage).toBe('Loading lines...');
        expect(fixture.nativeElement.querySelector('.entry-work').style.visibility).toBe('hidden');
        expect(fixture.nativeElement.querySelector('.entry-complete-skeleton')).not.toBeNull();
        expect(rowCount()).toBe(8);
        expect(editor.disabled).toBe(true);
        expect(state.inlineDocumentWindowConfig!.lineRows!.every(row => row['__entryPlaceholder'])).toBe(true);
        expect(post).not.toHaveBeenCalled();
        expect(patch).not.toHaveBeenCalled();

        pending.next({ data: hasLines ? [page.savedLine] : [], meta: { total: hasLines ? 1 : 0 } });
        pending.complete();
        await fixture.whenStable();
        await vi.waitFor(() => expect(state.popupLoading).toBe(false));
        fixture.detectChanges();
        expect(rowCount()).toBe(8);
        expect(editor.disabled).toBe(false);
        expect(state.inlineDocumentWindowConfig!.contentReady).toBe(true);
        expect(fixture.nativeElement.querySelector('.entry-complete-skeleton')).toBeNull();
        const savedRows = state.inlineDocumentWindowConfig!.lineRows!.filter(row => !row['__entryPlaceholder']);
        expect(savedRows).toHaveLength(hasLines ? 1 : 0);
        if (hasLines) expect(savedRows[0]['systemId']).toBe('line-1');
        expect(post).not.toHaveBeenCalled();
        expect(patch).not.toHaveBeenCalled();
        fixture.destroy();
      },
    );
  }
});
