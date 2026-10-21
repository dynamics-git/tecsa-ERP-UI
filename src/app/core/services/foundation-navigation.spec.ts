import { describe, expect, it, vi } from 'vitest';
import { routes } from '../../app.routes';
import { MenuService } from './menu.service';
import { PermissionService } from './permission.service';
import { getRegisteredRunModalPageIds } from './run-modal-config-registry';

describe('F1 navigation registrations', () => {
  it('registers the supported pages and keeps menu/search destinations consistent with routes', () => {
    const permission = { canView: vi.fn(() => true), hasPermission: vi.fn(() => true) };
    const menu = new MenuService(permission as unknown as PermissionService);
    const expected = ['no-series', 'purchase-order', 'purchase-requisition', 'purchases-payables-setup', 'sales-receivables-setup'];
    expect(getRegisteredRunModalPageIds()).toEqual(expected);
    const shell = routes.find(route => route.path === '')!;
    expect(shell.canActivate).toHaveLength(1);
    expect(shell.canActivateChild).toHaveLength(2);
    expect(shell.children!.map(route => route.path).filter(Boolean).sort()).toEqual(expected);
    const items = menu.getModules().flatMap(module => module.children ?? []);
    expect(items.map(item => item.pageId).sort()).toEqual(expected.filter(id => id !== 'purchase-order'));
    for (const item of items) expect(shell.children!.some(route => '/' + route.path === item.route)).toBe(true);
    expect(menu.search('purchase').map(item => item.pageId).sort()).toEqual(['purchase-requisition', 'purchases-payables-setup']);
    expect(menu.search('customer')).toEqual([]);
    expect(menu.search('role')).toEqual([]);
    expect(permission.canView).toHaveBeenCalledWith('purchase-requisition');
  });

  it('continues to enforce page visibility in menus and global search', () => {
    const menu = new MenuService({ canView: () => false, hasPermission: () => true } as unknown as PermissionService);
    expect(menu.getModuleItems('purchase')).toEqual([]);
    expect(menu.getModules()).toEqual([]);
    expect(menu.search('purchase')).toEqual([]);
  });
});
