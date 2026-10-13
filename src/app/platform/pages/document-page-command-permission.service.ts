import { Injectable } from '@angular/core';
import { SessionService } from '../../core/services/session.service';
import { RuntimeValueMapperService } from '../data/runtime-value-mapper.service';
import { EntryCommandButtonConfig } from '../models/document-window-config.model';

// Extracted without changing the authorization rules or permission aliases.
// This governs the visual availability of document commands, not API authorization.
@Injectable({ providedIn: 'root' })
export class DocumentPageCommandPermissionService {
  constructor(
    private readonly sessionService: SessionService,
    private readonly valueMapper: RuntimeValueMapperService,
  ) {}

  apply(button: EntryCommandButtonConfig, pageId: string): EntryCommandButtonConfig {
    if (button.hidden === true || this.sessionService.SuperAdmin) {
      return button;
    }

    const permissions = this.resolvePagePermissionFlags(pageId);
    const action = this.normalizePopupCommandKey(button.actionKey);

    let allowed = true;
    if (action === 'new' || action === 'line-new' || action === 'line-insert') {
      allowed = permissions.canCreate;
    } else if (action === 'save' || action === 'apply' || action === 'edit') {
      allowed = permissions.canUpdate;
    } else if (action === 'delete' || action === 'line-delete') {
      allowed = permissions.canDelete;
    } else if (this.isCustomExecutableCommand(action)) {
      allowed = this.canExecutePopupCommand(button, permissions.canExecute);
    }

    if (allowed) {
      return button;
    }

    return {
      ...button,
      disabled: true,
      tooltip: button.tooltip ?? 'You do not have permission for this command.',
    };
  }

  private isCustomExecutableCommand(action: string): boolean {
    const standard = new Set([
      'new',
      'save',
      'apply',
      'edit',
      'delete',
      'refresh',
      'close',
      'line-new',
      'line-insert',
      'line-delete',
      'line-refresh',
    ]);
    return !standard.has(action);
  }

  private canExecutePopupCommand(button: EntryCommandButtonConfig, fallbackCanExecute: boolean): boolean {
    const permissionKey = this.valueMapper.toText(button.permissionKey).trim();
    if (!permissionKey.length) {
      return fallbackCanExecute;
    }

    const normalizedPermissionKey = this.normalizePermissionValue(permissionKey);
    const matched = this.sessionService.Permissions.filter((permission) =>
      this.matchesPermissionKey(permission, normalizedPermissionKey),
    );
    if (!matched.length) {
      return false;
    }

    return matched.some((permission) =>
      this.readPermissionFlag(permission, ['canExecute', 'CanExecute', 'PostPermission']),
    );
  }

  private resolvePagePermissionFlags(pageId: string): {
    canCreate: boolean;
    canUpdate: boolean;
    canDelete: boolean;
    canExecute: boolean;
  } {
    const targetPage = this.valueMapper.toText(pageId).trim();
    const matched = this.sessionService.Permissions.filter((permission) => this.matchesPage(permission, targetPage));
    if (!matched.length) {
      return { canCreate: false, canUpdate: false, canDelete: false, canExecute: false };
    }

    return {
      canCreate: matched.some((permission) =>
        this.readPermissionFlag(permission, ['canCreate', 'CanCreate', 'InsertPermission']),
      ),
      canUpdate: matched.some((permission) =>
        this.readPermissionFlag(permission, ['canUpdate', 'CanUpdate', 'ModifyPermission']),
      ),
      canDelete: matched.some((permission) =>
        this.readPermissionFlag(permission, ['canDelete', 'CanDelete', 'DeletePermission']),
      ),
      canExecute: matched.some((permission) =>
        this.readPermissionFlag(permission, ['canExecute', 'CanExecute', 'PostPermission']),
      ),
    };
  }

  private matchesPage(permission: unknown, pageId: string): boolean {
    const normalizedPageId = this.normalizePermissionValue(pageId);
    if (!normalizedPageId.length) {
      return false;
    }

    const declaredPageId = this.readPermissionValue(permission, ['pageId', 'PageId']);
    const declaredPageName = this.readPermissionValue(permission, ['pageName', 'PageName']);
    const declaredObjectName = this.readPermissionValue(permission, ['objectName', 'ObjectName']);

    return this.normalizePermissionValue(declaredPageId) === normalizedPageId
      || this.normalizePermissionValue(declaredPageName) === normalizedPageId
      || this.normalizePermissionValue(declaredObjectName) === normalizedPageId;
  }

  private matchesPermissionKey(permission: unknown, normalizedPermissionKey: string): boolean {
    const actionId = this.readPermissionValue(permission, ['actionId', 'ActionId']);
    const actionCode = this.readPermissionValue(permission, ['actionCode', 'ActionCode']);
    const pageName = this.readPermissionValue(permission, ['pageName', 'PageName']);
    const objectName = this.readPermissionValue(permission, ['objectName', 'ObjectName']);

    return this.normalizePermissionValue(actionId) === normalizedPermissionKey
      || this.normalizePermissionValue(actionCode) === normalizedPermissionKey
      || this.normalizePermissionValue(pageName) === normalizedPermissionKey
      || this.normalizePermissionValue(objectName) === normalizedPermissionKey;
  }

  private readPermissionValue(permission: unknown, keys: string[]): string {
    if (!this.valueMapper.isRecord(permission)) {
      return '';
    }

    for (const key of keys) {
      if (!(key in permission)) {
        continue;
      }

      const value = permission[key];
      if (value === undefined || value === null) {
        continue;
      }

      return String(value);
    }

    return '';
  }

  private readPermissionFlag(permission: unknown, keys: string[]): boolean {
    const value = this.readPermissionValue(permission, keys);
    const normalized = value.trim().toLowerCase();
    return normalized === 'true'
      || normalized === '1'
      || normalized === 'yes'
      || normalized === 'full';
  }

  private normalizePermissionValue(value: unknown): string {
    if (value === undefined || value === null) {
      return '';
    }

    return String(value)
      .trim()
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .toUpperCase();
  }

  normalizePopupCommandKey(actionKey: unknown): string {
    const raw = this.valueMapper.toText(actionKey).trim().toLowerCase();
    return raw.startsWith('cmd:') ? raw.slice('cmd:'.length) : raw;
  }
}
