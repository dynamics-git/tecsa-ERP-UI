import { CommandConfig, resolveCommandPermissionKey } from '../models/command-config.model';
import { DataSourceService } from '../data/data-source.service';
import { DataSourceConfig } from '../models/data-source-config.model';
import { Injectable, Optional } from '@angular/core';
import { SessionService } from '../../core/services/session.service';
import { PermissionTargetService } from '../../core/services/permission-target.service';
import { RuntimeValueMapperService } from '../data/runtime-value-mapper.service';

// API action identities default centrally; explicit permission aliases remain supported.
// This governs the visual availability of document commands, not API authorization.
@Injectable({ providedIn: 'root' })
export class DocumentPageCommandPermissionService {
  constructor(
    private readonly sessionService: SessionService,
    private readonly valueMapper: RuntimeValueMapperService,
    @Optional() private readonly dataSource?: DataSourceService,
    @Optional() private readonly targets?: PermissionTargetService,
  ) {}

  apply(button: CommandConfig, pageId: string, source?: DataSourceConfig): CommandConfig {
    const guard = this.guardTarget(button, pageId);
    if (guard !== button) return guard;
    if (button.hidden === true) {
      return button;
    }

    if (source && button.apiAction && !button.runModalPageId) {
      const allowed = this.dataSource?.actionAllowed(source, button.apiAction.name);
      if (allowed === false) return {...button, disabled: true, tooltip: 'This action is not available for your access.'};
      if (allowed === true && !button.permissionKey) return button;
    }
    if (this.sessionService.SuperAdmin && !button.runModalPageId && !this.hasDeclaredPage(pageId)) return button;
    const permissions = this.resolvePagePermissionFlags(pageId);
    const action = this.normalizePopupCommandKey(button.actionKey);

    let allowed = true;
    if (button.runModalPageId) {
      const matched = this.sessionService.Permissions.filter(permission => this.matchesPage(permission, button.permissionKey ?? button.runModalPageId!));
      allowed = matched.length ? matched.some(permission => this.readPermissionFlag(permission, ['canRead', 'CanRead', 'ReadPermission'])) : this.sessionService.SuperAdmin;
    } else if (action === 'new' || action === 'line-new' || action === 'line-insert' || action === 'line-copy' || action === 'line-paste') {
      allowed = permissions.canCreate;
    } else if (action === 'line-copy-rows') {
      allowed = permissions.canRead;
    } else if (action === 'save' || action === 'apply' || action === 'edit') {
      allowed = permissions.canUpdate;
    } else if (action === 'delete' || action === 'line-delete') {
      allowed = permissions.canDelete;
    } else if (this.isCustomExecutableCommand(action)) {
      allowed = this.canExecutePopupCommand(button, pageId, permissions.canExecute);
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

  applySourceOperation(button: CommandConfig, pageId: string, source: DataSourceConfig,
    operation: 'create' | 'update' | 'delete'): CommandConfig {
    const guard = this.guardTarget(button, pageId);
    if (guard !== button) return guard;
    const allowed = this.dataSource?.operationAllowed(source, operation);
    if (allowed === false) return {...button, disabled: true, tooltip: 'This operation is not available for your access.'};
    const override = source.permissions?.[operation];
    if (allowed === true && !override) return button;
    return this.applyOperation(button, pageId, override ?? (operation === 'update' ? 'modify' : operation));
  }

  applyOperation(
    button: CommandConfig,
    pageId: string,
    operation: 'create' | 'modify' | 'delete',
  ): CommandConfig {
    const guard = this.guardTarget(button, pageId);
    if (guard !== button) return guard;
    if (button.hidden || this.sessionService.SuperAdmin && !this.hasDeclaredPage(pageId)) return button;
    const flags = this.resolvePagePermissionFlags(pageId);
    const allowed =
      operation === 'create'
        ? flags.canCreate
        : operation === 'modify'
          ? flags.canUpdate
          : flags.canDelete;
    return allowed
      ? button
      : { ...button, disabled: true, tooltip: 'You do not have permission for this operation.' };
  }

  private guardTarget(button: CommandConfig, pageId: string): CommandConfig {
    if (!this.targets || button.hidden) return button;
    const action = this.normalizePopupCommandKey(button.actionKey);
    const surface = button.surface ?? (action.startsWith('line-') ? 'line' : 'header');
    if (!this.targets.allowed(pageId, surface, 'command', button.actionKey, 'canView') ||
        (button.runModalPageId && !this.targets.allowed(pageId, 'runModal', 'page', button.runModalPageId, 'canView'))) {
      return {...button, hidden: true, disabled: true};
    }
    if (!this.targets.allowed(pageId, surface, 'command', button.actionKey, 'canExecute') ||
        (button.runModalPageId && !this.targets.allowed(pageId, 'runModal', 'page', button.runModalPageId, 'canExecute'))) {
      return {...button, disabled: true, tooltip: button.tooltip ?? 'You do not have permission for this command.'};
    }
    return button;
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
      'line-copy',
      'line-paste',
      'line-copy-rows',
      'line-delete',
      'line-refresh',
    ]);
    return !standard.has(action);
  }

  private canExecutePopupCommand(button: CommandConfig, pageId: string, fallbackCanExecute: boolean): boolean {
    const permissionKey = this.valueMapper.toText(resolveCommandPermissionKey(button, pageId)).trim();
    if (!permissionKey.length) {
      return fallbackCanExecute;
    }

    const normalizedPermissionKey = this.normalizePermissionValue(permissionKey);
    const matched = this.sessionService.Permissions.filter((permission) =>
      this.matchesPermissionKey(permission, normalizedPermissionKey),
    );
    if (!matched.length) {
      return this.sessionService.SuperAdmin && fallbackCanExecute;
    }

    return matched.some((permission) =>
      this.readPermissionFlag(permission, ['canExecute', 'CanExecute', 'PostPermission']),
    );
  }

  private hasDeclaredPage(pageId: string): boolean {
    return this.sessionService.Permissions.some(permission => this.matchesPage(permission, pageId));
  }

  private resolvePagePermissionFlags(pageId: string): {
    canRead: boolean;
    canCreate: boolean;
    canUpdate: boolean;
    canDelete: boolean;
    canExecute: boolean;
  } {
    const targetPage = this.valueMapper.toText(pageId).trim();
    const matched = this.sessionService.Permissions.filter((permission) =>
      this.matchesPage(permission, targetPage),
    );
    if (!matched.length) {
      return { canRead: false, canCreate: false, canUpdate: false, canDelete: false, canExecute: false };
    }

    return {
      canRead: matched.some(permission => this.readPermissionFlag(permission, ['canRead','CanRead','ReadPermission'])),
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

    return (
      this.normalizePermissionValue(declaredPageId) === normalizedPageId ||
      this.normalizePermissionValue(declaredPageName) === normalizedPageId ||
      this.normalizePermissionValue(declaredObjectName) === normalizedPageId
    );
  }

  private matchesPermissionKey(permission: unknown, normalizedPermissionKey: string): boolean {
    const actionId = this.readPermissionValue(permission, ['actionId', 'ActionId']);
    const actionCode = this.readPermissionValue(permission, ['actionCode', 'ActionCode']);
    const pageName = this.readPermissionValue(permission, ['pageName', 'PageName']);
    const objectName = this.readPermissionValue(permission, ['objectName', 'ObjectName']);

    return (
      this.normalizePermissionValue(actionId) === normalizedPermissionKey ||
      this.normalizePermissionValue(actionCode) === normalizedPermissionKey ||
      this.normalizePermissionValue(pageName) === normalizedPermissionKey ||
      this.normalizePermissionValue(objectName) === normalizedPermissionKey
    );
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
    return (
      normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'full'
    );
  }

  private normalizePermissionValue(value: unknown): string {
    if (value === undefined || value === null) {
      return '';
    }

    return String(value).trim().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').toUpperCase();
  }

  normalizePopupCommandKey(actionKey: unknown): string {
    const raw = this.valueMapper.toText(actionKey).trim().toLowerCase();
    return raw.startsWith('cmd:') ? raw.slice('cmd:'.length) : raw;
  }
}
