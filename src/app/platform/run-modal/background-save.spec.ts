import { DocumentConfigDataService } from '../data/document-config-data.service';
import { Component, Input, InjectionToken, inject } from '@angular/core';
import { RunModalHost } from './run-modal-host/run-modal-host';
import { RunModalPageWindow } from '../models/run-modal-host-data.model';
import { RunModalPageDefinitionResolverService } from './run-modal-page-definition-resolver.service';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { describe,it,expect,vi } from 'vitest';
import { of,Subject } from 'rxjs';
import { routes } from '../../app.routes';
import { itemsHeaderConfig } from '../../features/purchase-masters/items/items.config';
import { providePlatformGovernance } from '../../core/providers/platform-governance.provider';
import { SessionService } from '../../core/services/session.service';
import { DATA_REST_SERVICE } from '../data/data-source.service';
import { RUNTIME_TIMEOUT_POLICY } from '../data/runtime-timeout-policy.token';
import { RunModalService } from './run-modal.service';
import { ListPage } from '../pages/list-page/list-page';

describe('Shared save status with isolated API fixtures',()=>{
 async function create(waitMs=15000){
  const route=routes.find(route=>route.path==='')!.children!.find(route=>route.path==='items')!;
  const empty=Object.fromEntries(itemsHeaderConfig.sections.flatMap(section=>section.fields).map(field=>[field.key,null]));
  const records=['one','two'].map(id=>({...empty,systemId:id,number:id,description:'Original '+id,systemRowVersion:1}));
  const pending=new Subject<unknown>();const patch=vi.fn(()=>pending);
  const get=vi.fn((url:string)=>url.startsWith('/items?')?of({data:records,meta:{total:2,recordShape:'complete'}}):of({data:records.find(record=>url.endsWith('/'+record.systemId)) ?? [],meta:{total:0}}));
  TestBed.configureTestingModule({imports:[route.component!],providers:[provideRouter([]),...providePlatformGovernance(),{provide:DATA_REST_SERVICE,useValue:{get,patch}},{provide:RUNTIME_TIMEOUT_POLICY,useValue:{requestTimeoutMs:waitMs,hydrationTimeoutMs:8000}}]});
  TestBed.inject(SessionService).SuperAdmin=true;
  const f=TestBed.createComponent(route.component!);f.detectChanges();
  const root=f.debugElement.query(By.directive(ListPage)).componentInstance as ListPage;
  await vi.waitFor(()=>expect(root.rows).toHaveLength(2));
  const cards=()=>f.debugElement.queryAll(By.directive(ListPage)).map(e=>e.componentInstance as ListPage).filter(page=>page.documentOnly);
  root.openRecord(root.rows[0]);await f.whenStable();f.detectChanges();
  await vi.waitFor(()=>{f.detectChanges();expect(cards()[0]?.inlineDocumentWindowConfig?.contentReady).toBe(true);});
  const card=cards()[0];
  card.handleInlineAction({actionKey:'header:changed',payload:{fieldKey:'description',value:'My retained edit',previousValue:'Original one'}});
  await vi.waitFor(()=>expect(patch).toHaveBeenCalledTimes(1));
  const modal=TestBed.inject(RunModalService);get.mockClear();
  await card.requestClose();await f.whenStable();f.detectChanges();
  expect(modal.backgroundFor('items')[0]?.state).toBe('saving');expect(root.loading).toBe(false);
  expect(f.nativeElement.querySelector('.save-status')?.textContent).toContain('Saving changes');
  expect(f.nativeElement.querySelector('.popup-layer')?.style.display).toBe('none');
  expect(get).not.toHaveBeenCalled();
  return {f,root,card,cards,modal,pending,patch,get,records};
 }
 it('continues saving after close, allows another row to open, and updates only the confirmed row',async()=>{
  const {f,root,card,cards,modal,pending,get,records}=await create();
  root.openRecord(root.rows[0]);await f.whenStable();f.detectChanges();expect(cards()).toHaveLength(1);
  root.openRecord(root.rows[1]);await f.whenStable();f.detectChanges();
  await vi.waitFor(()=>{f.detectChanges();expect(cards().find(page=>page.initialRecord?.['systemId']==='two')?.inlineDocumentWindowConfig?.contentReady).toBe(true);});
  const other=cards().find(page=>page!==card)!;
  pending.next({data:{...records[0],description:'Server confirmed',systemRowVersion:2}});pending.complete();
  await vi.waitFor(()=>{f.detectChanges();expect((root.rows[0] as any).description).toBe('Server confirmed');});
  expect(modal.backgroundFor('items')[0].state).toBe('saved');expect(cards()).toEqual([other]);
  expect(other.inlineDocumentWindowConfig?.headerData?.['description']).toBe('Original two');
  expect(root.loading).toBe(false);expect(get).not.toHaveBeenCalled();f.destroy();
 });
 it('retains the original editor and unsaved values on failure without retrying the write',async()=>{
  const {f,card,cards,modal,pending,patch,get}=await create();
  pending.error({status:422,error:{message:'Fixture validation error'}});
  await vi.waitFor(()=>expect(modal.backgroundFor('items')[0]?.state).toBe('error'));
  const notice=modal.backgroundFor('items')[0];modal.resumeSave(notice.id);await f.whenStable();f.detectChanges();
  expect(cards()[0]).toBe(card);expect(card.inlineDocumentWindowConfig?.headerData?.['description']).toBe('My retained edit');
  expect(card.hasUnsavedChanges).toBe(true);expect(f.nativeElement.querySelector('.popup-layer')?.style.display).not.toBe('none');
  expect(patch).toHaveBeenCalledTimes(1);expect(get).not.toHaveBeenCalled();f.destroy();
 });
 it('never applies a late response or notice to another company',async()=>{
  const {f,root,modal,pending,records}=await create();
  TestBed.inject(SessionService).Company='different-fixture-company';
  expect(modal.backgroundFor('items')).toHaveLength(0);
  pending.next({data:{...records[0],description:'Old company response',systemRowVersion:2}});pending.complete();
  await f.whenStable();f.detectChanges();
  expect((root.rows[0] as any).description).toBe('Original one');expect(modal.backgroundFor('items')).toHaveLength(0);f.destroy();
 });
 it('keeps filter membership, changed sort keys and partial responses under server query control',()=>{
  const policy=new DocumentConfigDataService({} as any);
  const before={systemId:'one',description:'Original',blocked:false,systemRowVersion:1};
  const saved={...before,description:'Saved',systemRowVersion:2};const source={endpoint:'/fixtures',defaultSort:'systemId asc'};
  expect(policy.canSynchronizeListRecord([before],before,saved,source,'blocked eq false')).toBe(true);
  expect(policy.canSynchronizeListRecord([before],before,{...saved,blocked:true},source,'blocked eq false')).toBe(false);
  expect(policy.canSynchronizeListRecord([before],before,saved,{...source,defaultSort:'description asc'})).toBe(false);
  expect(policy.canSynchronizeListRecord([before],before,{systemId:'one',systemRowVersion:2},source)).toBe(false);
  expect(policy.canSynchronizeListRecord([],before,saved,source)).toBe(false);
 });
 it('replaces indefinite progress with an unknown status and checks the server without resubmitting',async()=>{
  const {f,modal,pending,patch,get}=await create(40);
  await vi.waitFor(()=>expect(modal.backgroundFor('items')[0]?.state).toBe('unknown'));
  const notice=modal.backgroundFor('items')[0];await modal.verifySave(notice.id);
  expect(get).toHaveBeenCalledTimes(1);expect(patch).toHaveBeenCalledTimes(1);
  expect(modal.backgroundFor('items')[0].message).toContain('not confirmed');
  pending.error({status:0});await vi.waitFor(()=>expect(modal.backgroundFor('items')[0]?.state).toBe('unknown'));
  expect(patch).toHaveBeenCalledTimes(1);f.destroy();
 });
});

const FIXTURE_PAGE = new InjectionToken<any>('Background save fixture page');
@Component({standalone:true,imports:[ListPage],template:'<app-list-page [pageId]="pageId" [listConfig]="definition.list" [headerConfig]="definition.header" [lineConfig]="definition.line" [documentOnly]="true" [initialRecord]="runModal?.record" (closeRequested)="runModal?.close()" />'})
class FixturePage { @Input() runModal?:RunModalPageWindow;readonly pageId='fixture';readonly definition=inject(FIXTURE_PAGE); }

describe('Shared background lifecycle across page types',()=>{
 for(const type of ['card','document','setup','worksheet'])it(type+' retains a pending header or line save after the window closes',async()=>{
  const parent={id:'parent',code:'PR',description:'Original',systemRowVersion:1};
  const line={id:'line',lineNo:10000,quantity:2,systemRowVersion:1};const pending=new Subject<unknown>();
  const patch=vi.fn(()=>pending);
  const definition={list:{pageId:'fixture',pageType:type,title:'Fixture',autoSave:true,dataSource:{endpoint:'/fixtures',keyField:'id',singleton:type==='setup',supportsUpdate:true},dataSurface:{columns:[{field:'code',label:'Code'}]}},header:{dialogTitle:'Fixture',toolbarButtons:[],sections:[{id:'general',fields:[{key:'description',label:'Description'}]}]},line:['document','worksheet'].includes(type)?{placement:{mode:'end'},toolbarButtons:[],dataSource:{endpoint:'/lines',keyField:'id',navigation:{parentEndpoint:'/fixtures',parentIdFields:['id'],childCollection:'lines'}},columns:[{id:'lineNo',label:'Line',readonly:true},{id:'quantity',label:'Quantity',valueType:'number'}],fields:[{key:'quantity',label:'Quantity',valueType:'number'}]}:undefined};
  const module={FixturePage,fixtureListConfig:definition.list};
  TestBed.configureTestingModule({imports:[RunModalHost],providers:[provideRouter([]),...providePlatformGovernance(),{provide:FIXTURE_PAGE,useValue:definition},{provide:RunModalPageDefinitionResolverService,useValue:{resolve:async()=>({pageId:'fixture',module})}},{provide:DATA_REST_SERVICE,useValue:{get:(url:string)=>of({data:url.includes('/lines')?[{...line}]:{...parent},meta:{total:1}}),patch,put:patch}}]});
  TestBed.inject(SessionService).SuperAdmin=true;
  const f=TestBed.createComponent(RunModalHost);f.detectChanges();const modal=TestBed.inject(RunModalService);
  expect(await modal.open({pageId:'fixture',target:'entry',context:{headerData:{...parent}}})).toBe(true);
  await f.whenStable();f.detectChanges();
  const page=f.debugElement.query(By.directive(ListPage)).componentInstance as ListPage;
  await vi.waitFor(()=>expect(['document','worksheet'].includes(type)?page.inlineDocumentWindowConfig?.lineRows?.some(row=>row['id']==='line'):page.inlineDocumentWindowConfig?.contentReady).toBe(true));
  if(['document','worksheet'].includes(type)){
   const row=page.inlineDocumentWindowConfig!.lineRows![0];row['quantity']=3;
   const column=page.inlineDocumentWindowConfig!.lineColumns!.find(c=>c.id==='quantity')!;
   page.handleInlineAction({actionKey:'line:changed',payload:{row,column,value:3,previousValue:2,rowIndex:0}});
  }else page.handleInlineAction({actionKey:'header:changed',payload:{fieldKey:'description',value:'Retained',previousValue:'Original'}});
  await vi.waitFor(()=>expect(patch).toHaveBeenCalledTimes(1));
  await page.requestClose();await f.whenStable();f.detectChanges();
  expect(modal.backgroundFor('fixture')[0]?.state).toBe('saving');expect(f.nativeElement.querySelector('.popup-layer').style.display).toBe('none');
  pending.error({status:422});await vi.waitFor(()=>expect(modal.backgroundFor('fixture')[0]?.state).toBe('error'));
  modal.resumeSave(modal.backgroundFor('fixture')[0].id);await f.whenStable();f.detectChanges();
  expect(f.debugElement.query(By.directive(ListPage)).componentInstance).toBe(page);
  expect(['document','worksheet'].includes(type)?page.inlineDocumentWindowConfig?.lineRows?.[0]['quantity']:page.inlineDocumentWindowConfig?.headerData?.['description']).toBe(['document','worksheet'].includes(type)?3:'Retained');
  expect(patch).toHaveBeenCalledTimes(1);f.destroy();
 });
});
