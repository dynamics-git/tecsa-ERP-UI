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
describe('Shared document and worksheet line productivity integration',()=>{
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
 it('copies selected lines in order, recalculates amounts and leaves identity for the normal backend create',async()=>{
  const {f,post}=await create();const page=f.componentInstance;
  const original=page.inlineDocumentWindowConfig!.lineRows!;
  page.handleInlineAction({actionKey:'cmd:line-copy',payload:{selectedIndexes:[0,1]}});f.detectChanges();
  const rows=page.inlineDocumentWindowConfig!.lineRows!.filter(row=>!row['__entryPlaceholder']);
  expect(rows.slice(0,2)).toEqual(original.slice(0,2));expect(rows).toHaveLength(4);
  expect(rows[2]).toMatchObject({description:'Paper',quantity:'2.123456'});expect(rows[3]).toMatchObject({description:'Toner',quantity:'3'});
  expect(rows[2]['id']).toBeUndefined();expect(rows[2]['systemRowVersion']).toBeUndefined();expect(rows[2]['lineNo']).not.toBe(10000);
  expect(String(rows[2]['amount'])).not.toBe('999');expect(post).not.toHaveBeenCalled();
  f.destroy();
 });
 it('autosaves a copied line through the existing create API without source identifiers or calculated amounts',async()=>{
  const {f,post}=await create(false,true,true);
  f.componentInstance.handleInlineAction({actionKey:'cmd:line-copy',payload:{selectedIndexes:[0]}});
  await vi.waitFor(()=>expect(post).toHaveBeenCalledTimes(1));
  expect(post.mock.calls[0][1]).toEqual({description:'Paper',quantity:'2.123456'});
  const saved=f.componentInstance.inlineDocumentWindowConfig!.lineRows!.find(row=>row['id']==='new-line');
  expect(saved).toMatchObject({lineNo:30000,systemRowVersion:1,description:'Paper'});f.destroy();
 });
 it('retains a failed copied draft with its edits and does not retry automatically',async()=>{
  const {f,post}=await create(false,true,true);post.mockImplementation(()=>throwError(()=>({status:422,error:{message:'Not allowed'}})));
  f.componentInstance.handleInlineAction({actionKey:'cmd:line-copy',payload:{selectedIndexes:[0]}});
  await vi.waitFor(()=>expect(post).toHaveBeenCalledTimes(1));
  expect(f.componentInstance.hasUnsavedChanges).toBe(true);
  expect(f.componentInstance.inlineDocumentWindowConfig!.lineRows!.filter(row=>row['description']==='Paper')).toHaveLength(2);
  expect(post).toHaveBeenCalledTimes(1);f.destroy();
 });

 it('serializes copied creates and keeps pending ownership until the last server response',async()=>{
  const {f,post}=await create(false,true,true);
  const first=new Subject<any>(),second=new Subject<any>();let call=0;
  post.mockImplementation(()=>++call===1?first:second);
  f.componentInstance.handleInlineAction({actionKey:'cmd:line-copy',payload:{selectedIndexes:[0,1]}});
  await vi.waitFor(()=>expect(post).toHaveBeenCalledTimes(1));expect(f.componentInstance.hasPendingWrites).toBe(true);
  first.next({data:{id:'copy-one',lineNo:30000,description:'Paper',quantity:'2.123456'}});first.complete();
  await vi.waitFor(()=>expect(post).toHaveBeenCalledTimes(2));expect(f.componentInstance.hasPendingWrites).toBe(true);
  expect(post.mock.calls[1][1]).toEqual({description:'Toner',quantity:'3'});
  second.next({data:{id:'copy-two',lineNo:40000,description:'Toner',quantity:'3'}});second.complete();
  await vi.waitFor(()=>expect(f.componentInstance.hasPendingWrites).toBe(false));
  const copies=f.componentInstance.inlineDocumentWindowConfig!.lineRows!.filter(row=>String(row['id']).startsWith('copy-'));
  expect(copies.map(row=>row['lineNo'])).toEqual([30000,40000]);f.destroy();
 });
 it('stops a multi-line create sequence after failure and retains the remaining drafts',async()=>{
  const {f,post}=await create(false,true,true);
  post.mockImplementation(()=>throwError(()=>({status:422,error:{message:'Invalid row'}})));
  f.componentInstance.handleInlineAction({actionKey:'cmd:line-copy',payload:{selectedIndexes:[0,1]}});
  await vi.waitFor(()=>expect(post).toHaveBeenCalledTimes(1));expect(f.componentInstance.hasPendingWrites).toBe(false);
  expect(f.componentInstance.hasUnsavedChanges).toBe(true);
  expect(f.componentInstance.inlineDocumentWindowConfig!.lineRows!.filter(row=>row['description']==='Toner')).toHaveLength(2);f.destroy();
 });
 it('rejects Copy Line when creation is disabled',async()=>{
  const {f,post}=await create(false,false);const before=f.componentInstance.inlineDocumentWindowConfig!.lineRows;
  f.componentInstance.handleInlineAction({actionKey:'cmd:line-copy',payload:{selectedIndexes:[0]}});
  expect(f.componentInstance.inlineDocumentWindowConfig!.lineRows).toBe(before);expect(post).not.toHaveBeenCalled();f.destroy();
 });
 it('makes a pasted row use the same protected-field and draft creation path',async()=>{
  const {f,post}=await create();f.componentInstance.handleInlineAction({actionKey:'cmd:line-paste',payload:{rows:[{id:'forged',lineNo:90000,status:'posted',description:'Pasted',quantity:'4.000001',amount:'999'}]}});
  const pasted=f.componentInstance.inlineDocumentWindowConfig!.lineRows!.find(row=>row['description']==='Pasted')!;
  expect(pasted).toBeDefined();expect(pasted['id']).toBeUndefined();expect(pasted['status']).toBeUndefined();expect(pasted['lineNo']).not.toBe(90000);
  expect(post).not.toHaveBeenCalled();f.destroy();
 });
 it('exposes the same productivity commands on the worksheet header',async()=>{
  const {f}=await create(true);const commands=f.componentInstance.inlineDocumentWindowConfig!.headerToolbarButtons?.map(button=>button.actionKey);
  expect(commands).toContain('cmd:line-copy');expect(commands).toContain('cmd:line-paste');expect(commands).toContain('cmd:line-copy-rows');f.destroy();
 });


 it('direct cell paste updates an existing line through normal PATCH with its version and retains failed edits',async()=>{
  const {f}=await create(false,true,true),page=f.componentInstance;
  const rest=TestBed.inject(DATA_REST_SERVICE),patch=vi.spyOn(rest,'patch').mockReturnValue(throwError(()=>({status:422,error:{message:'Rejected test change'}})));
  f.detectChanges();const grid=f.debugElement.query(By.directive(DocumentLines)).componentInstance as DocumentLines;
  const index=grid.columns.findIndex(column=>column.id==='quantity');
  await grid.pasteText('7.123456',0,index);
  await vi.waitFor(()=>expect(patch).toHaveBeenCalledTimes(1));
  expect(patch.mock.calls[0][0]).toContain('/lines/line-a');expect(patch.mock.calls[0][1]).toEqual({quantity:'7.123456'});expect(patch.mock.calls[0][2]).toBe('"5"');
  expect(page.inlineDocumentWindowConfig!.lineRows![0]['quantity']).toBe('7.123456');expect(page.hasUnsavedChanges).toBe(true);
  expect(f.nativeElement.querySelector('.line-paste-preview')).toBeNull();f.destroy();
 });
 it('direct blank-line paste uses the existing serial create queue and stops on failed saves',async()=>{
  const {f,post}=await create(false,true,true),page=f.componentInstance;const response=new Subject<{data:{id:string;lineNo:number;systemRowVersion:number;description:string;quantity:string}}>();
  post.mockImplementationOnce(()=>response).mockImplementation(()=>throwError(()=>({status:422,error:{message:'Rejected second line'}})));
  f.detectChanges();const grid=f.debugElement.query(By.directive(DocumentLines)).componentInstance as DocumentLines;
  const start=grid.rows.findIndex(row=>row['__entryPlaceholder']);
  await grid.pasteText('Paste A\t4\nPaste B\t5\nPaste C\t6',start,grid.columns.findIndex(column=>column.id==='description'));
  await vi.waitFor(()=>expect(post).toHaveBeenCalledTimes(1));expect(post.mock.calls[0][1]).toEqual({description:'Paste A',quantity:'4'});
  response.next({data:{id:'created-a',lineNo:30000,description:'Paste A',quantity:'4',systemRowVersion:1}});response.complete();
  await vi.waitFor(()=>expect(post).toHaveBeenCalledTimes(2));await f.whenStable();
  expect(post).toHaveBeenCalledTimes(2);expect(page.hasUnsavedChanges).toBe(true);
  expect(page.inlineDocumentWindowConfig!.lineRows!.filter(row=>String(row['description']).startsWith('Paste'))).toHaveLength(3);
  expect(f.nativeElement.querySelector('.line-paste-preview')).toBeNull();f.destroy();
 });

});
