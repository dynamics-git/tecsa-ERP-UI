import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it } from 'vitest';
import { SessionService } from '../../core/services/session.service';
import { DataSourceService } from '../data/data-source.service';
import { DataSourceConfig } from '../models/data-source-config.model';
import { CommandConfig } from '../models/command-config.model';
import { DocumentPageCommandPermissionService } from './document-page-command-permission.service';

afterEach(() => TestBed.resetTestingModule());
const header: DataSourceConfig = {endpoint: '/purchaseRequisitions'};
const lines: DataSourceConfig = {endpoint: '/lines', navigation: {
  parentEndpoint: '/purchaseRequisitions', parentIdFields: ['systemId'], childCollection: 'lines',
}};
const button: CommandConfig = {label: 'Approve', actionKey: 'cmd:approve', apiAction: {name: 'approve'}};
function setup() {
  const session = {SuperAdmin: false, Company: 'a', UserId: 'u', AccessToken: 'token', Permissions: [
    {pageId:'purchase-requisition',apiPath:'/purchaseRequisitions',canRead:true,canCreate:false,canUpdate:true,canDelete:false,canExecute:true},
    {pageId:'purchase-requisition-lines',apiPath:'/purchaseRequisitions/{id}/lines',canRead:true,canCreate:true,canUpdate:true,canDelete:true},
    {pageId:'purchase-requisition.approve',canExecute:true},
  ]};
  TestBed.configureTestingModule({providers: [{provide: SessionService, useValue: session}]});
  return {session, data:TestBed.inject(DataSourceService), policy:TestBed.inject(DocumentPageCommandPermissionService)};
}

describe('configured UI uses the existing Company login permission snapshot', () => {
  it('keeps child operations separate from header create rights', () => {
    const {data}=setup();
    for(const operation of ['create','update','delete'] as const) expect(data.operationAllowed(lines,operation)).toBe(true);
    expect(data.operationAllowed(header,'create')).toBe(false);
  });
  it('cannot enable an operation disabled by its Page config', () => {
    const {data}=setup();
    expect(data.operationAllowed({...lines,supportsCreate:false},'create')).toBe(false);
  });
  it('rechecks current session grants instead of cached API metadata', () => {
    const {data,session}=setup();
    expect(data.operationAllowed(lines,'create')).toBe(true);
    session.Permissions[1].canCreate=false;
    expect(data.operationAllowed(lines,'create')).toBe(false);
    expect(data.operationAllowed({endpoint:'/unknown'},'create')).toBeUndefined();
  });
  it('retains explicit command permission checks', () => {
    const {policy}=setup();
    expect(policy.apply({...button,permissionKey:'special-approval'},'purchase-requisition',header).disabled).toBe(true);
    expect(policy.applySourceOperation(button,'purchase-requisition',header,'create').disabled).toBe(true);
  });
});
