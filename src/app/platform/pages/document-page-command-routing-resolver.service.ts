import { Injectable, inject } from '@angular/core';
import { EntryCommandButtonConfig } from '../models/document-window-config.model';
import { CommandConfig } from '../models/command-config.model';
import { ListCommandSelectionMode, ListCommandSelectionPolicyConfig } from '../models/page-config.model';
import { RuntimeValueMapperService } from '../data/runtime-value-mapper.service';

@Injectable({
  providedIn: 'root',
})
export class DocumentPageCommandRoutingResolverService {
  private readonly valueMapper = inject(RuntimeValueMapperService);

  normalizeCommandAction(params: { actionKey: unknown }): string {
    const raw = this.valueMapper.toText(params.actionKey).trim().toLowerCase();
    if (!raw.length) {
      return '';
    }

    return raw.startsWith('cmd:') ? raw.slice('cmd:'.length) : raw;
  }

  findListCommand(params: {
    actionKey: string;
    commands?: CommandConfig[];
  }): CommandConfig | undefined {
    return params.commands?.find((command) => command.actionKey === params.actionKey);
  }

  resolveCustomListCommandSelectionMode(params: {
    command?: CommandConfig;
    policy?: ListCommandSelectionPolicyConfig;
  }): ListCommandSelectionMode {
    if (!params.command) {
      return 'none';
    }

    if (typeof params.command.surface === 'string' && params.command.surface !== 'list') {
      return 'none';
    }

    const commandOverride =
      params.command.actionKey ? params.policy?.commands?.[params.command.actionKey] : undefined;
    if (commandOverride) {
      return commandOverride;
    }

    if (params.command.requireSelection === false) {
      return 'none';
    }

    if (params.command.selectionMode === 'multiple') {
      return 'multiple';
    }

    if (params.command.selectionMode === 'single') {
      return 'single';
    }

    if (params.command.requireSelection === true) {
      return params.policy?.defaultMode ?? 'single';
    }

    return params.policy?.defaultMode ?? 'none';
  }

  getSelectedListRecordCount(params: {
    checkedRowKeys: Set<string>;
    selectedRow: unknown;
    isRecord(value: unknown): value is Record<string, unknown>;
  }): number {
    if (params.checkedRowKeys.size > 0) {
      return params.checkedRowKeys.size;
    }

    return params.isRecord(params.selectedRow) ? 1 : 0;
  }

  validateCustomListCommandSelection(params: {
    command?: CommandConfig;
    policy?: ListCommandSelectionPolicyConfig;
    selectedCount: number;
  }): string | undefined {
    const mode = this.resolveCustomListCommandSelectionMode({
      command: params.command,
      policy: params.policy,
    });
    if (mode === 'none') {
      return undefined;
    }

    if (params.selectedCount === 0) {
      return mode === 'multiple'
        ? 'Select at least one record before running this action.'
        : 'Select one record before running this action.';
    }

    if (mode === 'single' && params.selectedCount !== 1) {
      return 'Select only one record before running this action.';
    }

    return undefined;
  }

  findEntryCommandButton(params: {
    command: string;
    headerToolbarButtons?: EntryCommandButtonConfig[];
    lineToolbarButtons?: EntryCommandButtonConfig[];
    detailToolbarButtons?: EntryCommandButtonConfig[];
  }): EntryCommandButtonConfig | undefined {
    const normalized = this.normalizeCommandAction({ actionKey: params.command });
    if (!normalized.length) {
      return undefined;
    }

    const allButtons = [
      ...(params.headerToolbarButtons ?? []),
      ...(params.lineToolbarButtons ?? []),
      ...(params.detailToolbarButtons ?? []),
    ];

    return allButtons.find(
      (button) => this.normalizeCommandAction({ actionKey: button.actionKey }) === normalized,
    );
  }

  resolveRunModalActiveLine(params: {
    payload: Record<string, unknown>;
    lineRows: Record<string, unknown>[];
    selectedLineIndexes: number[];
    activeLineRow?: Record<string, unknown>;
    headerData?: Record<string, unknown>;
    isRecord(value: unknown): value is Record<string, unknown>;
  }): Record<string, unknown> | undefined {
    const payloadActiveRow = params.payload['activeRow'];
    if (params.isRecord(payloadActiveRow)) {
      return payloadActiveRow;
    }

    const selectedIndexes = Array.isArray(params.payload['selectedIndexes'])
      ? params.payload['selectedIndexes']
          .map((value) => Number(value))
          .filter((value) => Number.isInteger(value) && value >= 0 && value < params.lineRows.length)
      : [];

    const selectedIndex = selectedIndexes[0] ?? params.selectedLineIndexes[0];
    if (selectedIndex !== undefined && params.lineRows[selectedIndex]) {
      return params.lineRows[selectedIndex];
    }

    if (params.activeLineRow) {
      return params.activeLineRow;
    }

    return params.headerData;
  }
}
