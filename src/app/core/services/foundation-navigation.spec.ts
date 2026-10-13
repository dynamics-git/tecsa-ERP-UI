import { describe, expect, it, vi } from 'vitest';
import { routes } from '../../app.routes';
import { MenuService } from './menu.service';
import { PermissionService } from './permission.service';
import { getRegisteredRunModalPageIds } from './run-modal-config-registry';

describe('F1 navigation registrations', () => {
  it('registers only the current document and keeps menu/search destinations consistent with routes', () => {
    const permission = { canView: vi.fn(() => true), hasPermission: vi.fn(() => true) };
    const menu = new MenuService(permission as unknown as PermissionService);
    expect(getRegisteredRunModalPageIds()).toEqual(['purchase-order']);
    const shell = routes.find(route => route.path === '')!;
    expect(shell.canActivate).toHaveLength(1);
    expect(shell.canActivateChild).toHaveLength(1);
    expect(shell.children!.map(route => route.path)).toEqual(['', 'purchase-order']);
    const items = menu.getModules().flatMap(module => module.children ?? []);
    expect(items.map(item => item.pageId)).toEqual(['purchase-order']);
    expect(items[0].route).toBe('/purchase-order');
    expect(menu.search('purchase').map(item => item.pageId)).toEqual(['purchase-order']);
    expect(menu.search('customer')).toEqual([]);
    expect(menu.search('role')).toEqual([]);
    expect(permission.canView).toHaveBeenCalledWith('purchase-order');
  });

  it('continues to enforce page visibility in menus and global search', () => {
    const menu = new MenuService({ canView: () => false, hasPermission: () => true } as unknown as PermissionService);
    expect(menu.getModuleItems('purchase')).toEqual([]);
    expect(menu.getModules()).toEqual([]);
    expect(menu.search('purchase')).toEqual([]);
  });
});
