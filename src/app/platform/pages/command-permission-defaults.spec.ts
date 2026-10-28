import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, describe, expect, it } from 'vitest';
import { ListGrid } from './list-grid/list-grid';
import { SessionService } from '../../core/services/session.service';
import { providePlatformGovernance } from '../../core/providers/platform-governance.provider';
import { CommandConfig, resolveCommandPermissionKey } from '../models/command-config.model';

afterEach(() => TestBed.resetTestingModule());

describe('Shared API action permission identity on list commands', () => {
  it('matches document action identities, requires action grants and honors explicit overrides', () => {
    const session = {SuperAdmin:false,Permissions:[{pageId:'purchase-requisition',canExecute:true}] as unknown[]};
    TestBed.configureTestingModule({imports:[ListGrid],providers:[provideRouter([]),...providePlatformGovernance(),{provide:SessionService,useValue:session}]});
    const fixture=TestBed.createComponent(ListGrid);
    const action:CommandConfig={label:'Approve',actionKey:'cmd:approve',apiAction:{name:'approve'}};
    fixture.componentRef.setInput('config',{pageId:'purchase-requisition',commands:[action]});
    expect(fixture.componentInstance.resolvedCommands[0].disabled).toBe(true);
    session.Permissions.push({actionId:'purchase-requisition.approve',canExecute:true});
    expect(fixture.componentInstance.resolvedCommands[0]).toBe(action);
    action.permissionKey='SPECIAL_APPROVAL';
    expect(fixture.componentInstance.resolvedCommands[0].disabled).toBe(true);
    session.Permissions.push({actionId:'SPECIAL_APPROVAL',canExecute:true});
    expect(fixture.componentInstance.resolvedCommands[0]).toBe(action);
    fixture.destroy();
  });

  it('derives from stable IDs, not captions or API method spelling, without mutating config', () => {
    const action:CommandConfig={label:'Translated',actionKey:' CMD:Approve ',apiAction:{name:'approveDocument'}};
    expect(resolveCommandPermissionKey(action,' Purchase-Requisition ')).toBe('purchase-requisition.approve');
    expect(action.permissionKey).toBeUndefined();
    expect(resolveCommandPermissionKey({label:'Legacy',actionKey:'cmd:custom'},'page')).toBeUndefined();
    expect(resolveCommandPermissionKey({...action,runModalPageId:'other'},'page')).toBeUndefined();
  });
});
