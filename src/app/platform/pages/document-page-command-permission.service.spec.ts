import type { CommandConfig } from '../models/command-config.model';
import { beforeEach, describe, expect, it } from 'vitest';
import { SessionService } from '../../core/services/session.service';
import { RuntimeValueMapperService } from '../data/runtime-value-mapper.service';

import { DocumentPageCommandPermissionService } from './document-page-command-permission.service';

describe('DocumentPage popup command permissions', () => {
  let session: { SuperAdmin: boolean; Permissions: unknown[] };
  let policy: DocumentPageCommandPermissionService;
  const command = (actionKey: string, rest: Partial<CommandConfig> = {}): CommandConfig => ({
    label: actionKey,
    actionKey,
    ...rest,
  });
  const apply = (button: CommandConfig, pageId = 'purchase-order') => policy.apply(button, pageId);

  beforeEach(() => {
    session = { SuperAdmin: false, Permissions: [] };
    policy = new DocumentPageCommandPermissionService(
      session as SessionService,
      new RuntimeValueMapperService(),
    );
  });

  it('denies write and custom commands without page permissions but preserves refresh', () => {
    for (const action of [
      'cmd:new',
      'cmd:line-new',
      'cmd:line-insert',
      'cmd:save',
      'cmd:apply',
      'cmd:edit',
      'cmd:delete',
      'cmd:line-delete',
      'cmd:release',
    ]) {
      expect(apply(command(action))).toMatchObject({
        disabled: true,
        tooltip: 'You do not have permission for this command.',
      });
    }
    const refresh = command('cmd:refresh');
    expect(apply(refresh)).toBe(refresh);
  });

  it('accepts the existing BC-style permission aliases and normalizes page identifiers', () => {
    session.Permissions = [
      {
        PageId: 'Purchase_Order',
        InsertPermission: 'Yes',
        ModifyPermission: '1',
        DeletePermission: 'Full',
        PostPermission: 'TRUE',
      },
    ];
    for (const action of [
      'cmd:new',
      'cmd:save',
      'cmd:apply',
      'cmd:edit',
      'cmd:delete',
      'cmd:line-delete',
      'cmd:release',
    ]) {
      const button = command(action);
      expect(apply(button)).toBe(button);
    }
  });

  it('derives API action permission identity without falling back to broad page execute rights', () => {
    const approve=command('cmd:approve',{apiAction:{name:'approve'}});
    session.Permissions=[{pageId:'purchase-requisition',canExecute:true}];
    expect(apply(approve,'purchase-requisition').disabled).toBe(true);
    session.Permissions.push({actionId:'purchase-requisition.approve',canExecute:true});
    expect(apply(approve,'purchase-requisition')).toBe(approve);
    expect(apply(approve,'purchase-order').disabled).toBe(true);
    session.Permissions[1]={actionId:'purchase-requisition.approve',canExecute:false};
    expect(apply(approve,'purchase-requisition').disabled).toBe(true);
  });

  it('keeps explicit API action permission overrides authoritative and independent of captions/API names', () => {
    const approve=command('cmd:approve',{label:'Translated caption',apiAction:{name:'approveDocument'},permissionKey:'SPECIAL_APPROVAL'});
    session.Permissions=[{pageId:'purchase-requisition',canExecute:true},{actionId:'purchase-requisition.approve',canExecute:true}];
    expect(apply(approve,'purchase-requisition').disabled).toBe(true);
    session.Permissions.push({ActionCode:'SPECIAL_APPROVAL',PostPermission:'Yes'});
    expect(apply(approve,'purchase-requisition')).toBe(approve);
  });

  it('preserves the previous explicit PR mapping for all workflow actions', () => {
    for(const action of ['submit','approve','reject','reopen','cancel']) {
      const implicit=command('cmd:'+action,{apiAction:{name:action}});
      const explicit={...implicit,permissionKey:'purchase-requisition.'+action};
      for(const allowed of [false,true]) {
        session.Permissions=[{pageId:'purchase-requisition',canExecute:true},{actionId:'purchase-requisition.'+action,canExecute:allowed}];
        expect(apply(implicit,'purchase-requisition').disabled).toBe(apply(explicit,'purchase-requisition').disabled);
      }
    }
  });

  it('uses custom action permission keys instead of falling back to page execute rights', () => {
    session.Permissions = [{ PageName: 'purchase order', CanExecute: true }];
    const custom = command('cmd:post', { permissionKey: 'POST_PURCHASE_ORDER' });
    expect(apply(custom).disabled).toBe(true);
    session.Permissions.push({ ActionCode: 'Post-Purchase-Order', PostPermission: 'Yes' });
    expect(apply(custom)).toBe(custom);
    session.Permissions[1] = { ActionCode: 'Post-Purchase-Order', PostPermission: 'No' };
    expect(apply(custom).disabled).toBe(true);
  });

  it('does not mutate denied commands and retains an existing tooltip', () => {
    const original = command('cmd:delete', { tooltip: 'Requires manager access' });
    const denied = apply(original);
    expect(denied).not.toBe(original);
    expect(denied).toMatchObject({ disabled: true, tooltip: 'Requires manager access' });
    expect(original.disabled).toBeUndefined();
  });

  it('keeps hidden commands and the legacy SuperAdmin fallback when no server page contract exists', () => {
    const hidden = command('cmd:new', { hidden: true });
    expect(apply(hidden)).toBe(hidden);
    session.SuperAdmin = true;
    const restricted = command('cmd:delete');
    expect(apply(restricted)).toBe(restricted);
  });

  it('honors explicit server operation restrictions for SuperAdmin too', () => {
    session.SuperAdmin = true;
    session.Permissions = [{pageId: 'items', canRead: true, canCreate: true, canUpdate: true, canDelete: false, canExecute: false},
      {pageId: 'items-lines', canRead: false}];
    expect(policy.apply(command('delete'), 'items').disabled).toBe(true);
    expect(policy.applyOperation(command('delete'), 'items', 'delete').disabled).toBe(true);
    expect(policy.apply(command('save'), 'items').disabled).not.toBe(true);
    expect(policy.apply(command('release'), 'items').disabled).toBe(true);
    expect(policy.apply(command('related', {runModalPageId: 'item-units-of-measure', permissionKey: 'items-lines'}), 'items').disabled).toBe(true);
  });

  it('normalizes command keys consistently for default and configured commands', () => {
    expect(policy.normalizePopupCommandKey('  CMD:Line-New  ')).toBe('line-new');
    expect(policy.normalizePopupCommandKey('Refresh')).toBe('refresh');
    expect(policy.normalizePopupCommandKey(undefined)).toBe('');
  });
  it('uses related-page read rights without granting write or business execute rights', () => {
    const button = command('cmd:related', {
      runModalPageId: 'item-units-of-measure',
      permissionKey: 'items-lines',
    });
    session.Permissions = [
      { pageId: 'items-lines', canRead: true, canUpdate: false, canExecute: false },
    ];
    expect(apply(button)).toBe(button);
    expect(apply(command('cmd:save'), 'items-lines').disabled).toBe(true);
    session.Permissions = [{ pageId: 'items', canRead: true, canExecute: true }];
    expect(apply(button).disabled).toBe(true);
  });
});
