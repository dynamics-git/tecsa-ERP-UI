
import { ConfirmationService } from '../../../shared/ui/confirmation.service';
import { By } from '@angular/platform-browser';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { of, Subject } from 'rxjs';
import { DocumentPage } from './document-page';
import { DocumentLines } from '../../document/document-lines/document-lines';
import { DATA_REST_SERVICE } from '../../data/data-source.service';
import { SessionService } from '../../../core/services/session.service';
import { providePlatformGovernance } from '../../../core/providers/platform-governance.provider';
import { purchaseRequisitionHeaderConfig, purchaseRequisitionLineConfig, purchaseRequisitionListConfig } from '../../../features/purchasing/purchase-requisition/purchase-requisition.config';

afterEach(()=>{vi.restoreAllMocks();TestBed.resetTestingModule();});
describe('Simplified PR configuration through shared autosave (mock API)',()=>{
 it.each([false,true])('creates and reopens PR through login permissions without capability discovery (SuperAdmin=%s)',async(superAdmin)=>{
  let header:Record<string,unknown>={systemId:'header',number:'PR-TEST',status:'open',requestDate:'2026-10-27',locationId:'main',systemRowVersion:1};
  const rows:Record<string,unknown>[]=[];
  const beforeCreate=vi.fn(()=>undefined),afterCreate=vi.fn(()=>undefined),beforeUpdate=vi.fn(()=>undefined),afterUpdate=vi.fn(()=>undefined);
  const patch=vi.fn((path:string,payload:Record<string,unknown>)=>{
   const target=path.includes('/lines/')?rows.find(r=>path.endsWith('/'+r['systemId']))!:header;
   // Match Laravel's existing ConvertEmptyStringsToNull middleware.
   const stored=Object.fromEntries(Object.entries(payload).map(([key,value])=>[key,value === '' ? null : value]));
   Object.assign(target,stored,{systemRowVersion:Number(target['systemRowVersion'])+1});
   if(path.includes('/lines/')) target['estimatedAmount']=(Number(target['quantity'])*Number(target['estimatedUnitCost'])).toFixed(6);
   return of({data:structuredClone(target)});
  });
  const post=vi.fn((_path:string,payload:Record<string,unknown>)=>{
   const row={estimatedAmount:(Number(payload['quantity'])*Number(payload['estimatedUnitCost'])).toFixed(6),...(payload['lineType']==='item'?{unitOfMeasureId:'ea',locationId:'main'}:{}),...payload,systemId:'line-'+(rows.length+1),lineNo:(rows.length+1)*10000,systemRowVersion:1};
   rows.push(row);return of({data:structuredClone(row)});
  });
  TestBed.configureTestingModule({imports:[DocumentPage],providers:[provideRouter([]),...providePlatformGovernance(),{provide:DATA_REST_SERVICE,useValue:{
   get:(path:string)=>{expect(path).not.toContain('/apiCapabilities');return of({data:path.includes('/lines')?structuredClone(rows):path.includes('/purchaseRequisitions')?structuredClone(header):[]});},post,patch,delete:()=>of({})
  }}]});
  TestBed.inject(SessionService).SuperAdmin=superAdmin;
  TestBed.inject(SessionService).Permissions=[{pageId:'purchase-requisition',canRead:true,canCreate:true,canUpdate:true,canDelete:true,canExecute:true}];
  vi.spyOn(TestBed.inject(SessionService),'Company','get').mockReturnValue('test-company');
  const open=async()=>{
   const f=TestBed.createComponent(DocumentPage);
   const {autoSave,...list}=purchaseRequisitionListConfig;
   const {newRecordDefaults,keyField,...source}=list.dataSource;
   f.componentRef.setInput('pageId','purchase-requisition');f.componentRef.setInput('documentOnly',true);f.componentRef.setInput('initialRecord',structuredClone(header));
   f.componentRef.setInput('listConfig',{...list,dataSource:source});f.componentRef.setInput('headerConfig',purchaseRequisitionHeaderConfig);const {keyField:lineKey,...lineSource}=purchaseRequisitionLineConfig.dataSource; f.componentRef.setInput('lineConfig',{...purchaseRequisitionLineConfig,dataSource:{...lineSource,hooks:{beforeCreate,afterCreate,beforeUpdate,afterUpdate}}});
   f.detectChanges();await f.whenStable();await vi.waitFor(()=>expect(f.componentInstance.popupLoading).toBe(false));f.detectChanges();return f;
  };
  const f=await open(),page=f.componentInstance;
  expect(post).not.toHaveBeenCalled();
  expect(page.headerConfig.sections.flatMap(section=>section.fields).find(field=>field.key==='requiredDate')?.defaultValue).toBeUndefined();
  expect(page.lineConfig?.columns.find(column=>column.id==='locationId')?.lookup?.searchFields).toBeUndefined();
  page.handleInlineAction({actionKey:'header:changed',payload:{fieldKey:'requiredDate',value:'',previousValue:'2026-10-28'}});
  await vi.waitFor(()=>expect(header['requiredDate']).toBeNull());
  expect(patch.mock.calls.at(-1)![1]).toEqual({requiredDate:''});
  page.handleInlineAction({actionKey:'header:changed',payload:{fieldKey:'purpose',value:'Autosave review',previousValue:''}});
  await vi.waitFor(()=>expect(header['purpose']).toBe('Autosave review'));
  const grid=f.debugElement.query(By.directive(DocumentLines)).componentInstance as DocumentLines;
  const edit=(row:Record<string,unknown>,field:string,value:unknown)=>grid.updateCellValue(grid.columns.find(c=>c.id===field)!,row,value);
  const row=page.inlineDocumentWindowConfig!.lineRows!.find(r=>r['__entryPlaceholder'])!;
  edit(row,'quantity','3');
  expect(grid.getCellValue(row,grid.columns.find(c=>c.id==='quantity')!)).toBe('3');
  expect(grid.cellError(row,grid.columns.find(c=>c.id==='quantity')!)).toContain('Choose No.');
  expect(row['quantity']).toBe('1');
  expect(post).not.toHaveBeenCalled();
  expect(page.hasUnsavedChanges).toBe(true);
  const confirm=vi.spyOn(TestBed.inject(ConfirmationService),'confirm').mockResolvedValue(false);
  const refusedClose=vi.fn();const closeSubscription=page.closeRequested.subscribe(refusedClose);
  await page.requestClose();expect(confirm).toHaveBeenCalledOnce();expect(refusedClose).not.toHaveBeenCalled();
  closeSubscription.unsubscribe();confirm.mockRestore();
  edit(row,'description','Incomplete draft');await vi.waitFor(()=>expect(post).toHaveBeenCalledTimes(1));
  expect(rows[0]['description']).toBe('Incomplete draft');
  row['__options_itemId']=[{value:123,label:'ITEM',record:{description:'Item description'}}];
  edit(row,'itemId',123);await vi.waitFor(()=>expect(rows[0]['itemId']).toBe(123));
  expect(patch.mock.calls.at(-1)![1]).toMatchObject({itemId:123,description:'Item description'});
  expect(post.mock.calls[0][1]).not.toHaveProperty('estimatedAmount');expect(post.mock.calls[0][1]).not.toHaveProperty('locationId');
  edit(row,'quantity','3');await vi.waitFor(()=>expect(rows[0]['quantity']).toBe('3'));
  expect(patch.mock.calls.at(-1)![1]).toEqual({quantity:'3'});
  edit(row,'estimatedUnitCost','12.50');await vi.waitFor(()=>expect(rows[0]['estimatedAmount']).toBe('37.500000'));
  expect(patch.mock.calls.at(-1)![1]).toEqual({estimatedUnitCost:'12.50'});
  expect(page.inlineDocumentWindowConfig!.lineTotals).toMatchObject({subtotal:'37.50',sst:'0.00',total:'37.50'});
  const count=patch.mock.calls.length;edit(row,'lineType','gl_account');await vi.waitFor(()=>expect(patch).toHaveBeenCalledTimes(count+1));
  expect(rows[0]['lineType']).toBe('gl_account');
  row['__options_glAccountId']=[{value:456,label:'GL',record:{name:'Account description'}}];
  edit(row,'glAccountId',456);await vi.waitFor(()=>expect(rows[0]['glAccountId']).toBe(456));
  expect(rows[0]).toMatchObject({lineType:'gl_account',itemId:null,description:'Account description',quantity:'3',unitOfMeasureId:null,locationId:null});
  edit(row,'lineType','item');edit(row,'itemId',123);await vi.waitFor(()=>expect(rows[0]['lineType']).toBe('item'));
  expect(rows[0]).toMatchObject({glAccountId:null,itemId:123,description:'Item description',quantity:'3'});
  edit(row,'unitOfMeasureId','box');await vi.waitFor(()=>expect(rows[0]['unitOfMeasureId']).toBe('box'));
  expect(patch.mock.calls.at(-1)![1]).toEqual({unitOfMeasureId:'box'});
  edit(row,'locationId','secondary');await vi.waitFor(()=>expect(rows[0]['locationId']).toBe('secondary'));
  expect(patch.mock.calls.at(-1)![1]).toEqual({locationId:'secondary'});
  edit(row,'requiredDate','2026-10-29');await vi.waitFor(()=>expect(rows[0]['requiredDate']).toBe('2026-10-29'));
  edit(row,'requiredDate','');await vi.waitFor(()=>expect(rows[0]['requiredDate']).toBeNull());
  expect(patch.mock.calls.at(-1)![1]).toEqual({requiredDate:''});
  expect(post.mock.calls[0][0]).toBe('/purchaseRequisitions/header/lines');
  f.detectChanges();const other=page.inlineDocumentWindowConfig!.lineRows!.find(r=>r['__entryPlaceholder'])!;
  edit(other,'lineType','gl_account');await vi.waitFor(()=>expect(post).toHaveBeenCalledTimes(2));
  other['__options_glAccountId']=[{value:456,label:'GL',record:{name:'Account description'}}];
  edit(other,'glAccountId',456);await vi.waitFor(()=>expect(rows[1]['glAccountId']).toBe(456));
  expect(rows[1]).toMatchObject({lineType:'gl_account',glAccountId:456,description:'Account description'});
  expect(beforeCreate).toHaveBeenCalledTimes(post.mock.calls.length);expect(afterCreate).toHaveBeenCalledTimes(post.mock.calls.length);
  expect(beforeUpdate).toHaveBeenCalledTimes(patch.mock.calls.filter(([path])=>path.includes('/lines/')).length);expect(afterUpdate).toHaveBeenCalledTimes(beforeUpdate.mock.calls.length);
  expect(page.hasPendingWrites).toBe(false);expect(page.hasUnsavedChanges).toBe(false);
  const closed=vi.fn();page.closeRequested.subscribe(closed);await page.requestClose();expect(closed).toHaveBeenCalledOnce();f.destroy();
  // The API stores null; the line editor displays it as an empty string.
  expect(rows[0]['requiredDate']).toBeNull();
  const reopened=await open();expect(reopened.componentInstance.inlineDocumentWindowConfig!.headerData!['purpose']).toBe('Autosave review');
  expect(reopened.componentInstance.inlineDocumentWindowConfig!.headerData!['requiredDate']).toBeNull();
  expect(reopened.componentInstance.inlineDocumentWindowConfig!.lineTotals).toMatchObject({subtotal:'37.50',sst:'0.00',total:'37.50'});
  expect(reopened.componentInstance.inlineDocumentWindowConfig!.lineRows).toEqual(expect.arrayContaining([expect.objectContaining({itemId:123,quantity:'3',unitOfMeasureId:'box',locationId:'secondary',requiredDate:''}),expect.objectContaining({glAccountId:456})]));reopened.destroy();
 });
 it('runs PR header update hooks only when Manual Save is requested',async()=>{
  const header={systemId:'manual-header',number:'PR-MANUAL',status:'open',requestDate:'2026-10-28',purpose:'Before',systemRowVersion:1};
  const beforeUpdate=vi.fn(()=>undefined),afterUpdate=vi.fn(()=>undefined),post=vi.fn();
  const patch=vi.fn((_path:string,payload:Record<string,unknown>)=>of({data:{...header,...payload,systemRowVersion:2}}));
  TestBed.configureTestingModule({imports:[DocumentPage],providers:[provideRouter([]),...providePlatformGovernance(),{provide:DATA_REST_SERVICE,useValue:{get:()=>of({data:header}),post,patch,delete:()=>of(null)}}]});
  TestBed.inject(SessionService).SuperAdmin=true;
  const f=TestBed.createComponent(DocumentPage);f.componentRef.setInput('pageId','purchase-requisition');f.componentRef.setInput('documentOnly',true);f.componentRef.setInput('initialRecord',header);
  f.componentRef.setInput('listConfig',{...purchaseRequisitionListConfig,autoSave:false,dataSource:{...purchaseRequisitionListConfig.dataSource,hooks:{beforeUpdate,afterUpdate}}});f.componentRef.setInput('headerConfig',purchaseRequisitionHeaderConfig);
  f.detectChanges();await f.whenStable();const page=f.componentInstance;
  page.handleInlineAction({actionKey:'header:changed',payload:{fieldKey:'purpose',value:'Manual edit',previousValue:'Before'}});
  expect(patch).not.toHaveBeenCalled();expect(beforeUpdate).not.toHaveBeenCalled();expect(post).not.toHaveBeenCalled();
  page.handleInlineAction({actionKey:'cmd:save'});await vi.waitFor(()=>expect(patch).toHaveBeenCalledOnce());expect(beforeUpdate).toHaveBeenCalledOnce();expect(afterUpdate).toHaveBeenCalledOnce();f.destroy();
 });

});

describe('PR pending-write and draft action guards',()=>{
 it.each([false,true])('retains pending edits across blocked refresh/new/close; failed=%s',async(failed)=>{
  const header={systemId:'guard-header',number:'PR-GUARD',status:'open',requestDate:'2026-10-28',purpose:'Before',systemRowVersion:1};
  const response=new Subject<unknown>(),get=vi.fn(()=>of({data:header})),post=vi.fn(()=>of({})),patch=vi.fn(()=>response);
  TestBed.configureTestingModule({imports:[DocumentPage],providers:[provideRouter([]),...providePlatformGovernance(),{provide:DATA_REST_SERVICE,useValue:{get,post,patch,delete:()=>of(null)}}]});
  TestBed.inject(SessionService).SuperAdmin=true;
  const f=TestBed.createComponent(DocumentPage);f.componentRef.setInput('pageId','purchase-requisition');f.componentRef.setInput('documentOnly',true);f.componentRef.setInput('initialRecord',header);
  f.componentRef.setInput('listConfig',purchaseRequisitionListConfig);f.componentRef.setInput('headerConfig',purchaseRequisitionHeaderConfig);f.detectChanges();await f.whenStable();await vi.waitFor(()=>expect(f.componentInstance.popupLoading).toBe(false));f.detectChanges();
  const page=f.componentInstance,closed=vi.fn();page.closeRequested.subscribe(closed);
  page.handleInlineAction({actionKey:'header:changed',payload:{fieldKey:'purpose',value:'Pending edit',previousValue:'Before'}});
  await vi.waitFor(()=>expect(patch).toHaveBeenCalledOnce());expect(page.hasPendingWrites).toBe(true);
  const reads=get.mock.calls.length;const confirm=vi.spyOn(TestBed.inject(ConfirmationService),'confirm').mockResolvedValue(false);
  for(const command of ['refresh','new','submit'])page.handleInlineAction({actionKey:'cmd:'+command});
  await page.requestClose();expect(closed).not.toHaveBeenCalled();expect(get).toHaveBeenCalledTimes(reads);expect(post).not.toHaveBeenCalled();expect(confirm).not.toHaveBeenCalled();
  if(failed) response.error({status:422,error:{message:'Purpose was rejected'}});
  else {response.next({data:{...header,purpose:'Pending edit',systemRowVersion:2}});response.complete();}
  await vi.waitFor(()=>expect(page.hasPendingWrites).toBe(false));
  expect(page.inlineDocumentWindowConfig?.headerData?.['purpose']).toBe('Pending edit');
  await page.requestClose();if(failed){expect(closed).not.toHaveBeenCalled();expect(confirm).toHaveBeenCalled();expect(page.hasUnsavedChanges).toBe(true);}else expect(closed).toHaveBeenCalledOnce();
  f.destroy();
 });
 it('blocks Submit with an invalid draft even when the persisted record is clean',async()=>{
  const header={systemId:'guard-header',number:'PR-GUARD',status:'open',requestDate:'2026-10-28',systemRowVersion:1};
  const post=vi.fn(()=>of({data:header}));
  TestBed.configureTestingModule({imports:[DocumentPage],providers:[provideRouter([]),...providePlatformGovernance(),{provide:DATA_REST_SERVICE,useValue:{get:()=>of({data:header}),post,patch:()=>of({data:header}),delete:()=>of(null)}}]});TestBed.inject(SessionService).SuperAdmin=true;
  const f=TestBed.createComponent(DocumentPage);f.componentRef.setInput('pageId','purchase-requisition');f.componentRef.setInput('documentOnly',true);f.componentRef.setInput('initialRecord',header);f.componentRef.setInput('listConfig',purchaseRequisitionListConfig);f.componentRef.setInput('headerConfig',purchaseRequisitionHeaderConfig);f.detectChanges();await f.whenStable();await vi.waitFor(()=>expect(f.componentInstance.popupLoading).toBe(false));f.detectChanges();const page=f.componentInstance;
  page.handleInlineAction({actionKey:'header-draft',payload:{fieldKey:'purpose',invalid:true}});
  page.handleInlineAction({actionKey:'cmd:submit'});await Promise.resolve();expect(post).not.toHaveBeenCalled();
  page.handleInlineAction({actionKey:'header-draft',payload:{fieldKey:'purpose',invalid:false}});
  page.handleInlineAction({actionKey:'cmd:submit'});await vi.waitFor(()=>expect(post).toHaveBeenCalledOnce());f.destroy();
 });
});
