import { describe, expect, it, vi } from 'vitest';
import { routes } from '../../app.routes';
import { MenuService } from './menu.service';
import { PermissionService } from './permission.service';
import { getRegisteredPageIds } from './page-registry';

describe('F1 navigation registrations', () => {
  it('registers the supported pages and keeps menu/search destinations consistent with routes', () => {
    const permission = { canView: vi.fn(() => true), hasPermission: vi.fn(() => true) };
    const menu = new MenuService(permission as unknown as PermissionService);
    const expected = [
      'accounting-periods',
      'currencies',
      'dimension-combinations',
      'dimensions',
      'general-business-posting-groups',
      'general-ledger-setup',
      'general-posting-setup',
      'general-product-posting-groups',
      'gl-accounts',
      'inventory-posting-groups',
      'inventory-posting-setup',
      'inventory-setup',
      'item-charges',
      'item-default-dimensions',
      'items',
      'locations',
      'no-series',
      'notification-rules',
      'page-configuration',
      'payment-methods',
      'payment-terms',
      'permission-sets',
      'purchase-order',
      'purchase-requisition',
      'purchases-payables-setup',
      'reason-codes',
      'sales-receivables-setup',
      'source-code-setup',
      'source-codes',
      'units-of-measure',
      'users',
      'vat-business-posting-groups',
      'vat-posting-setup',
      'vat-product-posting-groups',
      'vendor-posting-groups',
      'vendors',
      'warehouse-bins',
      'warehouse-zones',
    ];
    expect(getRegisteredPageIds()).toEqual(
      [
        ...expected,
        'item-units-of-measure',
        'vendor-default-dimensions',
        'currency-exchange-rates',
        'dimension-values',
        'default-dimension-priorities',
        'gl-account-default-dimensions',
        'dimension-value-combinations',
        'page-permissions',
        'user-company-access',
      ].sort(),
    );
    const shell = routes.find((route) => route.path === '')!;
    expect(shell.canActivate).toHaveLength(1);
    expect(shell.canActivateChild).toHaveLength(2);
    expect(
      shell
        .children!.map((route) => route.path)
        .filter(Boolean)
        .sort(),
    ).toEqual(expected);
    const items = menu.getModules().flatMap((module) => module.children ?? []);
    expect(items.map((item) => item.pageId).sort()).toEqual(
      expected.filter((id) => !['purchase-order', 'item-default-dimensions'].includes(id)),
    );
    for (const item of items)
      expect(shell.children!.some((route) => '/' + route.path === item.route)).toBe(true);
    expect(menu.search('purchase requisition').map((item) => item.pageId)).toEqual([
      'purchase-requisition',
    ]);
    expect(menu.search('payment terms').map((item) => item.pageId)).toEqual(['payment-terms']);
    expect(menu.search('customer')).toEqual([]);
    expect(menu.search('role')).toEqual([]);
    expect(permission.canView).toHaveBeenCalledWith('purchase-requisition');
  });

  it('continues to enforce page visibility in menus and global search', () => {
    const menu = new MenuService({
      canView: () => false,
      hasPermission: () => true,
    } as unknown as PermissionService);
    expect(menu.getModuleItems('purchase')).toEqual([]);
    expect(menu.getModules()).toEqual([]);
    expect(menu.search('purchase')).toEqual([]);
  });
});
