import {ErrorHandler} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {firstValueFrom,of,throwError} from 'rxjs';
import {DATA_REST_SERVICE,DataSourceService} from '../../data/data-source.service';
import {DataSourceConfig} from '../../models/data-source-config.model';
import {SessionService} from '../../../core/services/session.service';
import {WorkspaceContext} from '../../../core/services/workspace-context';
import {purchaseRequisitionLineConfig} from '../../../features/purchasing/purchase-requisition/purchase-requisition.config';

let data:DataSourceService,source:DataSourceConfig;
let post:ReturnType<typeof vi.fn>,patch:ReturnType<typeof vi.fn>,remove:ReturnType<typeof vi.fn>,report:ReturnType<typeof vi.fn>;
beforeEach(()=>{
 post=vi.fn(()=>of({data:{systemId:123,systemRowVersion:1,description:'Draft'}}));
 patch=vi.fn(()=>of({data:{systemId:123,systemRowVersion:2,description:'Changed'}}));remove=vi.fn(()=>of(null));report=vi.fn();
 TestBed.configureTestingModule({providers:[{provide:DATA_REST_SERVICE,useValue:{get:()=>of({data:[]}),post,patch,delete:remove}},
 {provide:SessionService,useValue:{Company:'company',UserId:'user',AccessToken:'token',Permissions:[],SuperAdmin:true}},
 {provide:WorkspaceContext,useValue:{slug:'workspace'}},{provide:ErrorHandler,useValue:{handleError:report}}]});
 data=TestBed.inject(DataSourceService);source=data.relation(purchaseRequisitionLineConfig.dataSource,{systemId:'header'});
});
afterEach(()=>TestBed.resetTestingModule());
describe('PR reference for shared optional write hooks',()=>{
 it('runs create/update/delete callbacks once in order and preserves raw identity',async()=>{
  const order:string[]=[];
  source={...source,hooks:{beforeCreate:()=>{order.push('before-create');},afterCreate:({record})=>{expect(record?.['systemId']).toBe(123);order.push('after-create');},beforeUpdate:({id,payload})=>{expect(id).toBe(123);expect(payload).toEqual({description:'Changed'});order.push('before-update');},afterUpdate:()=>{order.push('after-update');},beforeDelete:()=>{order.push('before-delete');},afterDelete:()=>{order.push('after-delete');}}};
  await firstValueFrom(data.create(source,{description:'Draft'}));await firstValueFrom(data.update(source,123,{description:'Changed'},1));await firstValueFrom(data.delete(source,123,2));
  expect(order).toEqual(['before-create','after-create','before-update','after-update','before-delete','after-delete']);expect(post).toHaveBeenCalledOnce();expect(patch).toHaveBeenCalledOnce();expect(remove).toHaveBeenCalledOnce();
 });
 it('vetoes before create without POST and allows one corrected retry',async()=>{
  const failed=vi.fn(),after=vi.fn(),payload={description:'Draft'};
  source={...source,hooks:{beforeCreate:({payload})=>payload?.['description']==='Draft'?'Enter a final description.':undefined,afterCreate:after,onError:failed}};
  await expect(firstValueFrom(data.create(source,payload))).rejects.toThrow('Enter a final description.');expect(post).not.toHaveBeenCalled();expect(after).not.toHaveBeenCalled();expect(failed).toHaveBeenCalledOnce();expect(payload.description).toBe('Draft');
  payload.description='Corrected';await firstValueFrom(data.create(source,payload));expect(post).toHaveBeenCalledOnce();expect(after).toHaveBeenCalledOnce();
 });
 it('retains server errors and input when onError itself throws',async()=>{
  const error={status:422,error:{message:'Description rejected'}};post.mockReturnValue(throwError(()=>error));
  const after=vi.fn();source={...source,hooks:{afterCreate:after,onError:()=>{throw new Error('Observer failed');}}};
  const payload={description:'Keep my input'};await expect(firstValueFrom(data.create(source,payload))).rejects.toBe(error);expect(payload.description).toBe('Keep my input');expect(after).not.toHaveBeenCalled();expect(report).toHaveBeenCalledOnce();expect(post).toHaveBeenCalledOnce();
 });
 it('does not turn confirmed create into failure when afterCreate throws',async()=>{
  const failure=vi.fn();source={...source,hooks:{afterCreate:()=>{throw new Error('Observer failed');},onError:failure}};
  const result=await firstValueFrom(data.create(source,{description:'Draft'}));expect(result).toMatchObject({systemId:123});expect(post).toHaveBeenCalledOnce();expect(failure).not.toHaveBeenCalled();expect(report).toHaveBeenCalledOnce();
 });
 it('does not let before hooks mutate the outgoing payload through nested references',async()=>{
  const payload={description:'Draft',extra:{code:'original'}};
  source={...source,hooks:{beforeCreate:({payload})=>{(payload?.['extra'] as {code:string}).code='changed';}}};
  await firstValueFrom(data.create(source,payload));expect(payload.extra.code).toBe('original');expect(post.mock.calls[0][1]).toEqual(payload);
 });
 it('preserves unsupported operations without running hooks',async()=>{
  const before=vi.fn();await expect(firstValueFrom(data.delete({...source,supportsDelete:false,hooks:{beforeDelete:before}},123,1))).rejects.toThrow('does not support delete');expect(before).not.toHaveBeenCalled();expect(remove).not.toHaveBeenCalled();
 });
 it('vetoes update and delete without sending their requests',async()=>{
  source={...source,hooks:{beforeUpdate:()=> 'Update blocked by page rule.',beforeDelete:()=> 'Delete blocked by page rule.'}};
  await expect(firstValueFrom(data.update(source,123,{description:'Retained'},1))).rejects.toThrow('Update blocked');await expect(firstValueFrom(data.delete(source,123,1))).rejects.toThrow('Delete blocked');expect(patch).not.toHaveBeenCalled();expect(remove).not.toHaveBeenCalled();
 });
 it('preserves stale-version handling and reports the API failure once',async()=>{
  const error={status:412};patch.mockReturnValue(throwError(()=>error));const failed=vi.fn(),after=vi.fn();
  source={...source,hooks:{afterUpdate:after,onError:failed}};const row={systemId:123,systemRowVersion:1,description:'Retained'};
  await expect(firstValueFrom(data.updateRecord(source,123,{description:row.description},row))).rejects.toBe(error);expect(failed).toHaveBeenCalledOnce();expect(after).not.toHaveBeenCalled();expect(row.description).toBe('Retained');expect(patch).toHaveBeenCalledOnce();
 });
});
