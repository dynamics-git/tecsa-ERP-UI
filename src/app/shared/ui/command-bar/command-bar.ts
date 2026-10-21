import { Component, EventEmitter, Input, Output } from '@angular/core';
import {
  CommandConfig,
  StandardCommandConfig,
  StandardCommandStateConfig,
} from '../../../platform/models/command-config.model';

type StandardActionKey = 'new' | 'delete' | 'refresh';

type ResolvedStandardAction = {
  actionKey: StandardActionKey;
  label: string;
  icon?: string;
  order: number;
  group?: string;
  hidden?: boolean;
  permissionKey?: string;
  visible: boolean;
  disabled: boolean;
  tooltip?: string;
};

@Component({
  selector: 'app-command-bar',
  standalone: true,
  templateUrl: './command-bar.html',
  styleUrl: './command-bar.scss'
})
export class CommandBar {
  @Input() standardActions: StandardCommandConfig = {
    new: true,
    delete: true,
    refresh: true
  };
  @Input() commands: CommandConfig[] = [];
  @Output() command = new EventEmitter<{ actionKey: string; payload?: unknown }>();

  get visibleCommands(): CommandConfig[] {
    return this.commands.filter((item) => !item.hidden);
  }

  get newAction(): ResolvedStandardAction {
    return this.resolveStandardAction('new');
  }

  get deleteAction(): ResolvedStandardAction {
    return this.resolveStandardAction('delete');
  }

  get refreshAction(): ResolvedStandardAction {
    return this.resolveStandardAction('refresh');
  }

  get hasStandardActions(): boolean {
    return this.standardActionItems.length > 0;
  }

  get standardActionItems(): ResolvedStandardAction[] {
    return [this.newAction, this.deleteAction, this.refreshAction]
      .filter((item) => item.visible && item.hidden !== true)
      .sort((left, right) => left.order - right.order);
  }

  runStandardAction(actionKey: 'new' | 'delete' | 'refresh'): void {
    const action = this.resolveStandardAction(actionKey);
    if (action.disabled) {
      return;
    }

    this.command.emit({ actionKey });
  }

  runCommand(item: CommandConfig): void {
    if (item.disabled) {
      return;
    }

    this.command.emit({ actionKey: item.actionKey });
  }

  private resolveStandardAction(actionKey: StandardActionKey): ResolvedStandardAction {
    const value = this.standardActions[actionKey];
    const defaults: Record<StandardActionKey, ResolvedStandardAction> = {
      new: {
        actionKey: 'new',
        label: 'New',
        icon: 'ts-icon ts-icon-plus',
        order: 10,
        group: 'Process',
        visible: true,
        disabled: false,
      },
      delete: {
        actionKey: 'delete',
        label: 'Delete',
        icon: undefined,
        order: 20,
        group: 'Process',
        visible: true,
        disabled: false,
      },
      refresh: {
        actionKey: 'refresh',
        label: 'Refresh',
        icon: undefined,
        order: 30,
        group: 'Navigate',
        visible: true,
        disabled: false,
      },
    };

    if (value === false) {
      return { ...defaults[actionKey], visible: false, disabled: false };
    }

    if (value === true || value === undefined) {
      return defaults[actionKey];
    }

    const config = value as StandardCommandStateConfig;
    return {
      ...defaults[actionKey],
      label: config.label ?? defaults[actionKey].label,
      icon: config.icon ?? defaults[actionKey].icon,
      order: typeof config.order === 'number' ? config.order : defaults[actionKey].order,
      group: config.group ?? defaults[actionKey].group,
      hidden: config.hidden,
      permissionKey: config.permissionKey,
      visible: config.visible !== false,
      disabled: config.disabled === true,
      tooltip: config.tooltip,
    };
  }
}
