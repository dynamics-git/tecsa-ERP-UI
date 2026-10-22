import { TestBed } from '@angular/core/testing';
import { describe,it,expect,beforeEach,vi } from 'vitest';
import { firstValueFrom,of,Subject,throwError } from 'rxjs';
import { DataSourceService,DATA_REST_SERVICE } from './data-source.service';
import { EntityContractService } from './entity-contract.service';
import { SessionService } from '../../core/services/session.service';
import { DataSourceConfig } from '../models/data-source-config.model';

describe('Shared data lifecycle with controlled synthetic API responses',()=>{
 let source:DataSourceService;
 let get:ReturnType<typeof vi.fn>, patch:ReturnType<typeof vi.fn>, post:ReturnType<typeof vi.fn>;
 const config:DataSourceConfig={endpoint:'/fixtureHeaders',keyField:'id',supportsCreate:true,supportsUpdate:true,supportsDelete:true};
 let session:{Company:string;UserId:string;AccessToken:string};
 beforeEach(()=>{
  session={Company:'A',UserId:'fixture-user',AccessToken:'fixture-token'};
  get=vi.fn(()=>of({data:[{id:'1',code:'PR',systemRowVersion:1}],meta:{total:45}}));
  patch=vi.fn(()=>of({data:{id:'1',code:'CHANGED',systemRowVersion:2}}));
  post=vi.fn(()=>of({data:{id:'2',systemRowVersion:1}}));
  TestBed.configureTestingModule({providers:[{provide:SessionService,useValue:session},{provide:DATA_REST_SERVICE,useValue:{get,patch,post,put:patch,delete:()=>of({})}}]});
  source=TestBed.inject(DataSourceService);
 });
 it('fetches 20 records with escaped server search and continues the same query',async()=>{
  await firstValueFrom(source.loadList({...config,defaultFilter:"contains(code, 'PR')"},{top:20,skip:0}));
  await firstValueFrom(source.loadList({...config,defaultFilter:"contains(code, 'PR')"},{top:20,skip:20}));
  const first=new URL(get.mock.calls[0][0],'http://fixture'),next=new URL(get.mock.calls[1][0],'http://fixture');
  expect(first.searchParams.get('$top')).toBe('20'); expect(next.searchParams.get('$skip')).toBe('20');
  expect(next.searchParams.get('$filter')).toBe(first.searchParams.get('$filter'));
 });
 it('deduplicates in-flight reads and keeps cached values isolated from editor mutations',async()=>{
  const pending=new Subject<unknown>(); get.mockReturnValue(pending);
  const a=firstValueFrom(source.loadList(config,{useCache:true})),b=firstValueFrom(source.loadList(config,{useCache:true}));
  expect(get).toHaveBeenCalledTimes(1);
  pending.next({data:[{id:'1',code:'PR'}]});pending.complete();
  const result:any=await a;await b;result.value[0].code='LOCAL';
  const cached:any=await firstValueFrom(source.loadList(config,{useCache:true}));
  expect(cached.value[0].code).toBe('PR');expect(get).toHaveBeenCalledTimes(1);
 });
 it('uses only explicit supportsDelete false to block deletion, including singleton resources',async()=>{
  await expect(firstValueFrom(source.delete({...config,singleton:true,supportsDelete:false},'1',1))).rejects.toThrow('does not support delete');
  await expect(firstValueFrom(source.delete({...config,singleton:true,supportsDelete:undefined},'1',1))).resolves.toBeDefined();
 });
 it('captures a stable write scope for the duration of batch mutations',()=>{
  const unchanged=source.captureWriteScope();expect(unchanged()).toBe(true);
  session.Company='B';expect(unchanged()).toBe(false);
 });
 it('separates company caches and rejects responses from a previous company',async()=>{
  await firstValueFrom(source.loadList(config,{useCache:true})); session.Company='B';
  await firstValueFrom(source.loadList(config,{useCache:true}));expect(get).toHaveBeenCalledTimes(2);
  const pending=new Subject<unknown>();get.mockReturnValue(pending);
  const old=firstValueFrom(source.loadList(config,{forceRefresh:true})); session.Company='C';
  const failure=expect(old).rejects.toThrow('company or session changed');pending.next({data:[]});pending.complete();await failure;
 });
 it('retains typed values on a stale version and blocks queued writes from that editor',async()=>{
  const editor={id:'1',code:'TYPED',systemRowVersion:1};
  patch.mockReturnValue(throwError(()=>({status:412,error:{message:'Record changed'}})));
  await expect(firstValueFrom(source.updateRecord(config,'1',{code:'TYPED'},editor))).rejects.toMatchObject({status:412});
  expect(editor.code).toBe('TYPED');
  await expect(firstValueFrom(source.updateRecord(config,'1',{code:'RETRY'},editor))).rejects.toMatchObject({status:412});
  expect(patch).toHaveBeenCalledTimes(1);
 });
 it('serializes writes and reads the latest version when each queued write starts',async()=>{
  const editor={id:'1',code:'PR',systemRowVersion:1};
  patch.mockImplementation((_endpoint,body)=>of({data:{id:'1',...body,systemRowVersion:editor.systemRowVersion+1}}));
  await Promise.all([firstValueFrom(source.updateRecord(config,'1',{code:'ONE'},editor)),firstValueFrom(source.updateRecord(config,'1',{code:'TWO'},editor))]);
  expect(patch.mock.calls.map(call=>call[2])).toEqual(['"1"','"2"']);expect(editor.systemRowVersion).toBe(3);
 });
 it('rejects missing versions, unsupported mutations, unsaved parent lines and invalid commands before sending requests',async()=>{
  await expect(firstValueFrom(source.update(config,'1',{code:'PR'}))).rejects.toThrow('row version is missing');
  await expect(firstValueFrom(source.create({...config,supportsCreate:false},{code:'PR'}))).rejects.toThrow('does not support create');
  expect(()=>source.relation({...config,navigation:{parentEndpoint:'/headers',parentIdFields:['id'],childCollection:'lines'}},{})).toThrow('Save the header');
  await expect(firstValueFrom(source.execute(config,'1','delete/all'))).rejects.toThrow('Invalid command');
  expect(patch).not.toHaveBeenCalled();expect(post).not.toHaveBeenCalled();
 });
 it('scopes child navigation to the saved header and treats an explicit empty write allowlist as denying every field',()=>{
  expect(source.relation({...config,navigation:{parentEndpoint:'/headers',parentIdFields:['id'],childCollection:'lines'}},{id:'A B'}).endpoint).toBe('/headers/A%20B/lines');
  const contracts=TestBed.inject(EntityContractService);
  expect(contracts.sanitizePayload({...config,updateFields:[]},'update',{code:'WRONG',__options_code:[]})).toEqual({});
 });
});
