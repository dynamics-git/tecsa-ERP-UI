import { describe, expect, it, vi } from 'vitest';
import { routes } from '../../app.routes';
import { MenuService } from './menu.service';
import { PermissionService } from './permission.service';
import { getRegisteredRunModalPageIds } from './run-modal-config-registry';

describe('Configuration-driven ERP navigation', () => {
  it('registers Customer, PR and the required setup pages', () => {
    const permission = { hasPermission: vi.fn(() => true), canView: vi.fn(() => true) };
    const menu = new MenuService(permission as unknown as PermissionService);
    expect(getRegisteredRunModalPageIds()).toEqual(['customer', 'number-series', 'purchase-requisition']);
    const shell = routes.find(route => route.path === '')!;
    expect(shell.canActivate).toHaveLength(1);
    expect(shell.canActivateChild).toHaveLength(1);
    expect(shell.children!.map(route => route.path)).toEqual(['', 'number-series', 'sales-receivables-setup', 'purchases-payables-setup', 'customer', 'purchase-requisition']);
    const items = menu.getModules().flatMap(module => module.children ?? []);
    expect(items.map(item => item.pageId)).toEqual(['number-series', 'sales-receivables-setup', 'purchases-payables-setup', 'customer', 'purchase-requisition']);
    expect(items.map(item => item.route)).toEqual(['/number-series', '/sales-receivables-setup', '/purchases-payables-setup', '/customer', '/purchase-requisition']);
    expect(menu.search('purchase').map(item => item.pageId)).toEqual(['purchase-requisition', 'purchases-payables-setup']);
    expect(menu.search('customer').map(item => item.pageId)).toEqual(['customer']);
    expect(permission.hasPermission).toHaveBeenCalledWith('number_series');
    expect(permission.hasPermission).toHaveBeenCalledWith('sales_receivables_setup');
    expect(permission.hasPermission).toHaveBeenCalledWith('purchases_payables_setup');
    expect(permission.hasPermission).toHaveBeenCalledWith('customers');
    expect(permission.hasPermission).toHaveBeenCalledWith('purchase_requisitions');
  });

  it('filters menus using company-scoped backend resource permissions', () => {
    const menu = new MenuService({
      hasPermission: (resource: string) => resource === 'customers',
    } as unknown as PermissionService);
    expect(menu.getModuleItems('purchase')).toEqual([]);
    expect(menu.getModules().map(module => module.pageId)).toEqual(['sales']);
    expect(menu.search('customer').map(item => item.pageId)).toEqual(['customer']);
  });
});
