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
 it('bounds 10,000 options, keeps keyboard selection visible and supports keyboard retry',()=>{
  TestBed.configureTestingModule({imports:[LookupSelect]});const f=TestBed.createComponent(LookupSelect),select=f.componentInstance;
  f.componentRef.setInput('label','Fixture lookup');f.componentRef.setInput('options',Array.from({length:10000},(_,id)=>({value:id,label:'Choice '+id})));f.detectChanges();
  const editor=f.nativeElement.querySelector('input');editor.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowUp',bubbles:true,cancelable:true}));f.detectChanges();
  expect(f.nativeElement.querySelectorAll('[role=option]').length).toBeLessThanOrEqual(60);expect(select.active).toBe(9999);expect(f.nativeElement.querySelector('[id="'+select.id+'-9999"]')).not.toBeNull();
  let retried=0;select.retried.subscribe(()=>retried++);f.componentRef.setInput('error','Unavailable');f.detectChanges();editor.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));expect(retried).toBe(1);f.destroy();
 });
});
