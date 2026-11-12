import { TestBed } from '@angular/core/testing';
import { describe,it,expect,beforeEach,vi } from 'vitest';
import { firstValueFrom,of,Subject,throwError } from 'rxjs';
import { DataSourceService,DATA_REST_SERVICE } from './data-source.service';
import { EntityContractService } from './entity-contract.service';
import { SessionService } from '../../core/services/session.service';
import { DataSourceConfig } from '../models/data-source-config.model';
import { lookupQuery } from './lookup-dependencies';
import { DocumentHydrationOrchestratorService } from './document-hydration-orchestrator.service';

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
 it('accepts a successful empty PATCH response without inventing a record',async()=>{
  patch.mockReturnValue(of(null));
  await expect(firstValueFrom(source.update(config,'1',{code:'Changed'},1))).resolves.toBeNull();
  expect(patch).toHaveBeenCalledWith('/fixtureHeaders/1',{code:'Changed'},'"1"');
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
 it('binds business and composite relationships without substituting the record identity',()=>{
  const related={endpoint:'/lines',keyField:'systemId',headerPKProp:'number',lineFKProp:'documentNumber',parentFieldMap:{documentType:'documentType'},defaultFilter:'isActive eq true'};
  expect(source.relation(related,{systemId:'unrelated-guid',number:"PO'17",documentType:'Order'}).defaultFilter)
   .toBe("(isActive eq true) and (documentNumber eq 'PO''17' and documentType eq 'Order')");
  expect(()=>source.relation(related,{systemId:'unrelated-guid',number:'PO17'})).toThrow('related record context is missing');
  expect(()=>source.relation(related,{systemId:'unrelated-guid',documentType:'Order'})).toThrow('related record context is missing');
 });
 it('preserves unrelated master caches across note writes and invalidates only a changed master family',async()=>{
  post.mockReturnValue(of({data:{systemId:'2',systemRowVersion:1}}));
  const lookup={endpoint:'/unitsOfMeasure'};
  await firstValueFrom(source.loadList(lookup,{useCache:true,count:false}));
  await firstValueFrom(source.create({endpoint:'/companies/A/items/item-id/notes'},{body:'Note'}));
  await firstValueFrom(source.loadList(lookup,{useCache:true,count:false}));expect(get).toHaveBeenCalledTimes(1);
  await firstValueFrom(source.update(lookup,'1',{code:'BOX'},1));
  await firstValueFrom(source.loadList(lookup,{useCache:true,count:false}));expect(get).toHaveBeenCalledTimes(2);
  expect(new URL(get.mock.calls[0][0],'http://fixture').searchParams.get('$count')).toBe('false');
 });
 it('invalidates declared dependent resources and keeps commands conservative',async()=>{
  await firstValueFrom(source.loadList({endpoint:'/dependent'},{useCache:true}));
  await firstValueFrom(source.create({...config,invalidates:['/dependent']},{code:'New'}));
  await firstValueFrom(source.loadList({endpoint:'/dependent'},{useCache:true}));expect(get).toHaveBeenCalledTimes(2);
  await firstValueFrom(source.execute(config,'1','post'));
  await firstValueFrom(source.loadList({endpoint:'/dependent'},{useCache:true}));expect(get).toHaveBeenCalledTimes(3);
 });
 it('rejects stale same-resource reads after mutation but lets unrelated in-flight reads finish',async()=>{
  const pending=new Subject<unknown>();get.mockReturnValue(pending);
  const same=firstValueFrom(source.loadList(config,{useCache:true}));
  const other=firstValueFrom(source.loadList({endpoint:'/other'},{useCache:true}));
  const failed=expect(same).rejects.toThrow('Data changed while loading');
  await firstValueFrom(source.create(config,{code:'New'}));
  pending.next({data:[]});pending.complete();await failed;await expect(other).resolves.toMatchObject({value:[]});
 });
 it('clears cached reads after access changes and after token changes',async()=>{
  post.mockReturnValue(of({data:{systemId:'2',systemRowVersion:1}}));
  await firstValueFrom(source.loadList(config,{useCache:true}));
  await firstValueFrom(source.create({endpoint:'/permissionSets'},{code:'Access'}));
  await firstValueFrom(source.loadList(config,{useCache:true}));expect(get).toHaveBeenCalledTimes(2);
  session.AccessToken='new-token';await firstValueFrom(source.loadList(config,{useCache:true}));expect(get).toHaveBeenCalledTimes(3);
 });

 it('invalidates numbering side effects when the existing automatic numbering flag is set',async()=>{
  await firstValueFrom(source.loadList({endpoint:'/numberSeries'},{useCache:true}));
  await firstValueFrom(source.create({...config,autoGenerateNumber:true},{code:'New'}));
  await firstValueFrom(source.loadList({endpoint:'/numberSeries'},{useCache:true}));expect(get).toHaveBeenCalledTimes(2);
 });

 it('reuses complete collection records for detail reads without a request or a loading notification',async()=>{
  get.mockReturnValue(of({data:[{id:'1',code:'PR',systemRowVersion:1}],meta:{total:1,recordShape:'complete'}}));
  await firstValueFrom(source.loadList(config,{useCache:true}));
  const loading=vi.fn();const record:any=await firstValueFrom(source.loadById(config,'1',{useCache:true,onRequest:loading}));
  expect(record.code).toBe('PR');expect(record.systemRowVersion).toBe(1);expect(get).toHaveBeenCalledTimes(1);expect(loading).not.toHaveBeenCalled();
  record.code='LOCAL';expect(source.getCachedRecord(config,'1')?.['code']).toBe('PR');
  await firstValueFrom(source.update(config,'1',{code:'Changed'}));expect(patch.mock.calls[0][2]).toBe('"1"');
  expect(source.getCachedRecord(config,'1')).toMatchObject({id:'1',code:'CHANGED',systemRowVersion:2});
 });
 it('does not treat summary collection rows as complete header records',async()=>{
  await firstValueFrom(source.loadList(config,{useCache:true}));expect(source.getCachedRecord(config,'1')).toBeUndefined();
  get.mockReturnValue(of({data:{id:'1',code:'FULL',systemRowVersion:1}}));
  const loading=vi.fn();await firstValueFrom(source.loadById(config,'1',{useCache:true,onRequest:loading}));
  expect(get).toHaveBeenCalledTimes(2);expect(loading).toHaveBeenCalledOnce();
 });
 it('retains the original collection freshness deadline and supports explicit refresh',async()=>{
  const now=vi.spyOn(Date,'now');
  try{
   now.mockReturnValue(1000);get.mockReturnValue(of({data:[{id:'1',code:'PR',systemRowVersion:1}],meta:{recordShape:'complete'}}));
   await firstValueFrom(source.loadList(config,{useCache:true}));
   now.mockReturnValue(2000);expect(source.getCachedRecord(config,'1')?.['code']).toBe('PR');
   now.mockReturnValue(31001);expect(source.getCachedRecord(config,'1')).toBeUndefined();
   get.mockReturnValue(of({data:{id:'1',code:'NEW',systemRowVersion:2}}));const loading=vi.fn();
   await firstValueFrom(source.loadById(config,'1',{useCache:true,onRequest:loading}));expect(loading).toHaveBeenCalledOnce();
   await firstValueFrom(source.loadById(config,'1',{useCache:true,forceRefresh:true,onRequest:loading}));expect(loading).toHaveBeenCalledTimes(2);
  }finally{now.mockRestore();}
 });
 it('reuses an evicted complete record from its fresh scoped collection page',async()=>{
  get.mockReturnValue(of({data:Array.from({length:120},(_,id)=>({id:String(id),systemRowVersion:1})),meta:{recordShape:'complete'}}));
  await firstValueFrom(source.loadList(config,{useCache:true}));
  expect(source.getCachedRecord(config,'0')?.['id']).toBe('0');expect(get).toHaveBeenCalledTimes(1);
  session.Company='B';expect(source.getCachedRecord(config,'0')).toBeUndefined();
 });

 it('resolves collection lookup identity instead of accepting an unrelated first row',async()=>{
  const lookup={endpoint:'/fixtureChoices',valueField:'code',displayField:'name',recordRead:'collection' as const};
  get.mockReturnValue(of({data:[{code:'OTHER',name:'Wrong name'},{code:'CHOSEN',name:'Chosen name'}]}));
  await expect(firstValueFrom(source.loadLookup(lookup,'CHOSEN',{}))).resolves.toMatchObject({code:'CHOSEN',name:'Chosen name'});
  source.invalidateReadCache();get.mockReturnValue(of({data:[{code:'OTHER',name:'Wrong name'}]}));
  await expect(firstValueFrom(source.loadLookup(lookup,'CHOSEN',{}))).rejects.toThrow('unavailable or ambiguous');
  source.invalidateReadCache();get.mockReturnValue(of({data:[{code:'CHOSEN'},{code:'CHOSEN'}]}));
  await expect(firstValueFrom(source.loadLookup(lookup,'CHOSEN',{}))).rejects.toThrow('unavailable or ambiguous');
 });

 it('reuses the exact scoped choice page for names without treating it as a complete CRUD record',async()=>{
  const lookup={endpoint:'/fixtureChoices',valueField:'code',displayField:'name',recordRead:'collection' as const,
   dependsOn:[{field:'parentCode',valueFrom:'parent'}]};
  const row={parent:'A'},query=lookupQuery(lookup,row);
  get.mockReturnValue(of({data:[{code:'C1',name:'Configured name',address:'Configured address'}],meta:{hasMore:false}}));
  await firstValueFrom(source.loadList({endpoint:lookup.endpoint,defaultFilter:query.filter,pageSize:10},{useCache:true,count:false}));
  expect(source.getCachedRecord({endpoint:lookup.endpoint,keyField:'code'},'C1')).toBeUndefined();
  const selected:any=await firstValueFrom(source.loadLookup(lookup,'C1',row));
  expect(selected.name).toBe('Configured name');expect(get).toHaveBeenCalledTimes(1);
  selected.name='Local edit';expect(source.getCachedLookup(lookup,'C1',row)?.['name']).toBe('Configured name');
  expect(source.getCachedLookup(lookup,'C1',{parent:'B'})).toBeUndefined();
  session.Company='B';expect(source.getCachedLookup(lookup,'C1',row)).toBeUndefined();
 });

 it('reuses partial selected names across different batches only in the same dependency and access scope',async()=>{
  const hydrate=TestBed.inject(DocumentHydrationOrchestratorService);
  const columns=[{id:'choice',label:'Choice',lookup:{endpoint:'/fixtureChoices',valueField:'code',displayField:'code',recordRead:'collection' as const,dependsOn:[{field:'parentCode',valueFrom:'parent'}]},fill:{caption:'name'}},{id:'caption',label:'Name',readonly:true}];
  get.mockReturnValue(of({data:[{code:'C1',name:'Name one'},{code:'C2',name:'Name two'}],meta:{hasMore:false}}));
  const first=await hydrate.resolveLineLookups([{parent:'A',choice:'C1'},{parent:'A',choice:'C2'}],columns);
  expect(first.map(row=>row['caption'])).toEqual(['Name one','Name two']);expect(get).toHaveBeenCalledTimes(1);
  get.mockReturnValue(of({data:[{code:'C3',name:'Name three'}],meta:{hasMore:false}}));
  const next=await hydrate.resolveLineLookups([{parent:'A',choice:'C2'},{parent:'A',choice:'C3'}],columns);
  expect(next.map(row=>row['caption'])).toEqual(['Name two','Name three']);expect(get).toHaveBeenCalledTimes(2);
  const filter=new URL(get.mock.calls[1][0],'http://fixture').searchParams.get('$filter');
  expect(filter).toContain("code eq 'C3'");expect(filter).not.toContain("code eq 'C2'");
  expect(get.mock.calls[1][0]).not.toContain('selectedLookupScope');
  expect(source.getCachedRecord({endpoint:'/fixtureChoices',keyField:'code'},'C2')).toBeUndefined();
  const lookup=columns[0].lookup!;
  const copy=source.getCachedLookup(lookup,'C2',{parent:'A'})!;copy['name']='Changed locally';
  expect(source.getCachedLookup(lookup,'C2',{parent:'A'})?.['name']).toBe('Name two');
  expect(source.getCachedLookup(lookup,'C2',{parent:'B'})).toBeUndefined();
  await firstValueFrom(source.update({endpoint:'/fixtureChoices'},'id-2',{name:'Updated'},1));
  expect(source.getCachedLookup(lookup,'C2',{parent:'A'})).toBeUndefined();
 });

});
