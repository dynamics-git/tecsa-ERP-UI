import type { CommandConfig } from '../models/command-config.model';
import { Injectable } from '@angular/core';
import { DataSourceConfig } from '../models/data-source-config.model';

import { LineConfig } from '../models/line-config.model';
import { DocumentPageCommandPermissionService } from './document-page-command-permission.service';

// Command construction is shared by every config-driven document page.
// Preserve the original default commands, configured overrides and permission semantics.
@Injectable({ providedIn: 'root' })
export class DocumentPageCommandAssemblerService {
  constructor(private readonly popupCommandPermission: DocumentPageCommandPermissionService) {}

  resolveHeaderToolbarButtons(params: { dataSource: DataSourceConfig; toolbarButtons?: CommandConfig[]; pageId: string }): CommandConfig[] {
    const supportsCreate = params.dataSource.supportsCreate !== false;
    const supportsDelete = params.dataSource.supportsDelete !== false;

    const defaults: CommandConfig[] = [
      {
        label: 'New',
        actionKey: 'cmd:new',
        isPrimary: true,
        order: 10,
        icon: 'ts-icon ts-icon-plus',
        disabled: !supportsCreate,
        tooltip: !supportsCreate ? 'Create is not supported for this page.' : undefined,
      },
      {
        label: 'Delete',
        actionKey: 'cmd:delete',
        isPrimary: true,
        order: 20,
        icon: 'ts-icon ts-icon-trash',
        tone: 'danger',
        disabled: !supportsDelete,
        tooltip: !supportsDelete ? 'Delete is not supported for this page.' : undefined,
      },
      {
        label: 'Refresh',
        actionKey: 'cmd:refresh',
        isPrimary: true,
        order: 30,
        icon: 'ts-icon ts-icon-refresh',
      },
    ];

    const configured = (params.toolbarButtons ?? []).map((button) => ({ ...button }));
    return this
      .mergePopupDefaultCommands(defaults, configured)
      .map((button) => {
        const action = this.normalizePopupCommandKey(button.actionKey);
        const unsupported = (action === 'new' && !supportsCreate) || (action === 'delete' && !supportsDelete);
        const guarded = unsupported ? {...button, disabled: true} : button;
        const operation = action === 'new' ? params.dataSource.permissions?.create : action === 'delete' ? params.dataSource.permissions?.delete : undefined;
        return operation ? this.popupCommandPermission.applyOperation(guarded, params.pageId, operation) : this.applyPopupCommandPermission(guarded, params.pageId);
      });
  }

  resolveLineToolbarButtons(params: { lineConfig?: LineConfig; pageId: string }): CommandConfig[] {
    if (!params.lineConfig) {
      return [];
    }

    const supportsCreate = params.lineConfig.dataSource.supportsCreate !== false;
    const supportsDelete = params.lineConfig.dataSource.supportsDelete !== false;

    const defaults: CommandConfig[] = [
      {
        label: 'Line',
        actionKey: 'cmd:line-new',
        isPrimary: true,
        order: 10,
        icon: 'ts-icon ts-icon-plus',
        disabled: !supportsCreate,
        tooltip: !supportsCreate ? 'Line create is not supported for this page.' : undefined,
      },
      {
        label: 'Delete Line',
        actionKey: 'cmd:line-delete',
        isPrimary: true,
        order: 20,
        icon: 'ts-icon ts-icon-trash',
        tone: 'danger',
        disabled: !supportsDelete,
        tooltip: !supportsDelete ? 'Line delete is not supported for this page.' : undefined,
      },
      {
        label: 'Refresh Lines',
        actionKey: 'cmd:line-refresh',
        isPrimary: true,
        order: 30,
        icon: 'ts-icon ts-icon-refresh',
      },
    ];

    if (supportsCreate && params.lineConfig.editable !== false && params.lineConfig.dataSource.createFields?.length && params.lineConfig.columns?.length) {
      defaults.push({label:'Paste Lines',actionKey:'cmd:line-paste',order:50,tooltip:'Preview Excel cells as new lines before applying.'});
      defaults.push({label: 'Copy Line', actionKey: 'cmd:line-copy', order: 40,
        tooltip: 'Copy selected lines as new lines. Identity and line numbering are assigned by the server.'});
    }
    if (params.lineConfig.columns?.length) defaults.push({label:'Copy Rows',actionKey:'cmd:line-copy-rows',order:60,tooltip:'Copy selected line values to Excel. Ctrl+C also works when the grid is focused.'});
    const configured = (params.lineConfig.toolbarButtons ?? []).map((button) => ({ ...button }));
    return this
      .mergePopupDefaultCommands(defaults, configured)
      .map((button) => {
        const action = this.normalizePopupCommandKey(button.actionKey);
        button = ((action === 'line-new' || action === 'line-insert' || action === 'line-copy' || action === 'line-paste') && !supportsCreate) || (action === 'line-delete' && !supportsDelete) ? {...button, disabled: true} : button;
        const override = action === 'line-new' || action === 'line-insert' || action === 'line-copy' || action === 'line-paste' ? params.lineConfig?.dataSource.permissions?.create
          : action === 'line-delete' ? params.lineConfig?.dataSource.permissions?.delete : undefined;
        return override ? this.popupCommandPermission.applyOperation(button, params.pageId, override) : this.applyPopupCommandPermission(button, params.pageId);
      });
  }

  resolveDetailToolbarButtons(params: { toolbarButtons?: CommandConfig[]; pageId: string }): CommandConfig[] | undefined {
    if (!params.toolbarButtons?.length) {
      return params.toolbarButtons;
    }

    return params.toolbarButtons
      .map((button) => ({ ...button }))
      .map((button) => this.applyPopupCommandPermission(button, params.pageId));
  }

  private applyPopupCommandPermission(button: CommandConfig, pageId: string): CommandConfig {
    return this.popupCommandPermission.apply(button, pageId);
  }

  private mergePopupDefaultCommands(
    defaults: CommandConfig[],
    configured: CommandConfig[],
  ): CommandConfig[] {
    const configuredByAction = new Map<string, CommandConfig>();
    for (const button of configured) {
      configuredByAction.set(this.normalizePopupCommandKey(button.actionKey), button);
    }

    const merged: CommandConfig[] = defaults.map((fallback) => {
      const configuredButton = configuredByAction.get(this.normalizePopupCommandKey(fallback.actionKey));
      return configuredButton ? { ...fallback, ...configuredButton } : fallback;
    });

    const mergedKeys = new Set(merged.map((button) => this.normalizePopupCommandKey(button.actionKey)));
    for (const button of configured) {
      const key = this.normalizePopupCommandKey(button.actionKey);
      if (!mergedKeys.has(key)) {
        merged.push(button);
        mergedKeys.add(key);
      }
    }

    return merged;
  }

  private normalizePopupCommandKey(actionKey: unknown): string {
    return this.popupCommandPermission.normalizePopupCommandKey(actionKey);
  }
}
