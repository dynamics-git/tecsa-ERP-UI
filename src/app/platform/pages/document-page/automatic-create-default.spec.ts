import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { of, Subject, Observable } from 'rxjs';
import { ListPage } from '../list-page/list-page';
import { DATA_REST_SERVICE } from '../../data/data-source.service';
import { SessionService } from '../../../core/services/session.service';
import { providePlatformGovernance } from '../../../core/providers/platform-governance.provider';
import { paymentTermsHeaderConfig, paymentTermsListConfig } from '../../../features/purchase-masters/payment-terms/payment-terms.config';
import { purchaseRequisitionHeaderConfig, purchaseRequisitionLineConfig, purchaseRequisitionListConfig } from '../../../features/purchasing/purchase-requisition/purchase-requisition.config';
import { usersHeaderConfig, usersLineConfig, usersListConfig } from '../../../features/administration/users/users.config';
import { DocumentPageDataSourceResolverService } from '../document-page-data-source-resolver.service';
import { ConfirmationService } from '../../../shared/ui/confirmation.service';

afterEach(()=>TestBed.resetTestingModule());
describe('Shared first-input automatic creation policy',()=>{
 it('does not treat a saved CRUD identity as a substitute for configured parent business keys',()=>{
  const resolver=TestBed.inject(DocumentPageDataSourceResolverService);
  const resolve=(header:Record<string,unknown>)=>resolver.resolveLineDataSourceForHeader({header,
   lineConfig:{...usersLineConfig,dataSource:{...usersLineConfig.dataSource,parentFieldMap:{documentType:'documentType'}}},
   hasValue:value=>value!==undefined&&value!==null&&value!=='',toODataId:value=>String(value)});
  expect(resolve({systemId:'saved',documentType:'test'}).lineContextReady).toBe(false);
  expect(resolve({systemId:'saved',userName:'new-user'}).lineContextReady).toBe(false);
  expect(resolve({systemId:'saved',userName:'new-user',documentType:'test'}).lineContextReady).toBe(true);
 });
 async function setup(options:{pr?:boolean;users?:boolean;withLines?:boolean;manual?:boolean;saveCommand?:boolean;unsupported?:boolean;singleton?:boolean;worksheet?:boolean}={}) {
  const {autoSave,...base}=options.users?usersListConfig:options.pr?purchaseRequisitionListConfig:paymentTermsListConfig;
  const header=options.users?usersHeaderConfig:options.pr?purchaseRequisitionHeaderConfig:paymentTermsHeaderConfig;
  const pending=new Subject<unknown>();
  const post=vi.fn((_path:string,_payload:Record<string,unknown>):Observable<unknown>=>pending);
  const patch=vi.fn((_path:string,payload:Record<string,unknown>)=>of({data:{...payload,systemId:'created',systemRowVersion:2}}));
  const put=vi.fn(()=>of({data:{systemId:'singleton',systemRowVersion:2}}));
  TestBed.configureTestingModule({imports:[ListPage],providers:[provideRouter([]),...providePlatformGovernance(),{provide:DATA_REST_SERVICE,useValue:{get:()=>of({data:[],meta:{total:0}}),post,patch,put}}]});
  TestBed.inject(SessionService).SuperAdmin=true;
  const f=TestBed.createComponent(ListPage);
  f.componentRef.setInput('pageId',base.pageId);f.componentRef.setInput('documentOnly',true);
  f.componentRef.setInput('initialRecord',{});
  f.componentRef.setInput('listConfig',{...base,...(options.manual?{autoSave:false}:{}),...(options.worksheet?{pageType:'worksheet'}:{}),dataSource:{...base.dataSource,...(options.unsupported?{supportsCreate:false}:{}),...(options.singleton?{singleton:true}:{})}});
  f.componentRef.setInput('headerConfig',{...header,toolbarButtons:options.saveCommand?[{label:'Save',actionKey:'cmd:save'}]:header.toolbarButtons});
  if (options.withLines) f.componentRef.setInput('lineConfig',options.users?usersLineConfig:purchaseRequisitionLineConfig);
  f.detectChanges();await f.whenStable();f.detectChanges();
  const page=f.componentInstance;
  const edit=(fieldKey:string,value:unknown)=>page.handleInlineAction({actionKey:'header:changed',payload:{fieldKey,value,previousValue:page.inlineDocumentWindowConfig?.headerData?.[fieldKey]}});
  return {f,page,edit,post,patch,pending};
 }
 it('cancels or resets an unsaved Refresh, accepts new entry afterward, and refreshes the saved record from the server',async()=>{
  const {f,page,edit,post,pending}=await setup({users:true,withLines:true});
  const get=vi.spyOn(TestBed.inject(DATA_REST_SERVICE),'get');
  const confirm=vi.spyOn(TestBed.inject(ConfirmationService),'confirm').mockResolvedValue(false);
  edit('userName','before-refresh');
  page.handleInlineAction({actionKey:'header-draft',payload:{fieldKey:'email',invalid:true}});
  page.handleInlineAction({actionKey:'line:interacted'});
  expect(page.inlineDocumentWindowConfig?.statusMessage?.message).toContain('You cannot create a line');
  const before=page.inlineDocumentWindowConfig;
  page.handleInlineAction({actionKey:'cmd:refresh'});
  await vi.waitFor(()=>expect(confirm).toHaveBeenCalledTimes(1));
  expect(page.inlineDocumentWindowConfig).toBe(before);
  expect(page.inlineDocumentWindowConfig?.headerData?.['userName']).toBe('before-refresh');
  expect(page.hasUnsavedChanges).toBe(true);
  confirm.mockResolvedValue(true);
  page.handleInlineAction({actionKey:'cmd:refresh'});
  await vi.waitFor(()=>expect(page.inlineDocumentWindowConfig).not.toBe(before));
  f.detectChanges();
  expect(page.inlineDocumentWindowConfig?.headerData?.['userName']).not.toBe('before-refresh');
  expect(page.inlineDocumentWindowConfig?.statusMessage).toBeUndefined();
  expect(page.hasUnsavedChanges).toBe(false);expect(post).not.toHaveBeenCalled();expect(get).not.toHaveBeenCalled();
  page.handleInlineAction({actionKey:'line:interacted'});
  edit('userName','after-refresh');
  expect(page.inlineDocumentWindowConfig?.statusMessage?.message??'').not.toContain('You cannot create a line');
  edit('name','New User');edit('email','after-refresh@example.com');edit('password','fixture-password');
  await vi.waitFor(()=>expect(post).toHaveBeenCalledTimes(1));
  const saved={systemId:'created',systemRowVersion:1,userName:'after-refresh',name:'New User',email:'after-refresh@example.com',isActive:true};
  pending.next({data:saved});pending.complete();
  await vi.waitFor(()=>expect(page.hasPendingWrites).toBe(false));
  expect(page.inlineDocumentWindowConfig?.statusMessage?.message??'').not.toContain('You cannot create a line');
  get.mockImplementation((path:string)=>of({data:path.startsWith('/userPermissionSets')?[]:{...saved,name:'Server refreshed name'},meta:{total:0}}));
  page.handleInlineAction({actionKey:'cmd:refresh'});
  await vi.waitFor(()=>expect(page.inlineDocumentWindowConfig?.headerData?.['name']).toBe('Server refreshed name'));
  expect(get.mock.calls.some(([path])=>path==='/users/created')).toBe(true);
  expect(get.mock.calls.some(([path])=>path.startsWith('/userPermissionSets?'))).toBe(true);
  expect(post).toHaveBeenCalledTimes(1);expect(page.hasUnsavedChanges).toBe(false);
  f.destroy();
 });
 it('explains blocked child writes before, during and after a failed Header POST, then uses the confirmed business key',async()=>{
  const {f,page,edit,post,pending}=await setup({users:true,withLines:true});
  const editable=()=>expect(page.inlineDocumentWindowConfig!.lineColumns!.find(column=>column.id==='permissionSetCode')!.readonly).not.toBe(true);
  const message=(text:string)=>{f.detectChanges();const alerts=f.nativeElement.querySelectorAll('[role="alert"]');expect(alerts).toHaveLength(1);expect(alerts[0].textContent).toContain(text);};
  editable();expect(post).not.toHaveBeenCalled();
  f.nativeElement.querySelector('app-document-lines').dispatchEvent(new Event('pointerdown',{bubbles:true}));
  message('You cannot create a line until the header is created.');
  const before=page.inlineDocumentWindowConfig!.lineRows!.length;
  page.handleInlineAction({actionKey:'cmd:line-new'});
  message('You cannot create a line until the header is created.');
  expect(page.inlineDocumentWindowConfig!.lineRows).toHaveLength(before);
  const row=page.inlineDocumentWindowConfig!.lineRows![0];row['permissionSetCode']='SECURITY';
  page.handleInlineAction({actionKey:'line:changed',payload:{row,column:usersLineConfig.columns[0],value:'SECURITY',previousValue:null,rowIndex:0}});
  expect(post).not.toHaveBeenCalled();message('You cannot create a line until the header is created.');
  edit('userName','new-user');edit('name','New User');edit('email','new-user@example.com');edit('password','fixture-password');
  await vi.waitFor(()=>expect(post).toHaveBeenCalledTimes(1));editable();
  page.handleInlineAction({actionKey:'line:interacted'});message('The header is still being saved.');
  expect(post.mock.calls[0][0]).toBe('/users');
  pending.error({status:422,error:{message:'Header rejected'}});
  await vi.waitFor(()=>expect(page.hasPendingWrites).toBe(false));editable();expect(post).toHaveBeenCalledTimes(1);
  page.handleInlineAction({actionKey:'line:interacted'});message('You cannot create a line until the header is created.');
  const retry=new Subject<unknown>();post.mockImplementation((path,payload)=>path==='/users'?retry:of({data:{...payload,systemId:'confirmed-line-id',systemRowVersion:1}}));
  edit('name','Corrected User');await vi.waitFor(()=>expect(post).toHaveBeenCalledTimes(2));editable();
  retry.next({data:{systemId:'confirmed-user-id',systemRowVersion:1,userName:'new-user',name:'Corrected User',email:'new-user@example.com',isActive:true}});retry.complete();
  await vi.waitFor(()=>expect(page.inlineDocumentWindowConfig!.lineColumns!.find(column=>column.id==='permissionSetCode')!.readonly).not.toBe(true));
  await vi.waitFor(()=>expect(post).toHaveBeenCalledTimes(3));
  expect(post.mock.calls[2][0]).toBe('/userPermissionSets');
  expect(post.mock.calls[2][1]).toMatchObject({userName:'new-user',permissionSetCode:'SECURITY'});
  expect(post.mock.calls[2][1]).not.toMatchObject({userName:'confirmed-user-id'});
  f.destroy();
 });
 it('Payment Terms creates on its manual Code without waiting for Description and retains edits during POST',async()=>{
  const {f,page,edit,post,patch,pending}=await setup();
  expect(post).not.toHaveBeenCalled();
  edit('code','NET30');await vi.waitFor(()=>expect(post).toHaveBeenCalledTimes(1));
  expect(post.mock.calls[0][1]['description']).toBe('');
  edit('description','Original');
  edit('description','Latest');expect(post).toHaveBeenCalledTimes(1);
  pending.next({data:{systemId:'created',systemRowVersion:1,code:'NET30',description:'Original'}});pending.complete();
  await vi.waitFor(()=>expect(patch).toHaveBeenCalled());
  expect(patch.mock.calls.at(-1)![1]['description']).toBe('Latest');
  expect(page.inlineDocumentWindowConfig!.headerData!['description']).toBe('Latest');
  expect(post).toHaveBeenCalledTimes(1);f.destroy();
 });
 it('retains rejected input and pending edits, surfaces validation and retries corrected input once',async()=>{
  const {f,page,edit,post,patch,pending}=await setup();
  edit('code','NET30');edit('description','Rejected');
  await vi.waitFor(()=>expect(post).toHaveBeenCalledTimes(1));
  edit('description','Latest unsaved');
  pending.error({status:422,error:{message:'Validation failed.',errors:{code:['This code already exists.']}}});
  await vi.waitFor(()=>expect(page.inlineDocumentWindowConfig?.statusMessage?.message).toContain('This code already exists.'));
  expect(page.inlineDocumentWindowConfig?.statusMessage?.tone).toBe('error');
  expect(page.inlineDocumentWindowConfig?.headerData?.['description']).toBe('Latest unsaved');
  expect(page.inlineDocumentWindowConfig?.headerData?.['code']).toBe('NET30');
  expect(page.hasUnsavedChanges).toBe(true);expect(page.hasPendingWrites).toBe(false);
  expect(post).toHaveBeenCalledTimes(1);expect(patch).not.toHaveBeenCalled();
  const retry=new Subject<unknown>();post.mockImplementation(()=>retry);
  edit('code','NET31');await vi.waitFor(()=>expect(post).toHaveBeenCalledTimes(2));
  edit('description','Latest corrected');expect(post).toHaveBeenCalledTimes(2);
  retry.next({data:{systemId:'created',systemRowVersion:1,code:'NET31',description:'Latest unsaved'}});retry.complete();
  await vi.waitFor(()=>expect(patch).toHaveBeenCalled());
  expect(patch.mock.calls.at(-1)![1]['description']).toBe('Latest corrected');
  expect(page.inlineDocumentWindowConfig?.headerData?.['systemId']).toBe('created');
  expect(post).toHaveBeenCalledTimes(2);f.destroy();
 });
 it('PR accepts a manual business Number, then creates once through shared CRUD',async()=>{
  const {f,page,edit,post,pending}=await setup({pr:true});
  expect(post).not.toHaveBeenCalled();edit('purpose','Test request');
  expect(post).not.toHaveBeenCalled();edit('number','PR00001');
  await vi.waitFor(()=>expect(post).toHaveBeenCalledTimes(1));
  pending.next({data:{systemId:'created',systemRowVersion:1,number:'PR00001',status:'open',requestDate:'2026-10-27',purpose:'Test request'}});pending.complete();
  await vi.waitFor(()=>expect(page.inlineDocumentWindowConfig!.headerData!['number']).toBe('PR00001'));expect(post).toHaveBeenCalledTimes(1);f.destroy();
 });
 it('PR selects a No. Series and keeps the generated Header Number before any Line is created',async()=>{
  const {f,page,edit,post,pending}=await setup({pr:true,withLines:true});
  edit('noSeriesCode','PR');
  await vi.waitFor(()=>expect(post).toHaveBeenCalledTimes(1));
  pending.next({data:{systemId:'created',systemRowVersion:1,number:'PR00001',noSeriesCode:'PR',documentType:'purchase_requisition',status:'open'}});pending.complete();
  await vi.waitFor(()=>expect(page.inlineDocumentWindowConfig?.headerData?.['number']).toBe('PR00001'));
  expect(page.inlineDocumentWindowConfig?.lineRows?.filter(row=>!row['__entryPlaceholder'])).toHaveLength(0);
  expect(post).toHaveBeenCalledTimes(1);f.destroy();
 });
 it('PR create stays editable and does not PATCH unchanged Lines after a deferred Header edit',async()=>{
  const {f,page,edit,post,patch,pending}=await setup({pr:true,withLines:true});
  edit('purpose','Original');
  expect(post).not.toHaveBeenCalled();edit('number','PR00001');
  await vi.waitFor(()=>expect(post).toHaveBeenCalledTimes(1));
  // The POST is in flight, but the editor is not masked by a "draft" loading overlay.
  expect(page.popupLoading).toBe(false);
  expect(page.inlineDocumentWindowConfig?.interactionLocked).not.toBe(true);
  // The already-loaded line has no edits; creating/updating the Header must not write it.
  const existingLine = {
    systemId:'line-1', systemRowVersion:1, documentNumber:'PR00001',
    documentType:'purchase_requisition', lineNo:10000, lineType:'item', number:'ITEM01',
  };
  page.inlineDocumentWindowConfig!.lineRows = [existingLine];
  edit('purpose','Updated while creating');
  pending.next({data:{
    systemId:'created',systemRowVersion:1,number:'PR00001',
    status:'open',requestDate:'2026-10-27',purpose:'Original',
  }});
  pending.complete();
  await vi.waitFor(()=>expect(patch).toHaveBeenCalled());
  expect(patch).toHaveBeenCalledTimes(1);
  expect(patch.mock.calls[0]![0]).toContain('purchaseRequisitions');
  expect(patch.mock.calls[0]![1]).toEqual(expect.objectContaining({purpose:'Updated while creating'}));
  expect(page.inlineDocumentWindowConfig?.headerData?.['purpose']).toBe('Updated while creating');
  expect(post).toHaveBeenCalledTimes(1);
  expect(page.popupLoading).toBe(false);
  f.destroy();
 });
 for (const [name,options] of Object.entries({explicitManual:{manual:true},saveCommand:{saveCommand:true},unsupported:{unsupported:true},singleton:{singleton:true},worksheet:{worksheet:true}})) {
  it('does not automatically POST a header for '+name,async()=>{
   const {f,edit,post}=await setup(options);expect(post).not.toHaveBeenCalled();
   edit('code','NET30');edit('description','Thirty days');await f.whenStable();expect(post).not.toHaveBeenCalled();f.destroy();
  });
 }
});
