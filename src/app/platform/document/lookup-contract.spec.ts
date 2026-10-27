import { By } from '@angular/platform-browser';
import { LineColumnConfig } from '../models/line-config.model';
import { DocumentConfigDataService } from '../data/document-config-data.service';
import { DocumentHydrationOrchestratorService } from '../data/document-hydration-orchestrator.service';
import { DocumentLines } from './document-lines/document-lines';
import { TestBed } from '@angular/core/testing';
import { describe,it,expect,vi } from 'vitest';
import { of,throwError,Subject } from 'rxjs';
import { DynamicForm } from '../../shared/ui/dynamic-form/dynamic-form';
import { LookupSelect } from '../../shared/ui/lookup-select/lookup-select';
import { DataSourceService } from '../data/data-source.service';
import { FieldConfig } from '../models/field-config.model';

describe('Shared lookup paging and keyboard contract',()=>{
 const records=Array.from({length:45},(_,id)=>({systemId:'fixture-'+id,code:'PR-'+id}));
 const field:FieldConfig={key:'series',label:'Series',lookup:{endpoint:'/fixtureSeries',valueField:'systemId',displayField:'code',dependsOn:[{field:'companyId',valueFrom:'company'}]}};
 function create(loadList:any){TestBed.configureTestingModule({imports:[DynamicForm],providers:[{provide:DataSourceService,useValue:{loadList,loadById:()=>of(records[0])}}]});const f=TestBed.createComponent(DynamicForm);f.componentRef.setInput('sections',[{id:'general',fields:[field]}]);f.componentRef.setInput('data',{company:'fixture-company'});f.detectChanges();return f;}
 it('loads 20, then 20, then the remainder; duplicate and end-of-results requests are ignored and search resets paging',async()=>{
  const load=vi.fn((_config:any,options:any)=>of({value:records.slice(options.skip,options.skip+20),meta:{total:45}}));const f=create(load),form=f.componentInstance;
  form.openLookup(field);await vi.waitFor(()=>expect(form.getFieldOptions(field).length).toBe(20));
  form.searchLookup(field,'',true);form.searchLookup(field,'',true);await vi.waitFor(()=>expect(form.getFieldOptions(field).length).toBe(40));
  form.searchLookup(field,'',true);await vi.waitFor(()=>expect(form.getFieldOptions(field).length).toBe(45));
  form.searchLookup(field,'',true);expect(load).toHaveBeenCalledTimes(3);expect(form.lookupHasMore).toBe(false);
  form.searchLookup(field,'PR');await vi.waitFor(()=>expect(load).toHaveBeenCalledTimes(4));expect(load.mock.calls[3][1].skip).toBe(0);expect(load.mock.calls[3][0].defaultFilter).toContain("companyId eq 'fixture-company'");expect(load.mock.calls[3][0].defaultFilter).toContain("contains(code, 'PR')");f.destroy();
 });
 it('retains loaded choices on a continuation error and retries the same page',async()=>{
  let attempt=0;const load=vi.fn((_config:any,options:any)=>++attempt===2?throwError(()=>new Error('offline')):of({value:records.slice(options.skip,options.skip+20),meta:{total:45}}));const f=create(load),form=f.componentInstance;
  form.openLookup(field);await vi.waitFor(()=>expect(form.getFieldOptions(field).length).toBe(20));form.searchLookup(field,'',true);await vi.waitFor(()=>expect(form.lookupError).not.toBe(''));
  expect(form.getFieldOptions(field).length).toBe(20);form.searchLookup(field,'',form.lookupRetryNextPage);await vi.waitFor(()=>expect(form.getFieldOptions(field).length).toBe(40));expect(load.mock.calls.map(call=>call[1].skip)).toEqual([0,20,20]);f.destroy();
 });
 it('does not let an obsolete lookup response replace a newer search',async()=>{
  const old=new Subject<unknown>(),fresh=new Subject<unknown>();const load=vi.fn().mockReturnValueOnce(old).mockReturnValueOnce(fresh);const f=create(load),form=f.componentInstance;
  form.openLookup(field);await vi.waitFor(()=>expect(load).toHaveBeenCalledTimes(1));form.searchLookup(field,'NEW');await vi.waitFor(()=>expect(load).toHaveBeenCalledTimes(2));
  fresh.next({value:[{systemId:'new',code:'NEW'}],meta:{total:1}});fresh.complete();old.next({value:records,meta:{total:45}});old.complete();expect(form.getFieldOptions(field).map(option=>option.value)).toEqual(['new']);f.destroy();
 });
 it('bounds 100,000 options, keeps keyboard selection visible and supports keyboard retry',()=>{
  TestBed.configureTestingModule({imports:[LookupSelect]});const f=TestBed.createComponent(LookupSelect),select=f.componentInstance;
  f.componentRef.setInput('label','Fixture lookup');f.componentRef.setInput('options',Array.from({length:100000},(_,id)=>({value:id,label:'Choice '+id})));f.detectChanges();
  const editor=f.nativeElement.querySelector('input');editor.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowUp',bubbles:true,cancelable:true}));f.detectChanges();
  expect(f.nativeElement.querySelectorAll('[role=option]').length).toBeLessThanOrEqual(60);expect(select.active).toBe(99999);expect(f.nativeElement.querySelector('[id="'+select.id+'-99999"]')).not.toBeNull();
  let retried=0;select.retried.subscribe(()=>retried++);f.componentRef.setInput('error','Unavailable');f.detectChanges();editor.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));expect(retried).toBe(1);f.destroy();
 });
 it('uses the top layer and flips above a bottom-edge editor without losing choice selection',()=>{
  TestBed.configureTestingModule({imports:[LookupSelect]});
  const show=vi.fn(),hide=vi.fn();
  const showDescriptor=Object.getOwnPropertyDescriptor(HTMLElement.prototype,'showPopover');
  const hideDescriptor=Object.getOwnPropertyDescriptor(HTMLElement.prototype,'hidePopover');
  Object.defineProperty(HTMLElement.prototype,'showPopover',{configurable:true,value:show});
  Object.defineProperty(HTMLElement.prototype,'hidePopover',{configurable:true,value:hide});
  let anchorTop=window.innerHeight-50;
  const geometry=vi.spyOn(HTMLElement.prototype,'getBoundingClientRect').mockImplementation(function(this:HTMLElement){
   if(this.tagName==='INPUT')return new DOMRect(window.innerWidth-320,anchorTop,300,36);
   if(this.classList.contains('lookup-popup'))return new DOMRect(0,0,300,200);
   return new DOMRect();
  });
  const f=TestBed.createComponent(LookupSelect),select=f.componentInstance;
  try {
   f.componentRef.setInput('options',[{label:'Selected choice',value:'choice'}]);f.detectChanges();
   f.nativeElement.querySelector('input').dispatchEvent(new FocusEvent('focus'));f.detectChanges();
   const popup=f.nativeElement.querySelector('.lookup-popup') as HTMLElement;
   expect(popup.getAttribute('popover')).toBe('manual');expect(show).toHaveBeenCalledTimes(1);
   expect(parseFloat(popup.style.top)).toBe(anchorTop-204);
   expect(parseFloat(popup.style.width)).toBe(300);
   anchorTop=20;window.dispatchEvent(new Event('resize'));
   expect(parseFloat(popup.style.top)).toBe(60);
   const selected=vi.fn();select.selected.subscribe(selected);
   popup.querySelector<HTMLButtonElement>('[role=option]')!.click();f.detectChanges();
   expect(selected).toHaveBeenCalledWith('choice');expect(hide).toHaveBeenCalled();
   expect(f.nativeElement.querySelector('.lookup-popup')).toBeNull();
  } finally {
   f.destroy();geometry.mockRestore();
   if(showDescriptor)Object.defineProperty(HTMLElement.prototype,'showPopover',showDescriptor);else delete (HTMLElement.prototype as any).showPopover;
   if(hideDescriptor)Object.defineProperty(HTMLElement.prototype,'hidePopover',hideDescriptor);else delete (HTMLElement.prototype as any).hidePopover;
  }
 });
 it('clears a hydrated header selection without reviving its saved caption, emitting null through the existing change flow',()=>{
  const load=vi.fn(()=>of({value:records,meta:{total:45}}));const f=create(load),form=f.componentInstance;
  const data:Record<string,unknown>={company:'fixture-company',series:'fixture-0',__display_series:'PR-0',__options_series:[records[0]]};
  f.componentRef.setInput('data',data);f.detectChanges();
  const changed=vi.fn();form.fieldChanged.subscribe(changed);
  expect(form.lookupLabel(field)).toBe('PR-0');form.chooseLookup(field,null);
  expect(data['series']).toBeNull();expect(changed).toHaveBeenCalledWith(expect.objectContaining({fieldKey:'series',value:null,previousValue:'fixture-0'}));
  expect(form.lookupLabel(field)).toBe('');
  form.openLookup(field);expect(form.lookupLabel(field)).toBe('');expect(data['series']).toBeNull();f.destroy();
 });
 it('keeps a cleared line lookup blank after late caption hydration',async()=>{
  let finish!:(rows:any[])=>void;const pending=new Promise<any[]>(resolve=>finish=resolve);
  TestBed.configureTestingModule({imports:[DocumentLines],providers:[{provide:DocumentHydrationOrchestratorService,useValue:{resolveLineLookups:()=>pending}},{provide:DataSourceService,useValue:{}}]});
  const f=TestBed.createComponent(DocumentLines),lines=f.componentInstance;
  const column={id:'series',label:'Series',lookup:{endpoint:'/fixtureSeries',valueField:'systemId',displayField:'code'}};
  const row:Record<string,unknown>={series:'fixture-0',__display_series:'PR-0',__options_series:[{label:'PR-0',value:'fixture-0',record:records[0]}]};
  f.componentRef.setInput('columns',[column]);f.componentRef.setInput('rows',[row]);f.detectChanges();
  const changed=vi.fn();lines.rowChanged.subscribe(changed);lines.updateCellValue(column,row,null);
  expect(row['series']).toBeNull();expect(changed).toHaveBeenCalledWith(expect.objectContaining({value:null,previousValue:'fixture-0'}));
  expect(lines.lookupDisplay(column,row)).toBe('');
  finish([{series:'fixture-0',__display_series:'PR-0'}]);await pending;await Promise.resolve();
  expect(row['series']).toBeNull();expect(lines.lookupDisplay(column,row)).toBe('');f.destroy();
 });
 it('opens cached choices synchronously and debounces only uncached typing',async()=>{
  vi.useFakeTimers();
  try {
   const load=vi.fn((_config:any,_options:any)=>of({value:records.slice(0,20),meta:{hasMore:true,total:null}}));
   const f=create(load),form=f.componentInstance;
   form.openLookup(field);
   expect(load).toHaveBeenCalledTimes(1);expect(form.lookupLoading).toBe(false);expect(form.lookupHasMore).toBe(true);
   form.searchLookup(field,'P');form.searchLookup(field,'PR');
   expect(load).toHaveBeenCalledTimes(1);
   await vi.advanceTimersByTimeAsync(249);expect(load).toHaveBeenCalledTimes(1);
   await vi.advanceTimersByTimeAsync(1);expect(load).toHaveBeenCalledTimes(2);
   const source=TestBed.inject(DataSourceService);
   (source as any).getCachedList=()=>({value:records.slice(0,20)});
   form.searchLookup(field,'PR');expect(load).toHaveBeenCalledTimes(3);expect(form.lookupLoading).toBe(false);
   expect(load.mock.calls[0][1]).toMatchObject({count:false,skip:0});f.destroy();
  } finally {vi.useRealTimers();}
 });
 it('keeps selected captions alive while another dropdown is searched, and never overwrites its choices',()=>{
  const caption=new Subject<unknown>();
  const lookup={endpoint:'/fixtureSeries',valueField:'systemId',displayField:'code'};
  const fields:FieldConfig[]=[{key:'a',label:'A',lookup},{key:'b',label:'B',lookup}];
  const load=vi.fn(()=>of({value:records.slice(0,20),meta:{hasMore:true}}));
  TestBed.configureTestingModule({imports:[DynamicForm],providers:[{provide:DataSourceService,useValue:{loadList:load,loadLookup:()=>caption}}]});
  const f=TestBed.createComponent(DynamicForm);f.componentRef.setInput('sections',[{id:'x',fields}]);f.componentRef.setInput('data',{a:'saved-a',b:'saved-b'});f.detectChanges();
  const form=f.componentInstance;form.openLookup(fields[0]);
  caption.next({systemId:'saved-a',code:'Saved'});
  expect(form.getFieldOptions(fields[0])).toHaveLength(20);expect(form.lookupLabel(fields[1])).toBe('Saved');
  expect(caption.observers.length).toBe(2);f.destroy();expect(caption.observers.length).toBe(0);
 });
 it('keeps batched line captions independent of an active choice search',async()=>{
  let finish!:(rows:any[])=>void;
  const pending=new Promise<any[]>(resolve=>finish=resolve);
  const hydrate=vi.fn(()=>pending);
  const load=vi.fn(()=>of({value:records.slice(0,20),meta:{hasMore:true}}));
  TestBed.configureTestingModule({imports:[DocumentLines],providers:[{provide:DocumentHydrationOrchestratorService,useValue:{resolveLineLookups:hydrate}},{provide:DataSourceService,useValue:{loadList:load}}]});
  const f=TestBed.createComponent(DocumentLines),lines=f.componentInstance;
  const lookup={endpoint:'/fixtureSeries',valueField:'systemId',displayField:'code'};
  const columns=[{id:'a',label:'A',lookup},{id:'b',label:'B',lookup}],row={a:'saved-a',b:'saved-b'};
  f.componentRef.setInput('columns',columns);f.componentRef.setInput('rows',[row]);f.detectChanges();
  lines.searchLookup(columns[0],row,'');expect(load).toHaveBeenCalledTimes(1);expect(lines.lookupLoading).toBe(false);
  finish([{...row,__options_a:[{value:'saved-a',label:'A saved'}],__options_b:[{value:'saved-b',label:'B saved'}]}]);
  await pending;await Promise.resolve();
  expect(lines.lookupDisplay(columns[1],row)).toBe('B saved');expect(lines.getOptions(columns[0],row)).toHaveLength(20);
  expect(hydrate).toHaveBeenCalledTimes(1);f.destroy();
 });

});

describe('Conditional line lookup identity',()=>{
 function create(){
  TestBed.configureTestingModule({imports:[DocumentLines],providers:[{provide:DataSourceService,useValue:{loadList:()=>of({value:[]}),loadById:()=>of({})}}]});
  const f=TestBed.createComponent(DocumentLines);
  const columns:LineColumnConfig[]=[
   {id:'kind',label:'Type',options:[{label:'First',value:'first'},{label:'Second',value:'second'}]},
   {id:'firstId',label:'No.',displayColumn:'choice',editableWhen:{field:'kind',values:['first']},lookup:{endpoint:'/first',valueField:'id',displayField:'code'}},
   {id:'secondId',label:'No.',displayColumn:'choice',editableWhen:{field:'kind',values:['second']},lookup:{endpoint:'/second',valueField:'id',displayField:'code'}},
   {id:'locationId',label:'Location',lookup:{endpoint:'/locations',valueField:'id',displayField:'code'}},
  ];
  f.componentRef.setInput('columns',columns);return {f,columns};
 }
 it('switches the rendered lookup and original API field, preserving numeric IDs across a save/reopen snapshot',()=>{
  const {f,columns}=create();const row={kind:'first',firstId:123,secondId:456,locationId:789};
  f.componentRef.setInput('rows',[row]);f.detectChanges();
  let controls=f.debugElement.queryAll(By.directive(LookupSelect));
  expect(controls[0].componentInstance.value).toBe(123);expect(controls[1].componentInstance.value).toBe(789);
  row.kind='second';f.componentRef.setInput('rows',[{...row}]);f.detectChanges();
  controls=f.debugElement.queryAll(By.directive(LookupSelect));expect(controls[0].componentInstance.value).toBe(456);
  const resolved=f.componentInstance.resolveColumn(columns[1],row);expect(resolved.lookup?.endpoint).toBe('/second');
  const payload=TestBed.inject(DocumentConfigDataService).buildLineUpdatePayload(row,[resolved.id],{columns,dataSource:{endpoint:'/lines'}} as any);
  expect(payload).toEqual({secondId:456});
  f.componentRef.setInput('rows',[JSON.parse(JSON.stringify({...row,...payload}))]);f.detectChanges();
  expect(f.debugElement.queryAll(By.directive(LookupSelect))[0].componentInstance.value).toBe(456);
  expect(f.componentInstance.resolveColumn(columns[3],row)).toBe(columns[3]);
  expect(f.componentInstance.resolveColumn(columns[1],{kind:'unknown'}).readonly).toBe(true);f.destroy();
 });
 it('does not expose default lookup identities in placeholder rows',()=>{
  const {f}=create();f.componentRef.setInput('rows',[{kind:'first',firstId:123,__entryPlaceholder:true}]);f.detectChanges();
  expect(f.debugElement.queryAll(By.directive(LookupSelect))[0].componentInstance.value).toBeNull();f.destroy();
 });
});
