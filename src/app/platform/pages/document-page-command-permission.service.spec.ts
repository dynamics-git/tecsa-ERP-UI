import { beforeEach, describe, expect, it } from 'vitest';
import { SessionService } from '../../core/services/session.service';
import { RuntimeValueMapperService } from '../data/runtime-value-mapper.service';
import { EntryCommandButtonConfig } from '../models/document-window-config.model';
import { DocumentPageCommandPermissionService } from './document-page-command-permission.service';

describe('DocumentPage popup command permissions', () => {
  let session: { SuperAdmin: boolean; Permissions: unknown[] };
  let policy: DocumentPageCommandPermissionService;
  const command = (actionKey: string, rest: Partial<EntryCommandButtonConfig> = {}): EntryCommandButtonConfig =>
    ({ label: actionKey, actionKey, ...rest });
  const apply = (button: EntryCommandButtonConfig, pageId = 'purchase_requisitions') => policy.apply(button, pageId);

  beforeEach(() => {
    session = { SuperAdmin: false, Permissions: [] };
    policy = new DocumentPageCommandPermissionService(
      session as SessionService,
      new RuntimeValueMapperService(),
    );
  });

  it('denies write and custom commands without page permissions but preserves refresh', () => {
    for (const action of ['cmd:new', 'cmd:line-new', 'cmd:line-insert', 'cmd:save', 'cmd:apply', 'cmd:edit', 'cmd:delete', 'cmd:line-delete', 'cmd:release']) {
      expect(apply(command(action))).toMatchObject({ disabled: true, tooltip: 'You do not have permission for this command.' });
    }
    const refresh = command('cmd:refresh');
    expect(apply(refresh)).toBe(refresh);
  });

  it('accepts the existing BC-style permission aliases and normalizes page identifiers', () => {
    session.Permissions = [{
      PageId: 'purchase_requisitions', InsertPermission: 'Yes', ModifyPermission: '1',
      DeletePermission: 'Full', PostPermission: 'TRUE',
    }];
    for (const action of ['cmd:new', 'cmd:save', 'cmd:apply', 'cmd:edit', 'cmd:delete', 'cmd:line-delete', 'cmd:release']) {
      const button = command(action);
      expect(apply(button)).toBe(button);
    }
  });

  it('uses modify for PR line create/delete, but header deletion still needs delete permission', () => {
    session.Permissions = [{
      PageId: 'purchase_requisitions', ReadPermission: 'Yes',
      InsertPermission: 'Yes', ModifyPermission: 'Yes', DeletePermission: 'No',
    }];
    expect(apply(command('cmd:line-new')).disabled).toBeUndefined();
    expect(apply(command('cmd:line-delete')).disabled).toBeUndefined();
    expect(apply(command('cmd:delete')).disabled).toBe(true);
  });

  it('uses custom action permission keys instead of falling back to page execute rights', () => {
    session.Permissions = [{ PageName: 'purchase requisitions', CanExecute: true }];
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

  it('leaves hidden commands untouched and bypasses visual restrictions for SuperAdmin', () => {
    const hidden = command('cmd:new', { hidden: true });
    expect(apply(hidden)).toBe(hidden);
    session.SuperAdmin = true;
    const restricted = command('cmd:delete');
    expect(apply(restricted)).toBe(restricted);
  });

  it('normalizes command keys consistently for default and configured commands', () => {
    expect(policy.normalizePopupCommandKey('  CMD:Line-New  ')).toBe('line-new');
    expect(policy.normalizePopupCommandKey('Refresh')).toBe('refresh');
    expect(policy.normalizePopupCommandKey(undefined)).toBe('');
  });
});
