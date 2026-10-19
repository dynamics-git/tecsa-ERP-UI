import type { CommandConfig } from '../models/command-config.model';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DataSourceConfig } from '../models/data-source-config.model';

import { LineConfig } from '../models/line-config.model';
import { DocumentPageCommandPermissionService } from './document-page-command-permission.service';
import { DocumentPageCommandAssemblerService } from './document-page-command-assembler.service';

describe('DocumentPage command assembly', () => {
  let assembler: DocumentPageCommandAssemblerService;
  let permission: {
    apply: ReturnType<typeof vi.fn>;
    normalizePopupCommandKey: (action: unknown) => string;
  };
  const pageId = 'purchase-order';
  const source = { endpoint: '/purchaseOrderHeaders' } as DataSourceConfig;
  const button = (actionKey: string, rest: Partial<CommandConfig> = {}): CommandConfig =>
    ({ actionKey, label: actionKey, ...rest });

  beforeEach(() => {
    permission = {
      apply: vi.fn((value: CommandConfig) => value),
      normalizePopupCommandKey: (action: unknown) => {
        const text = action == null ? '' : String(action).trim().toLowerCase();
        return text.startsWith('cmd:') ? text.slice(4) : text;
      },
    };
    assembler = new DocumentPageCommandAssemblerService(
      permission as unknown as DocumentPageCommandPermissionService,
    );
  });

  it('preserves the default header action order, icons, and primary/danger semantics', () => {
    const result = assembler.resolveHeaderToolbarButtons({ dataSource: source, pageId });
    expect(result.map(value => value.actionKey)).toEqual(['cmd:new', 'cmd:delete', 'cmd:refresh']);
    expect(result.map(value => value.order)).toEqual([10, 20, 30]);
    expect(result.map(value => value.isPrimary)).toEqual([true, true, true]);
    expect(result[0].icon).toBe('bi bi-plus-lg');
    expect(result[1].tone).toBe('danger');
    expect(result[2].icon).toBe('bi bi-arrow-clockwise');
    expect(permission.apply).toHaveBeenCalledTimes(3);
    expect(permission.apply.mock.calls.every(call => call[1] === pageId)).toBe(true);
  });

  it('retains disabled create/delete defaults when data sources do not support the operation', () => {
    const result = assembler.resolveHeaderToolbarButtons({
      dataSource: { ...source, supportsCreate: false, supportsDelete: false },
      pageId,
    });
    expect(result[0]).toMatchObject({ disabled: true, tooltip: 'Create is not supported for this page.' });
    expect(result[1]).toMatchObject({ disabled: true, tooltip: 'Delete is not supported for this page.' });
    expect(result[2].disabled).toBeUndefined();
  });

  it('merges normalized header commands without mutating original configuration', () => {
    const configured = [
      button(' CMD:NEW ', { label: 'Create order', icon: 'custom-plus', order: 5 }),
      button('cmd:release', { label: 'Release', permissionKey: 'RELEASE_ORDER' }),
      button('CMD:REFRESH', { label: 'Reload' }),
    ];
    const snapshot = configured.map(item => ({ ...item }));
    const result = assembler.resolveHeaderToolbarButtons({
      dataSource: source, toolbarButtons: configured, pageId,
    });
    expect(result.map(item => item.actionKey)).toEqual([' CMD:NEW ', 'cmd:delete', 'CMD:REFRESH', 'cmd:release']);
    expect(result[0]).toMatchObject({ label: 'Create order', icon: 'custom-plus', order: 5, isPrimary: true });
    expect(result[2].label).toBe('Reload');
    expect(configured).toEqual(snapshot);
    expect(permission.apply).toHaveBeenCalledTimes(4);
  });

  it('keeps the line toolbar empty without a line configuration', () => {
    expect(assembler.resolveLineToolbarButtons({ lineConfig: undefined, pageId })).toEqual([]);
    expect(permission.apply).not.toHaveBeenCalled();
  });

  it('preserves line defaults, capability restrictions and configured overrides', () => {
    const lineConfig = {
      dataSource: { supportsCreate: false, supportsDelete: false },
      toolbarButtons: [
        button('CMD:LINE-NEW', { label: 'Add row' }),
        button('cmd:line-check', { label: 'Check line' }),
      ],
    } as LineConfig;
    const result = assembler.resolveLineToolbarButtons({ lineConfig, pageId });
    expect(result.map(item => item.actionKey)).toEqual(['CMD:LINE-NEW', 'cmd:line-delete', 'cmd:line-refresh', 'cmd:line-check']);
    expect(result[0]).toMatchObject({ label: 'Add row', disabled: true, tooltip: 'Line create is not supported for this page.' });
    expect(result[1]).toMatchObject({ disabled: true, tooltip: 'Line delete is not supported for this page.' });
    expect(result[2].label).toBe('Refresh Lines');
    expect(permission.apply).toHaveBeenCalledTimes(4);
    expect(lineConfig.toolbarButtons?.[0].disabled).toBeUndefined();
  });

  it('preserves undefined/empty detail arrays and clones populated details before permissions', () => {
    expect(assembler.resolveDetailToolbarButtons({ pageId })).toBeUndefined();
    const empty: CommandConfig[] = [];
    expect(assembler.resolveDetailToolbarButtons({ toolbarButtons: empty, pageId })).toBe(empty);
    const configured = [button('cmd:statistics', { label: 'Statistics' })];
    permission.apply.mockImplementation((item: CommandConfig) => ({ ...item, disabled: true }));
    const result = assembler.resolveDetailToolbarButtons({ toolbarButtons: configured, pageId });
    expect(result?.[0]).toMatchObject({ actionKey: 'cmd:statistics', disabled: true });
    expect(configured[0].disabled).toBeUndefined();
  });

  it('keeps the final duplicate normalized override without duplicating the default', () => {
    const configured = [
      button('cmd:refresh', { label: 'First refresh' }),
      button('REFRESH', { label: 'Final refresh' }),
    ];
    const result = assembler.resolveHeaderToolbarButtons({ dataSource: source, toolbarButtons: configured, pageId });
    expect(result.map(item => item.actionKey)).toEqual(['cmd:new', 'cmd:delete', 'REFRESH']);
    expect(result[2].label).toBe('Final refresh');
  });
});
