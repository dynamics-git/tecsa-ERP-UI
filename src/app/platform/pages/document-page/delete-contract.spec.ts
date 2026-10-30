import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe,it,expect,vi } from 'vitest';
import { of,Subject,throwError } from 'rxjs';
import { DocumentPage } from './document-page';
import { DATA_REST_SERVICE } from '../../data/data-source.service';
import { SessionService } from '../../../core/services/session.service';
import { ConfirmationService } from '../../../shared/ui/confirmation.service';
import { providePlatformGovernance } from '../../../core/providers/platform-governance.provider';
import { DataSourceConfig } from '../../models/data-source-config.model';

describe('Config-driven deletion across page surfaces',()=>{
 const header={id:'header-a',code:'PR',systemRowVersion:3};
 const lines=[{id:'line-a',lineNo:10000,systemRowVersion:5},{id:'line-b',lineNo:20000,systemRowVersion:7}];
 async function create(options:{list?:boolean;worksheet?:boolean;source?:Partial<DataSourceConfig>;lineSource?:Partial<DataSourceConfig>}={}){
  const remove=vi.fn((_endpoint:string,_etag?:string)=>of(undefined));
  const get=vi.fn((endpoint:string)=>of({data:endpoint.includes('/lines')?structuredClone(lines):options.list?[structuredClone(header)]:structuredClone(header)}));
  TestBed.configureTestingModule({imports:[DocumentPage],providers:[provideRouter([]),...providePlatformGovernance(),{provide:DATA_REST_SERVICE,useValue:{get,delete:remove,post:()=>of({}),patch:()=>of({})}}]});
  const session=TestBed.inject(SessionService);session.SuperAdmin=true;
  const confirm=vi.spyOn(TestBed.inject(ConfirmationService),'confirmIntent').mockResolvedValue(true);
  const f=TestBed.createComponent(DocumentPage);
  f.componentRef.setInput('pageId','delete-fixture');f.componentRef.setInput('documentOnly',!options.list);
  f.componentRef.setInput('initialRecord',structuredClone(header));
  f.componentRef.setInput('listConfig',{pageId:'delete-fixture',pageType:options.worksheet?'worksheet':options.list?'list':'document',title:'Fixture',dataSource:{endpoint:'/fixtures',keyField:'id',...options.source},dataSurface:{columns:[{field:'code',label:'Code'}]}});
  f.componentRef.setInput('headerConfig',{dialogTitle:'Fixture',toolbarButtons:[],sections:[{id:'general',title:'General',fields:[{key:'code',label:'Code'}]}]});
  f.componentRef.setInput('lineConfig',{placement:{mode:'end'},toolbarButtons:[],dataSource:{endpoint:'/lines',keyField:'id',navigation:{parentEndpoint:'/fixtures',parentIdFields:['id'],childCollection:'lines'},...options.lineSource},columns:[{id:'lineNo',label:'Line No.',readonly:true,valueType:'integer'}],fields:[]});
  f.detectChanges();await f.whenStable();
  await vi.waitFor(()=>expect(f.componentInstance.popupLoading).toBe(false));f.detectChanges();
  return {f,remove,confirm,session};
 }
 it('header deletion uses its version and closes the document only after success',async()=>{
  const {f,remove,confirm}=await create();const closed=vi.fn();f.componentInstance.closeRequested.subscribe(closed);
  f.componentInstance.handleInlineAction({actionKey:'cmd:delete'});
  await vi.waitFor(()=>expect(closed).toHaveBeenCalledOnce());
  expect(confirm).toHaveBeenCalledOnce();expect(remove).toHaveBeenCalledExactlyOnceWith('/fixtures/header-a','"3"');f.destroy();
 });
 it('leaves the document open on version conflict and does not retry',async()=>{
  const {f,remove}=await create();remove.mockImplementation(()=>throwError(()=>({status:412,error:{message:'Changed on server'}})));
  const closed=vi.fn();f.componentInstance.closeRequested.subscribe(closed);f.componentInstance.handleInlineAction({actionKey:'cmd:delete'});
  await vi.waitFor(()=>expect(f.componentInstance.hasPendingWrites).toBe(false));
  expect(remove).toHaveBeenCalledOnce();expect(closed).not.toHaveBeenCalled();expect(f.componentInstance.inlineDocumentWindowConfig?.headerData?.['id']).toBe('header-a');f.destroy();
 });
 it('retains only failed checked list rows, with each original row version',async()=>{
  const {f,remove,confirm}=await create({list:true});
  const rows=[structuredClone(header),{id:'header-b',code:'B',systemRowVersion:8}];f.componentInstance.rows=rows;
  f.componentInstance.handleCheckedKeysChanged(rows.map(row=>row.id));
  remove.mockImplementation(endpoint=>endpoint.endsWith('header-b')?throwError(()=>({status:409,error:{message:'Record is used'}})):of(undefined));
  f.componentInstance.handleCommand({actionKey:'delete'});
  await vi.waitFor(()=>expect(f.componentInstance.rows).toEqual([rows[1]]));
  expect(confirm).toHaveBeenCalledOnce();expect(remove.mock.calls).toEqual([['/fixtures/header-a','"3"'],['/fixtures/header-b','"8"']]);expect(f.componentInstance.error).toContain('1 failed');f.destroy();
 });
 it('multiple lines use the parent route and retain only failures',async()=>{
  const {f,remove,confirm}=await create();remove.mockImplementation(endpoint=>endpoint.endsWith('line-b')?throwError(()=>({status:409,error:{message:'Line is used'}})):of(undefined));
  f.componentInstance.handleInlineAction({actionKey:'cmd:line-delete',payload:{selectedIndexes:[0,1]}});
  await vi.waitFor(()=>expect(f.componentInstance.hasPendingWrites).toBe(false));
  expect(remove.mock.calls).toEqual([['/fixtures/header-a/lines/line-a','"5"'],['/fixtures/header-a/lines/line-b','"7"']]);
  expect(confirm).toHaveBeenCalledOnce();expect(f.componentInstance.inlineDocumentWindowConfig?.lineRows?.filter(row=>row['id']).map(row=>row['id'])).toEqual(['line-b']);f.destroy();
 });
 for(const surface of ['header','line','list'] as const)it(surface+' explicitly false blocks even direct command dispatch',async()=>{
  const {f,remove,confirm}=await create({list:surface==='list',...(surface==='line'?{lineSource:{supportsDelete:false}}:{source:{supportsDelete:false}})});
  if(surface==='list'){f.componentInstance.selectedRow=header;f.componentInstance.handleCommand({actionKey:'delete'});}
  else f.componentInstance.handleInlineAction({actionKey:surface==='header'?'cmd:delete':'cmd:line-delete',payload:{selectedIndexes:[0]}});
  await f.whenStable();expect(confirm).not.toHaveBeenCalled();expect(remove).not.toHaveBeenCalled();f.destroy();
 });
 it('worksheet deletion uses the retained parent context and shared confirmation',async()=>{
  const {f,remove,confirm}=await create({worksheet:true});
  f.componentInstance.handleInlineAction({actionKey:'cmd:delete',payload:{selectedIndexes:[0]}});
  await vi.waitFor(()=>expect(remove).toHaveBeenCalledOnce());await vi.waitFor(()=>expect(f.componentInstance.hasPendingWrites).toBe(false));
  expect(remove).toHaveBeenCalledExactlyOnceWith('/fixtures/header-a/lines/line-a','"5"');expect(confirm).toHaveBeenCalledOnce();f.destroy();
 });
 it('permissions and read-only record states block deletion before confirmation',async()=>{
  const {f,remove,confirm,session}=await create({source:{writableStates:{field:'status',values:['Open']}}});
  f.componentInstance.handleInlineAction({actionKey:'cmd:delete'});await f.whenStable();expect(confirm).not.toHaveBeenCalled();
  session.SuperAdmin=false;session.Permissions=[];
  f.componentInstance.handleInlineAction({actionKey:'cmd:line-delete',payload:{selectedIndexes:[0]}});await f.whenStable();expect(remove).not.toHaveBeenCalled();f.destroy();
 });
 it('cancellation does not delete and repeated clicks during a request do not duplicate it',async()=>{
  const {f,remove,confirm}=await create();confirm.mockResolvedValueOnce(false);
  f.componentInstance.handleInlineAction({actionKey:'cmd:delete'});await f.whenStable();expect(remove).not.toHaveBeenCalled();
  const pending=new Subject<undefined>();remove.mockImplementation(()=>pending);
  f.componentInstance.handleInlineAction({actionKey:'cmd:delete'});await vi.waitFor(()=>expect(remove).toHaveBeenCalledOnce());
  f.componentInstance.handleInlineAction({actionKey:'cmd:delete'});await f.whenStable();expect(remove).toHaveBeenCalledOnce();
  pending.next(undefined);pending.complete();await vi.waitFor(()=>expect(f.componentInstance.hasPendingWrites).toBe(false));f.destroy();
 });

 it('shows one shared line loader only after confirmation and clears it on failure',async()=>{
  const {f,remove,confirm}=await create();confirm.mockResolvedValueOnce(false);
  f.componentInstance.handleInlineAction({actionKey:'cmd:line-delete',payload:{selectedIndexes:[0,1]}});
  await vi.waitFor(()=>expect(f.componentInstance.hasPendingWrites).toBe(false));
  expect(f.componentInstance.popupLoading).toBe(false);expect(remove).not.toHaveBeenCalled();
  const pending=new Subject<undefined>();remove.mockImplementation(()=>pending);
  f.componentInstance.handleInlineAction({actionKey:'cmd:line-delete',payload:{selectedIndexes:[0,1]}});
  await vi.waitFor(()=>expect(remove).toHaveBeenCalled());f.detectChanges();
  expect(f.componentInstance.popupLoadingMessage).toBe('Deleting lines…');
  expect(f.nativeElement.querySelectorAll('app-loading-indicator').length).toBe(1);
  pending.error({status:409,error:{message:'Line is used'}});
  await vi.waitFor(()=>expect(f.componentInstance.hasPendingWrites).toBe(false));
  expect(f.componentInstance.popupLoading).toBe(false);
  expect(f.componentInstance.inlineDocumentWindowConfig?.statusMessage?.tone).toBe('error');f.destroy();
 });
});
