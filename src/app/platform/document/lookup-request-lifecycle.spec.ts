import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Observable, of, Subject } from 'rxjs';
import { SessionService } from '../../core/services/session.service';
import { DATA_REST_SERVICE } from '../data/data-source.service';
import { DocumentLines } from './document-lines/document-lines';
import { DynamicForm } from '../../shared/ui/dynamic-form/dynamic-form';
import { By } from '@angular/platform-browser';
import { DocumentWindow } from './document-window/document-window';

describe('Shared dropdown requests through the real data cache', () => {
  afterEach(() => { TestBed.resetTestingModule(); localStorage.clear(); });

  it('renders a received code, caption and configured fill while another lookup is still pending', async () => {
    const vendors = new Subject<unknown>(), countries = new Subject<unknown>();
    const get = vi.fn((endpoint: string) => endpoint.startsWith('/vendors?') ? vendors : countries);
    TestBed.configureTestingModule({imports: [DocumentLines], providers: [provideRouter([]), {provide: DATA_REST_SERVICE, useValue: {get}}]});
    const fixture = TestBed.createComponent(DocumentLines), grid = fixture.componentInstance;
    const columns = [
      {id:'vendorCode',label:'Vendor',lookup:{endpoint:'/vendors',valueField:'code',displayField:'name'},fill:{vendorLabel:'name',delivery:'address',description:'description'}},
      {id:'vendorLabel',label:'Vendor name',readonly:true},
      {id:'delivery',label:'Delivery',readonly:true},
      {id:'description',label:'Description'},
      {id:'countryCode',label:'Country',lookup:{endpoint:'/countries',valueField:'code',displayField:'name'}},
    ];
    const row: Record<string,unknown> = {systemId:'line-1',systemRowVersion:7,vendorCode:'V1',countryCode:'MY',description:'Saved custom description'};
    const changed=vi.fn();grid.rowChanged.subscribe(changed);
    fixture.componentRef.setInput('columns',columns);fixture.componentRef.setInput('rows',[row]);fixture.detectChanges();
    expect(get).toHaveBeenCalledTimes(2);
    expect(countries.observers).toHaveLength(1);
    vendors.next({data:[{code:'V1',name:'Vendor One',address:'Address One',description:'Master description'}],meta:{hasMore:false}});vendors.complete();
    await vi.waitFor(()=>{
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('input[aria-label="Vendor"]').value).toBe('Vendor One');
      expect(fixture.nativeElement.querySelector('input[aria-label="Vendor name"]').value).toBe('Vendor One');
      expect(fixture.nativeElement.querySelector('input[aria-label="Delivery"]').value).toBe('Address One');
    });
    expect(countries.observers).toHaveLength(1); // No country response has arrived.
    expect(row).toMatchObject({vendorCode:'V1',vendorLabel:'Vendor One',delivery:'Address One',description:'Saved custom description',systemRowVersion:7});
    expect(changed).not.toHaveBeenCalled();expect(get).toHaveBeenCalledTimes(2);
    countries.next({data:[{code:'MY',name:'Malaysia'}],meta:{hasMore:false}});countries.complete();
    await vi.waitFor(()=>expect(grid.lookupDisplay(columns[4],row)).toBe('Malaysia'));
    expect(row['vendorLabel']).toBe('Vendor One');expect(changed).not.toHaveBeenCalled();
    fixture.destroy();
  });

  it('leaves unopened choices unloaded and shares first-page reads across dropdown opens', () => {
    const pending = new Subject<unknown>();
    const get = vi.fn((_endpoint: string) => pending);
    TestBed.configureTestingModule({imports: [DocumentWindow], providers: [provideRouter([]), {provide: DATA_REST_SERVICE, useValue: {get}}]});
    const session = TestBed.inject(SessionService); session.Company='fixture-company'; session.User={systemId:'fixture-user'}; session.AccessToken='fixture-token';
    const lookup = {endpoint:'/visibleChoices',valueField:'code',displayField:'code'};
    const field = {key:'choice',label:'Choice',lookup};
    const fixture = TestBed.createComponent(DocumentWindow);
    fixture.componentRef.setInput('contentReady',false);
    fixture.componentRef.setInput('headerSections',[{id:'general',title:'General',fields:[field,
      {key:'hidden',label:'Hidden',hidden:true,lookup:{...lookup,endpoint:'/hiddenChoices'}},
      {key:'readonly',label:'Read only',readonly:true,lookup:{...lookup,endpoint:'/readonlyChoices'}},
    ]}]);
    fixture.componentRef.setInput('headerData',{});
    fixture.componentRef.setInput('lineColumns',[{id:'choice',label:'Choice',lookup}]);
    fixture.componentRef.setInput('lineRows',Array.from({length:50},()=>({choice:null})));
    fixture.detectChanges(); expect(get).not.toHaveBeenCalled();
    fixture.componentRef.setInput('contentReady',true); fixture.detectChanges();
    expect(get).not.toHaveBeenCalled();
    const form = fixture.debugElement.query(By.directive(DynamicForm)).componentInstance as DynamicForm;
    form.openLookup(field); form.closeLookup(); form.openLookup(field);
    expect(get).toHaveBeenCalledTimes(1);
    expect(new URL(get.mock.calls[0][0],'http://fixture').searchParams.get('$top')).toBe('10');
    pending.next({data:Array.from({length:10},(_,id)=>({code:String(id)})),meta:{hasMore:true}}); pending.complete();
    form.closeLookup(); form.openLookup(field);
    expect(get).toHaveBeenCalledTimes(1); expect(form.getFieldOptions(field)).toHaveLength(10); expect(form.lookupLoading).toBe(false);
    fixture.destroy();
  });

  it.each(['header', 'line'])('%s reuses a pending read, pages by ten and reopens fresh choices without a new GET', async kind => {
    const pending = new Subject<unknown>();
    const get = vi.fn((_endpoint: string): Observable<unknown> => pending);
    TestBed.configureTestingModule({ imports: [DynamicForm, DocumentLines], providers: [provideRouter([]), {provide: DATA_REST_SERVICE, useValue: {get}}] });
    const session = TestBed.inject(SessionService);
    session.Company = 'fixture-company'; session.User = {systemId: 'fixture-user'}; session.AccessToken = 'fixture-token';
    const lookup = {endpoint: '/fixtureChoices', valueField: 'code', displayField: 'code'};
    const field = {key: 'choice', label: 'Choice', lookup};
    const column = {id: 'choice', label: 'Choice', lookup};
    const first = {choice: null}, second = {choice: null};
    const fixture = kind === 'header' ? TestBed.createComponent(DynamicForm) : TestBed.createComponent(DocumentLines);
    if (kind === 'header') {
      fixture.componentRef.setInput('sections', [{id: 'general', fields: [field]}]);
      fixture.componentRef.setInput('data', first);
    } else {
      fixture.componentRef.setInput('columns', [column]); fixture.componentRef.setInput('rows', [first, second]);
    }
    fixture.detectChanges();
    const form = fixture.componentInstance as DynamicForm;
    const grid = fixture.componentInstance as DocumentLines;
    const open = (next = false) => kind === 'header' ? (next ? form.searchLookup(field, '', true) : form.openLookup(field)) : grid.searchLookup(column, second, '', next);
    const choices = () => kind === 'header' ? form.getFieldOptions(field) : grid.getOptions(column, second);
    if (kind === 'header') form.openLookup(field); else grid.searchLookup(column, first, '');
    expect(get).toHaveBeenCalledTimes(1);
    open();
    expect(get).toHaveBeenCalledTimes(1); // Reopening/switching rows must not cancel/restart the HTTP request.
    expect(new URL(get.mock.calls[0][0], 'http://fixture').searchParams.get('$top')).toBe('10');
    pending.next({data: Array.from({length: 10}, (_, id) => ({code: String(id)})), meta: {hasMore: true, total: null}}); pending.complete();
    expect(choices()).toHaveLength(10);
    get.mockReturnValue(of({data: [{code: 'next'}], meta: {hasMore: false}}));
    open(true);
    await vi.waitFor(() => expect(choices()).toHaveLength(11));
    expect(get).toHaveBeenCalledTimes(2);
    expect(new URL(get.mock.calls[1][0], 'http://fixture').searchParams.get('$skip')).toBe('10');
    open(true); expect(get).toHaveBeenCalledTimes(2);
    open(); expect(choices()).toHaveLength(10); expect(get).toHaveBeenCalledTimes(2);
    fixture.destroy();
  });
});
