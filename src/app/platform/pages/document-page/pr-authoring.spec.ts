import { By } from '@angular/platform-browser';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';
import { DocumentPage } from './document-page';
import { DocumentLines } from '../../document/document-lines/document-lines';
import { DATA_REST_SERVICE } from '../../data/data-source.service';
import { SessionService } from '../../../core/services/session.service';
import { providePlatformGovernance } from '../../../core/providers/platform-governance.provider';
import { purchaseRequisitionHeaderConfig, purchaseRequisitionLineConfig, purchaseRequisitionListConfig } from '../../../features/purchasing/purchase-requisition/purchase-requisition.config';

afterEach(()=>TestBed.resetTestingModule());
describe('Simplified PR configuration through shared autosave (mock API)',()=>{
 it('creates Item and G/L lines, switches Type, fills Description and reopens persisted header/line edits without Save',async()=>{
  let header:Record<string,unknown>={systemId:'header',number:'PR-TEST',status:'open',requestDate:'2026-10-27',locationId:'main',systemRowVersion:1};
  const rows:Record<string,unknown>[]=[];
  const patch=vi.fn((path:string,payload:Record<string,unknown>)=>{
   const target=path.includes('/lines/')?rows.find(r=>path.endsWith('/'+r['systemId']))!:header;
   Object.assign(target,payload,{systemRowVersion:Number(target['systemRowVersion'])+1});
   return of({data:structuredClone(target)});
  });
  const post=vi.fn((_path:string,payload:Record<string,unknown>)=>{
   const row={...(payload['lineType']==='item'?{unitOfMeasureId:'ea',locationId:'main'}:{}),...payload,systemId:'line-'+(rows.length+1),lineNo:(rows.length+1)*10000,systemRowVersion:1};
   rows.push(row);return of({data:structuredClone(row)});
  });
  TestBed.configureTestingModule({imports:[DocumentPage],providers:[provideRouter([]),...providePlatformGovernance(),{provide:DATA_REST_SERVICE,useValue:{
   get:(path:string)=>of({data:path.includes('/lines')?structuredClone(rows):path.includes('/purchaseRequisitions')?structuredClone(header):[]}),post,patch,delete:()=>of({})
  }}]});
  TestBed.inject(SessionService).SuperAdmin=true;
  const open=async()=>{
   const f=TestBed.createComponent(DocumentPage);
   const {autoSave,...list}=purchaseRequisitionListConfig;
   const {newRecordDefaults,keyField,...source}=list.dataSource;
   f.componentRef.setInput('pageId','purchase-requisition');f.componentRef.setInput('documentOnly',true);f.componentRef.setInput('initialRecord',structuredClone(header));
   f.componentRef.setInput('listConfig',{...list,dataSource:source});f.componentRef.setInput('headerConfig',purchaseRequisitionHeaderConfig);const {keyField:lineKey,...lineSource}=purchaseRequisitionLineConfig.dataSource; f.componentRef.setInput('lineConfig',{...purchaseRequisitionLineConfig,dataSource:lineSource});
   f.detectChanges();await f.whenStable();await vi.waitFor(()=>expect(f.componentInstance.popupLoading).toBe(false));f.detectChanges();return f;
  };
  const f=await open(),page=f.componentInstance;
  page.handleInlineAction({actionKey:'header:changed',payload:{fieldKey:'purpose',value:'Autosave review',previousValue:''}});
  await vi.waitFor(()=>expect(header['purpose']).toBe('Autosave review'));
  const grid=f.debugElement.query(By.directive(DocumentLines)).componentInstance as DocumentLines;
  const edit=(row:Record<string,unknown>,field:string,value:unknown)=>grid.updateCellValue(grid.columns.find(c=>c.id===field)!,row,value);
  const row=page.inlineDocumentWindowConfig!.lineRows!.find(r=>r['__entryPlaceholder'])!;
  edit(row,'description','Incomplete draft');expect(post).not.toHaveBeenCalled();
  row['__options_itemId']=[{value:123,label:'ITEM',record:{description:'Item description'}}];
  edit(row,'itemId',123);await vi.waitFor(()=>expect(post).toHaveBeenCalledTimes(1));
  expect(post.mock.calls[0][1]).toMatchObject({itemId:123,description:'Item description'});
  expect(post.mock.calls[0][1]).not.toHaveProperty('estimatedAmount');expect(post.mock.calls[0][1]).not.toHaveProperty('locationId');
  edit(row,'quantity','3');await vi.waitFor(()=>expect(rows[0]['quantity']).toBe('3'));
  expect(patch.mock.calls.at(-1)![1]).toEqual({quantity:'3'});
  const count=patch.mock.calls.length;edit(row,'lineType','gl_account');expect(patch).toHaveBeenCalledTimes(count);
  row['__options_glAccountId']=[{value:456,label:'GL',record:{name:'Account description'}}];
  edit(row,'glAccountId',456);await vi.waitFor(()=>expect(rows[0]['glAccountId']).toBe(456));
  expect(rows[0]).toMatchObject({lineType:'gl_account',itemId:null,description:'Account description',quantity:'3',unitOfMeasureId:null,locationId:null});
  edit(row,'lineType','item');edit(row,'itemId',123);await vi.waitFor(()=>expect(rows[0]['lineType']).toBe('item'));
  expect(rows[0]).toMatchObject({glAccountId:null,itemId:123,description:'Item description',quantity:'3'});
  f.detectChanges();const other=page.inlineDocumentWindowConfig!.lineRows!.find(r=>r['__entryPlaceholder'])!;
  edit(other,'lineType','gl_account');expect(post).toHaveBeenCalledTimes(1);
  other['__options_glAccountId']=[{value:456,label:'GL',record:{name:'Account description'}}];
  edit(other,'glAccountId',456);await vi.waitFor(()=>expect(post).toHaveBeenCalledTimes(2));
  expect(rows[1]).toMatchObject({lineType:'gl_account',glAccountId:456,description:'Account description'});
  expect(page.hasPendingWrites).toBe(false);expect(page.hasUnsavedChanges).toBe(false);
  const closed=vi.fn();page.closeRequested.subscribe(closed);await page.requestClose();expect(closed).toHaveBeenCalledOnce();f.destroy();
  const reopened=await open();expect(reopened.componentInstance.inlineDocumentWindowConfig!.headerData!['purpose']).toBe('Autosave review');
  expect(reopened.componentInstance.inlineDocumentWindowConfig!.lineRows).toEqual(expect.arrayContaining([expect.objectContaining({itemId:123,quantity:'3'}),expect.objectContaining({glAccountId:456})]));reopened.destroy();
 });
});
