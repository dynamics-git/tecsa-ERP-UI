import { Injectable, inject } from '@angular/core';
import { StandardCommandConfig, StandardCommandStateConfig, CommandConfig } from '../models/command-config.model';
import { DataSourceConfig } from '../models/data-source-config.model';
import { ListPageConfig } from '../models/page-config.model';
import { DocumentPageCommandPermissionService } from './document-page-command-permission.service';

/** One default/override contract for shell and embedded list toolbars. */
@Injectable({ providedIn: 'root' })
export class StandardListActionsService {
  private readonly permissions = inject(DocumentPageCommandPermissionService);

  resolve(config: Pick<ListPageConfig, 'pageId' | 'standardActions' | 'tools'> & { dataSource?: Pick<DataSourceConfig, 'supportsCreate' | 'supportsDelete' | 'permissions' | 'singleton'> & Partial<Pick<DataSourceConfig, 'endpoint' | 'navigation' | 'addressStyle'>> }): StandardCommandConfig {
    const result: StandardCommandConfig = {};
    for (const key of ['new', 'delete', 'refresh'] as const) {
      const configured = config.standardActions?.[key];
      if (configured === false || (key === 'refresh' && config.tools?.refresh === false)) {
        result[key] = false;
        continue;
      }
      const override: StandardCommandStateConfig = typeof configured === 'object' ? configured : {};
      const unsupported = key === 'new' ? config.dataSource?.supportsCreate === false
        : key === 'delete' ? config.dataSource?.supportsDelete === false : false;
      const operation = key === 'new' ? 'create' : key;
      const labels = { new: 'New', delete: 'Delete', refresh: 'Refresh' };
      const icons = { new: 'ts-icon ts-icon-plus', delete: 'ts-icon ts-icon-trash', refresh: 'ts-icon ts-icon-refresh' };
      const command: CommandConfig = {
        ...override,
        label: override.label ?? labels[key],
        actionKey: key,
        disabled: unsupported || override.disabled === true,
        tooltip: unsupported ? `${labels[key]} is not supported for this page.` : override.tooltip,
      };
      const permission = key !== 'refresh' && config.dataSource?.endpoint
        ? this.permissions.applySourceOperation(command, config.pageId ?? '', config.dataSource as DataSourceConfig, key === 'new' ? 'create' : 'delete')
        : key === 'refresh' ? this.permissions.apply(command, config.pageId ?? '') : this.permissions.applyOperation(command, config.pageId ?? '',
        config.dataSource?.permissions?.[operation as 'create' | 'delete'] ?? (key === 'new' ? 'create' : 'delete'));
      result[key] = {
        ...override,
        label: command.label,
        icon: override.icon ?? icons[key],
        order: override.order ?? ({new: 10, delete: 20, refresh: 30}[key]),
        visible: override.visible !== false,
        disabled: permission.disabled === true,
        tooltip: permission.tooltip,
      };
    }
    return result;
  }
}
