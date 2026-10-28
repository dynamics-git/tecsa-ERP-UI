import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it } from 'vitest';
import { SessionService } from '../../core/services/session.service';
import { EntityContractService } from '../data/entity-contract.service';
import { DataSourceService } from '../data/data-source.service';
import { DataSourceConfig } from '../models/data-source-config.model';
import { CommandConfig } from '../models/command-config.model';
import { DocumentPageCommandPermissionService } from './document-page-command-permission.service';
import { DocumentPageCommandAssemblerService } from './document-page-command-assembler.service';
import { StandardListActionsService } from './standard-list-actions.service';
import { prCoreContract } from './document-page/pr-core-contract.fixture';

afterEach(() => TestBed.resetTestingModule());
const header: DataSourceConfig = {endpoint: '/purchaseRequisitions'};
const lines: DataSourceConfig = {endpoint: '/lines', navigation: {parentEndpoint: '/purchaseRequisitions', parentIdFields: ['systemId'], childCollection: 'lines'}};
const button: CommandConfig = {label: 'Approve', actionKey: 'cmd:approve', apiAction: {name: 'approve'}};
function setup(superAdmin = false) {
  const session = {SuperAdmin: superAdmin, Permissions: [] as unknown[], Company: 'a', UserId: 'u', AccessToken: 'token'};
  TestBed.configureTestingModule({providers: [{provide: SessionService, useValue: session}]});
  const data = TestBed.inject(DataSourceService);
  data.getReadGeneration();
  const contracts = TestBed.inject(EntityContractService);
  // A modify-only domain response: header POST absent; child writes are permitted.
  const metadata = structuredClone(prCoreContract);
  metadata.endpoints = metadata.endpoints.filter(endpoint => !(endpoint.path.endsWith('/purchaseRequisitions') && endpoint.methods.includes('POST')));
  metadata.endpoints.push({path: '/api/v1/companies/{companyId}/purchaseRequisitions/{systemId}/approve', methods: ['POST'], type: 'action'});
  expect(contracts.acceptMetadata({data: metadata})).toBe(true);
  return {session, data, contracts, metadata, policy: TestBed.inject(DocumentPageCommandPermissionService)};
}
describe('shared UI consumes authenticated API access decisions', () => {
  it('allows child writes without repeating the parent modify alias, but denies header create', () => {
    const {data, policy} = setup();
    for (const op of ['create','update','delete'] as const) {
      expect(data.operationAllowed(lines, op)).toBe(true);
      expect(policy.applySourceOperation(button, 'purchase-requisition', lines, op).disabled).not.toBe(true);
    }
    expect(policy.applySourceOperation(button, 'purchase-requisition', header, 'create').disabled).toBe(true);
    expect(TestBed.inject(StandardListActionsService).resolve({pageId: 'purchase-requisition', dataSource: header}).new).toMatchObject({disabled:true});
  });
  it('uses the exact authorized action, not broad execute or another page action', () => {
    const {policy, session} = setup();
    expect(policy.apply(button, 'purchase-requisition', header).disabled).not.toBe(true);
    session.Permissions.push({pageId:'purchase-requisition',canExecute:true});
    // Reaccept after the access context change invalidates cached discovery.
    const contracts=TestBed.inject(EntityContractService), data=TestBed.inject(DataSourceService);
    data.getReadGeneration(); contracts.acceptMetadata({data:prCoreContract});
    expect(policy.apply(button, 'purchase-requisition', header).disabled).toBe(true);
    expect(policy.apply(button, 'other-page', {endpoint:'/items'}).disabled).toBe(true);
  });
  it('preserves explicit restrictions and disabled state, including for Super Admin', () => {
    const {policy} = setup(true);
    expect(policy.applySourceOperation(button, 'p', {...lines,supportsCreate:false}, 'create').disabled).toBe(true);
    expect(policy.apply({...button, disabled:true}, 'p', header).disabled).toBe(true);
    expect(policy.apply({...button, apiAction:{name:'cancel'}}, 'p', header).disabled).toBe(true);
  });
  it('keeps permission aliases as optional additional restrictions', () => {
    const {policy} = setup();
    expect(policy.apply({...button,permissionKey:'special-approval'}, 'p', header).disabled).toBe(true);
    expect(policy.applySourceOperation(button, 'p', {...lines,permissions:{create:'modify'}}, 'create').disabled).toBe(true);
  });
  it('preserves legacy fallback when metadata is unavailable, unknown or OData', () => {
    const {contracts,data,policy} = setup();
    expect(data.operationAllowed({endpoint:'/unknown'}, 'create')).toBeUndefined();
    expect(data.operationAllowed({...header,addressStyle:'odata'}, 'create')).toBeUndefined();
    contracts.clearMetadata();
    expect(data.operationAllowed(lines,'create')).toBeUndefined();
    expect(policy.applySourceOperation(button,'p',lines,'create').disabled).toBe(true);
  });
  it('invalidates API decisions on company, user, workspace access generation and grant changes', () => {
    const {session,data,contracts,metadata} = setup();
    expect(data.actionAllowed(header,'approve')).toBe(true);
    session.Company='b'; expect(data.actionAllowed(header,'approve')).toBeUndefined();
    contracts.acceptMetadata({data:metadata}); session.UserId='v';
    expect(data.operationAllowed(lines,'create')).toBeUndefined();
    contracts.acceptMetadata({data:metadata}); session.Permissions=[{pageId:'p'}];
    expect(data.actionAllowed(header,'approve')).toBeUndefined();
    contracts.acceptMetadata({data:metadata}); data.invalidateReadCache();
    expect(data.actionAllowed(header,'approve')).toBeUndefined();
  });
  it('keeps ordinary generic CRUD flags authoritative and PO create unavailable', () => {
    const {contracts,data} = setup();
    contracts.acceptMetadata({data:{contractVersion:'1.0',entities:{terms:{kind:'generic',path:'terms',endpoint:'terms',key:'systemId',fields:{},operations:{read:true,create:true,update:false,delete:false}}},endpoints:[{path:'/api/v1/companies/{companyId}/purchaseOrders',methods:['GET'],type:'collection'}]}});
    expect(data.operationAllowed({endpoint:'/terms'},'create')).toBe(true);
    expect(data.operationAllowed({endpoint:'/terms',supportsUpdate:true},'update')).toBe(false);
    expect(data.operationAllowed({endpoint:'/purchaseOrders'},'create')).toBe(false);
  });
  it('uses the same decision for document toolbar actions', () => {
    setup();
    const commands=TestBed.inject(DocumentPageCommandAssemblerService).resolveHeaderToolbarButtons({pageId:'purchase-requisition',dataSource:header,toolbarButtons:[button]});
    expect(commands.find(c=>c.actionKey==='cmd:approve')?.disabled).not.toBe(true);
    expect(commands.find(c=>c.actionKey==='cmd:new')?.disabled).toBe(true);
  });
});
