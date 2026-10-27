import { DOCUMENT_SAVE_PORT } from '../../data/document-save.port';
import { DocumentSaveService } from '../../../core/services/document-save.service';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { of, Subject } from 'rxjs';
import { ListPage } from '../list-page/list-page';
import { DATA_REST_SERVICE } from '../../data/data-source.service';
import { SessionService } from '../../../core/services/session.service';
import { providePlatformGovernance } from '../../../core/providers/platform-governance.provider';
import { paymentTermsHeaderConfig, paymentTermsListConfig } from '../../../features/purchase-masters/payment-terms/payment-terms.config';
import { purchaseRequisitionHeaderConfig, purchaseRequisitionListConfig } from '../../../features/purchasing/purchase-requisition/purchase-requisition.config';

afterEach(()=>TestBed.resetTestingModule());
describe('Shared first-input automatic creation policy',()=>{
 async function setup(options:{pr?:boolean;manual?:boolean;saveCommand?:boolean;unsupported?:boolean;singleton?:boolean;worksheet?:boolean}={}) {
  const {autoSave,...base}=options.pr?purchaseRequisitionListConfig:paymentTermsListConfig;
  const header=options.pr?purchaseRequisitionHeaderConfig:paymentTermsHeaderConfig;
  const pending=new Subject<unknown>();
  const post=vi.fn(()=>pending);
  const patch=vi.fn((_path:string,payload:Record<string,unknown>)=>of({data:{...payload,systemId:'created',systemRowVersion:2}}));
  const put=vi.fn(()=>of({data:{systemId:'singleton',systemRowVersion:2}}));
  TestBed.configureTestingModule({imports:[ListPage],providers:[provideRouter([]),...providePlatformGovernance(),{provide:DOCUMENT_SAVE_PORT,useClass:DocumentSaveService},{provide:DATA_REST_SERVICE,useValue:{get:()=>of({data:[],meta:{total:0}}),post,patch,put}}]});
  TestBed.inject(SessionService).SuperAdmin=true;
  const f=TestBed.createComponent(ListPage);
  f.componentRef.setInput('pageId',base.pageId);f.componentRef.setInput('documentOnly',true);
  f.componentRef.setInput('initialRecord',{});
  f.componentRef.setInput('listConfig',{...base,...(options.manual?{autoSave:false}:{}),...(options.worksheet?{pageType:'worksheet'}:{}),dataSource:{...base.dataSource,...(options.unsupported?{supportsCreate:false}:{}),...(options.singleton?{singleton:true}:{})}});
  f.componentRef.setInput('headerConfig',{...header,toolbarButtons:options.saveCommand?[{label:'Save',actionKey:'cmd:save'}]:header.toolbarButtons});
  f.detectChanges();await f.whenStable();f.detectChanges();
  const page=f.componentInstance;
  const edit=(fieldKey:string,value:unknown)=>page.handleInlineAction({actionKey:'header:changed',payload:{fieldKey,value,previousValue:page.inlineDocumentWindowConfig?.headerData?.[fieldKey]}});
  return {f,page,edit,post,patch,pending};
 }
 it('Payment Terms without autoSave waits for input and required fields, creates once and retains newer edits during POST',async()=>{
  const {f,page,edit,post,patch,pending}=await setup();
  expect(post).not.toHaveBeenCalled();
  edit('code','NET30');await f.whenStable();expect(post).not.toHaveBeenCalled();
  edit('description','Original');await vi.waitFor(()=>expect(post).toHaveBeenCalledTimes(1));
  edit('description','Latest');expect(post).toHaveBeenCalledTimes(1);
  pending.next({data:{systemId:'created',systemRowVersion:1,code:'NET30',description:'Original'}});pending.complete();
  await vi.waitFor(()=>expect(patch).toHaveBeenCalled());
  expect(patch.mock.calls.at(-1)![1]['description']).toBe('Latest');
  expect(page.inlineDocumentWindowConfig!.headerData!['description']).toBe('Latest');
  expect(post).toHaveBeenCalledTimes(1);f.destroy();
 });
 it('PR retains lazy numbered creation: no POST on open, one POST after input, server number retained',async()=>{
  const {f,page,edit,post,pending}=await setup({pr:true});
  expect(post).not.toHaveBeenCalled();edit('purpose','Test request');
  await vi.waitFor(()=>expect(post).toHaveBeenCalledTimes(1));
  pending.next({data:{systemId:'created',systemRowVersion:1,number:'PR00001',status:'open',requestDate:'2026-10-27',purpose:'Test request'}});pending.complete();
  await vi.waitFor(()=>expect(page.inlineDocumentWindowConfig!.headerData!['number']).toBe('PR00001'));expect(post).toHaveBeenCalledTimes(1);f.destroy();
 });
 for (const [name,options] of Object.entries({explicitManual:{manual:true},saveCommand:{saveCommand:true},unsupported:{unsupported:true},singleton:{singleton:true},worksheet:{worksheet:true}})) {
  it('does not automatically POST a header for '+name,async()=>{
   const {f,edit,post}=await setup(options);expect(post).not.toHaveBeenCalled();
   edit('code','NET30');edit('description','Thirty days');await f.whenStable();expect(post).not.toHaveBeenCalled();f.destroy();
  });
 }
});
