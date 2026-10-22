import { TestBed } from '@angular/core/testing';
import { describe,it,expect,vi } from 'vitest';
import { of, Subject, throwError } from 'rxjs';
import { RecordDeleteService } from './record-delete.service';
import { LineCommandService } from '../document/line-command.service';

describe('Shared per-record deletion',()=>{
 it('settles partial failures without retries or hiding successful rows',async()=>{
  const targets=[{id:'a'},{id:'b'},{id:'c'}];const conflict={status:412};
  const remove=vi.fn(id=>id==='b'?throwError(()=>conflict):of(undefined));
  const result=await new RecordDeleteService().execute({targets,resolveId:row=>row.id,deleteById:remove});
  expect(result.deleted).toEqual([targets[0],targets[2]]);
  expect(result.failures).toEqual([{target:targets[1],error:conflict}]);expect(remove).toHaveBeenCalledTimes(3);
 });
 it('limits in-flight requests to four while completing every selected row',async()=>{
  const targets=Array.from({length:20},(_,id)=>({id}));const pending:Subject<unknown>[]=[];
  const remove=vi.fn(()=>{const response=new Subject<unknown>();pending.push(response);return response;});
  const result=new RecordDeleteService().execute({targets,resolveId:row=>row.id,deleteById:remove});
  expect(remove).toHaveBeenCalledTimes(4);
  for(let index=0;index<targets.length;index++){pending[index].next(undefined);pending[index].complete();}
  expect((await result).deleted).toHaveLength(20);
 });
 it('stops queued batch rows when company or session context changes',async()=>{
  let current=true;const targets=Array.from({length:8},(_,id)=>({id}));const pending:Subject<unknown>[]=[];
  const remove=vi.fn(()=>{const response=new Subject<unknown>();pending.push(response);return response;});
  const result=new RecordDeleteService().execute({targets,resolveId:row=>row.id,deleteById:remove,canContinue:()=>current});
  expect(remove).toHaveBeenCalledTimes(4);current=false;
  for(const response of pending){response.next(undefined);response.complete();}
  const settled=await result;expect(remove).toHaveBeenCalledTimes(4);expect(settled.deleted).toHaveLength(4);expect(settled.failures).toHaveLength(4);
 });
 it('rejects missing persisted identities but removes explicit local drafts without API writes',async()=>{
  const remove=vi.fn(()=>of(undefined));const service=new RecordDeleteService();const targets=[{}];
  expect((await service.execute({targets,resolveId:()=>null,deleteById:remove})).failures).toHaveLength(1);
  expect((await service.execute({targets,resolveId:()=>null,deleteById:remove,allowLocal:true})).deleted).toEqual(targets);
  expect(remove).not.toHaveBeenCalled();
 });
 it('confirms a line selection once and preserves failed rows after partial deletion',async()=>{
  const service=TestBed.inject(LineCommandService);const rows=[{id:'a'},{id:'b'},{draft:true}];
  const confirm=vi.fn(async()=>true);const remove=vi.fn(id=>id==='b'?throwError(()=>({status:409})):of(undefined));
  const result=await service.deleteRows({lineRows:rows,payload:{selectedIndexes:[0,1,2]},resolveId:row=>row['id'],deleteById:remove,confirmDelete:confirm});
  expect(confirm).toHaveBeenCalledExactlyOnceWith(3);expect(remove).toHaveBeenCalledTimes(2);
  expect(result.targetRows).toEqual([rows[0],rows[2]]);expect(result.remainingRows).toEqual([rows[1]]);expect(result.failures).toHaveLength(1);
 });
 it('cancellation sends no request and no selection never silently deletes the last row',async()=>{
  const service=TestBed.inject(LineCommandService);const rows=[{id:'a'}];const remove=vi.fn(()=>of(undefined));
  expect(service.planDeleteRequest({lineRows:rows,payload:{}}).targetRows).toEqual([]);
  const result=await service.deleteRows({lineRows:rows,payload:{selectedIndexes:[0]},resolveId:row=>row['id'],deleteById:remove,confirmDelete:async()=>false});
  expect(result.deleted).toBe(false);expect(remove).not.toHaveBeenCalled();
 });
});
