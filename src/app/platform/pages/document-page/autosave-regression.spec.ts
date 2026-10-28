import {DocumentConfigDataService} from '../../data/document-config-data.service';
import {LineMasterService} from '../../data/line-master.service';
import {lineConfigDefaults} from '../../data/document-config-defaults';
import {purchaseRequisitionLineConfig} from '../../../features/purchasing/purchase-requisition/purchase-requisition.config';
import { By } from '@angular/platform-browser';
import { DocumentLines } from '../../document/document-lines/document-lines';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { of, throwError, Subject } from 'rxjs';
import { DocumentPage } from './document-page';
import { DATA_REST_SERVICE } from '../../data/data-source.service';
import { SessionService } from '../../../core/services/session.service';
import { providePlatformGovernance } from '../../../core/providers/platform-governance.provider';
afterEach(()=>TestBed.resetTestingModule());
describe('Per-field autosave regressions',()=>{
 async function create(worksheet=false, supportsCreate=true, autoSave=false) {
  const header={id:'header-a',code:'PR',systemRowVersion:3};
  const rows=[{id:'line-a',lineNo:10000,systemRowVersion:5,description:'Paper',quantity:'2.123456',amount:'999'},
   {id:'line-b',lineNo:20000,systemRowVersion:7,description:'Toner',quantity:'3',amount:'999'}];
  const post=vi.fn((_path:string,payload:unknown)=>of({data:{...(payload as object),id:'new-line',lineNo:30000,systemRowVersion:1}}));
  const get=vi.fn((path:string)=>of({data:path.includes('/lines')?structuredClone(rows):structuredClone(header)}));
  TestBed.configureTestingModule({imports:[DocumentPage],providers:[provideRouter([]),...providePlatformGovernance(),{provide:DATA_REST_SERVICE,useValue:{get,post,patch:()=>of({data:header}),delete:()=>of({})}}]});
  TestBed.inject(SessionService).SuperAdmin=true;
  const f=TestBed.createComponent(DocumentPage);
  f.componentRef.setInput('pageId','productivity-fixture');f.componentRef.setInput('documentOnly',true);f.componentRef.setInput('initialRecord',header);
  f.componentRef.setInput('listConfig',{pageId:'productivity-fixture',pageType:worksheet?'worksheet':'document',autoSave,title:'Fixture',dataSource:{endpoint:'/fixtures',keyField:'id'},dataSurface:{columns:[{field:'code',label:'Code'}]}});
  f.componentRef.setInput('headerConfig',{toolbarButtons:[{label:'Save',actionKey:'cmd:save'}],sections:[{id:'general',title:'General',fields:[{key:'code',label:'Code'}]}]});
  f.componentRef.setInput('lineConfig',{placement:{mode:'end'},lineKeyField:'lineNo',toolbarButtons:[],
   dataSource:{endpoint:'/lines',keyField:'id',supportsCreate,navigation:{parentEndpoint:'/fixtures',parentIdFields:['id'],childCollection:'lines'},createFields:['description','quantity'],updateFields:['description','quantity'],meaningfulFields:['description'],requiredCreateFields:['description','quantity']},
   calculation:[{target:'amount',formula:'quantity * 2',precision:6}],columns:[{id:'lineNo',label:'Line No.',readonly:true,valueType:'integer'},{id:'description',label:'Description',valueType:'text'},{id:'quantity',label:'Quantity',valueType:'decimal',required:true},{id:'amount',label:'Amount',readonly:true,valueType:'decimal'}]});
  f.detectChanges();await f.whenStable();await vi.waitFor(()=>expect(f.componentInstance.popupLoading).toBe(false));f.detectChanges();
  return {f,post};
 }

 it('PATCH validates the changed field without blocking on an unrelated blank required field',async()=>{
  const {f}=await create(false,true,true), page=f.componentInstance;
  const rest=TestBed.inject(DATA_REST_SERVICE), patch=vi.spyOn(rest,'patch').mockImplementation((_p,payload)=>of({data:{id:'line-a',...payload as object}}));
  const grid=f.debugElement.query(By.directive(DocumentLines)).componentInstance as DocumentLines;
  const row=page.inlineDocumentWindowConfig!.lineRows![0]; row['quantity']='';
  grid.updateCellValue(grid.columns.find(c=>c.id==='description')!,row,'Edited while quantity blank');
  await vi.waitFor(()=>expect(patch).toHaveBeenCalledTimes(1));
  expect(patch.mock.calls[0][1]).toEqual({description:'Edited while quantity blank'});
  f.destroy();
 });
 it('retains and replays edits made during automatic POST, with one create and no Save action',async()=>{
  const {f,post}=await create(false,true,true),page=f.componentInstance;
  const response=new Subject<any>();post.mockImplementation(()=>response);
  const rest=TestBed.inject(DATA_REST_SERVICE),patch=vi.spyOn(rest,'patch').mockImplementation((_p,payload)=>of({data:{id:'created',...payload as object}}));
  const grid=f.debugElement.query(By.directive(DocumentLines)).componentInstance as DocumentLines;
  const row=page.inlineDocumentWindowConfig!.lineRows!.find(r=>r['__entryPlaceholder'])!;
  grid.updateCellValue(grid.columns.find(c=>c.id==='description')!,row,'Pending draft');
  expect(post).not.toHaveBeenCalled();expect(page.hasUnsavedChanges).toBe(true);
  grid.updateCellValue(grid.columns.find(c=>c.id==='quantity')!,row,'2');
  await vi.waitFor(()=>expect(post).toHaveBeenCalledTimes(1));expect(page.hasPendingWrites).toBe(true);
  grid.updateCellValue(grid.columns.find(c=>c.id==='description')!,row,'Latest description');
  grid.updateCellValue(grid.columns.find(c=>c.id==='quantity')!,row,'7');
  response.next({data:{id:'created',lineNo:30000,description:'Pending draft',quantity:'2',systemRowVersion:1}});response.complete();
  expect(post).toHaveBeenCalledTimes(1);
  await vi.waitFor(()=>expect(patch).toHaveBeenCalledTimes(1));
  expect(patch.mock.calls[0][1]).toMatchObject({description:'Latest description',quantity:'7'});
  expect(row).toMatchObject({id:'created',description:'Latest description',quantity:'7'});
  expect(page.hasPendingWrites).toBe(false);expect(page.hasUnsavedChanges).toBe(false);f.destroy();
 });

});

describe('Configured create payload readiness',()=>{
 const service=new DocumentConfigDataService(new LineMasterService());
 const config=lineConfigDefaults(purchaseRequisitionLineConfig);
 const draft=()=>service.createEmptyLineRow(config,{}, {defaultType:'item',emptyType:' ',byType:{}},{});
 it('does not infer required master selection from conditional lookup presentation',()=>{
  const row=draft();expect(service.buildLineCreatePayload(row,config)).not.toBeNull();
  row['lineType']='gl_account';expect(service.buildLineCreatePayload(row,config)).not.toBeNull();
 });
 it('retains explicitly required master prerequisites',()=>{
  const required={...config,columns:config.columns.map(column=>column.id==='itemId'?{...column,required:true}:column)};
  const row=draft();expect(service.buildLineCreatePayload(row,required)).toBeNull();
  row['itemId']=123;expect(service.buildLineCreatePayload(row,required)?.['itemId']).toBe(123);
 });
 it('omits untouched empty lookup defaults but preserves explicit null and update clears',()=>{
  const row={...draft(),itemId:123,locationId:null};
  const build=service.buildLineCreatePayload.bind(service) as (...args:any[])=>Record<string,unknown>;
  expect(build(row,config,['itemId'])).not.toHaveProperty('locationId');
  expect(build(row,config,['itemId'])).not.toHaveProperty('unitOfMeasureId');
  expect(build(row,config,['itemId','locationId'])).toHaveProperty('locationId',null);
  expect(service.buildLineUpdatePayload(row,['locationId'],config)).toEqual({locationId:null});
 });
});
