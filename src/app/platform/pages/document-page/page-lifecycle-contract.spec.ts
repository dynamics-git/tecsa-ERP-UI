import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { By } from '@angular/platform-browser';
import { of,Subject } from 'rxjs';
import { describe,it,expect,vi } from 'vitest';
import { ConfirmationService } from '../../../shared/ui/confirmation.service';
import { DocumentPage } from './document-page';
import { DynamicForm } from '../../../shared/ui/dynamic-form/dynamic-form';
import { DATA_REST_SERVICE } from '../../data/data-source.service';
import { SessionService } from '../../../core/services/session.service';
import { providePlatformGovernance } from '../../../core/providers/platform-governance.provider';

describe('Page lifecycle with synthetic data, no operational records',()=>{
 const record={id:'fixture-1',code:'PR',description:'Purchase Requisition',systemRowVersion:1};
 function create(type:'card'|'document'|'setup'|'worksheet',response?:Subject<unknown>){
  let current = structuredClone(record);
  const get=vi.fn((endpoint:string)=>response ?? of(endpoint.includes('lines')?{data:[{id:'line-1',lineNo:10000,quantity:2,systemRowVersion:1}]}:{data:current}));
  const patch=vi.fn((endpoint:string,body:Record<string,unknown>)=>{if(!endpoint.includes('lines')) current={...current,...body,systemRowVersion:current.systemRowVersion+1};return of({data:endpoint.includes('lines')?{id:'line-1',...body,systemRowVersion:2}:current});});
  TestBed.configureTestingModule({imports:[DocumentPage],providers:[provideRouter([]),...providePlatformGovernance(),{provide:DATA_REST_SERVICE,useValue:{get,patch,put:patch,post:patch,delete:()=>of({})}}]});
  TestBed.inject(SessionService).SuperAdmin=true;
  const f=TestBed.createComponent(DocumentPage);
  f.componentRef.setInput('pageId','fixture');f.componentRef.setInput('documentOnly',true);
  f.componentRef.setInput('initialRecord',structuredClone(record));
  f.componentRef.setInput('listConfig',{pageId:'fixture',pageType:type,title:'Fixture page',autoSave:false,identity:{primaryField:'code',secondaryField:'description'},dataSource:{endpoint:'/fixtures',keyField:'id',singleton:type==='setup',supportsCreate:true,supportsUpdate:true,supportsDelete:true},factBox:{enabled:true},dataSurface:{columns:[{field:'code',label:'Code'}]}});
  f.componentRef.setInput('headerConfig',{dialogTitle:'Fixture page',toolbarButtons:[],sections:[{id:'general',title:'General',fields:[{key:'code',label:'Code',valueType:'code',required:true},{key:'description',label:'Description'}]}]});
  if(type==='document'||type==='worksheet')f.componentRef.setInput('lineConfig',{placement:{mode:'end'},lineKeyField:'lineNo',toolbarButtons:[],dataSource:{endpoint:'/lines',keyField:'id',navigation:{parentEndpoint:'/fixtures',parentIdFields:['id'],childCollection:'lines'}},columns:[{id:'lineNo',label:'Line No.',readonly:true,valueType:'integer'},{id:'quantity',label:'Quantity',valueType:'number'}],fields:[{key:'quantity',label:'Quantity',valueType:'number'}]});
  f.detectChanges();return {f,get,patch};
 }
 for(const type of ['card','document','setup'] as const)it(type+' keeps page name above configured identity and does not save untouched fields',async()=>{
  const {f,patch}=create(type);await vi.waitFor(()=>expect(f.componentInstance.inlineDocumentWindowConfig?.contentReady).toBe(true));await f.whenStable();f.detectChanges();
  const header=f.nativeElement.querySelector('.entry-header');expect(header.textContent).toContain('Fixture page');expect(header.querySelector('h2').textContent).toContain(type === 'setup' ? 'Fixture page' : 'PR — Purchase Requisition');
  const form=f.debugElement.query(By.directive(DynamicForm)).componentInstance as DynamicForm;
  form.updateFieldValue(form.sections[0].fields[0],' pr ');form.notifyFieldInteracted(form.sections[0].fields[0]);
  await f.whenStable();expect(patch).not.toHaveBeenCalled();
  let closed=false;f.componentInstance.closeRequested.subscribe(()=>closed=true);await f.componentInstance.requestClose();expect(closed).toBe(true);f.destroy();
 });
 it('protects invalid typed drafts on close without sending them to the API',async()=>{
  const {f,patch}=create('card');await vi.waitFor(()=>expect(f.componentInstance.inlineDocumentWindowConfig?.contentReady).toBe(true));await f.whenStable();f.detectChanges();
  const form=f.debugElement.query(By.directive(DynamicForm)).componentInstance as DynamicForm;
  form.updateFieldValue(form.sections[0].fields[0],'');
  let closed=false;f.componentInstance.closeRequested.subscribe(()=>closed=true);
  const confirm=vi.spyOn(TestBed.inject(ConfirmationService),'confirm').mockResolvedValue(false);
  await f.componentInstance.requestClose();expect(confirm).toHaveBeenCalledOnce();expect(closed).toBe(false);expect(patch).not.toHaveBeenCalled();f.destroy();
 });
 it('manual save writes only edited header fields and does not patch untouched lines or placeholders',async()=>{
  const {f,patch}=create('document');await f.whenStable();f.detectChanges();
  const form=f.debugElement.query(By.directive(DynamicForm)).componentInstance as DynamicForm;
  form.updateFieldValue(form.sections[0].fields[1],'Updated description');
  expect(patch).not.toHaveBeenCalled();
  f.componentInstance.handleInlineAction({actionKey:'cmd:save'});await vi.waitFor(()=>expect(patch).toHaveBeenCalledTimes(1));await f.whenStable();
  expect(patch.mock.calls[0][1]).toEqual({description:'Updated description'});
  expect(patch.mock.calls[0][0]).toBe('/fixtures/fixture-1');
  f.componentInstance.handleInlineAction({actionKey:'cmd:save'});await f.whenStable();expect(patch).toHaveBeenCalledTimes(1);f.destroy();
 });
 it('hides unhydrated setup editors, keeps title/commands stable and reveals data together',async()=>{
  const response=new Subject<unknown>();const {f}=create('setup',response);
  expect(f.nativeElement.querySelector('.entry-header')).not.toBeNull();expect(f.nativeElement.querySelector('.entry-work').style.visibility).toBe('hidden');
  response.next({data:record});response.complete();await vi.waitFor(()=>expect(f.componentInstance.inlineDocumentWindowConfig?.contentReady).toBe(true));await f.whenStable();f.detectChanges();
  expect(f.nativeElement.querySelector('.entry-work').style.visibility).toBe('');expect(f.componentInstance.inlineDocumentWindowConfig!.headerData!['code']).toBe('PR');f.destroy();
 });
 it('keeps a failed initial load distinct from a new blank record and allows retry',async()=>{
  const response=new Subject<unknown>();const {f}=create('setup',response);
  response.error({status:503,error:{message:'Fixture unavailable'}});await f.whenStable();f.detectChanges();
  expect(f.nativeElement.querySelector('.entry-work').style.visibility).toBe('hidden');
  expect(f.nativeElement.textContent).toContain('Retry');expect(f.nativeElement.textContent).toContain('Fixture unavailable');f.destroy();
 });
 it('renders worksheet lines under the same document workspace and excludes the automatic document FactBox',async()=>{
  const {f,get}=create('worksheet');await f.whenStable();f.detectChanges();
  expect(f.nativeElement.querySelector('app-document-lines')).not.toBeNull();
  expect(get.mock.calls.some(call=>call[0].includes('/fixtures/fixture-1/lines'))).toBe(true);
  expect(f.nativeElement.querySelector('.entry-factbox')).toBeNull();f.destroy();
 });
});
