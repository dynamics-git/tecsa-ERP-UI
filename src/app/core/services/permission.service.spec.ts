import { describe, expect, it } from 'vitest';
import { PermissionService } from './permission.service';
import { SessionService } from './session.service';

describe('TecSA permission controls fail closed', () => {
  it('does not grant access without backend permissions or based on an admin-like user name', () => {
    const session = {
      SuperAdmin: false,
      UserName: 'admin@tecsa.com.my',
      Permissions: [],
    } as unknown as SessionService;
    const permissions = new PermissionService(session);
    expect(permissions.isSuperAdmin()).toBe(false);
    expect(permissions.canView('purchase-order')).toBe(false);
    expect(permissions.hasPermission('purchase_orders')).toBe(false);
  });

  it('accepts explicit backend page read and refuses a different page', () => {
    const session = {
      SuperAdmin: false,
      UserName: 'ordinary',
      Permissions: [{ PageId: 'purchase-order', PageName: 'Purchase Order', ObjectName: 'purchase_orders', ReadPermission: 'Yes' }],
    } as unknown as SessionService;
    const permissions = new PermissionService(session);
    expect(permissions.canView('purchase-order')).toBe(true);
    expect(permissions.canView('sales-order')).toBe(false);
    expect(permissions.hasPermission('purchase_orders')).toBe(true);
    expect(permissions.hasPermission('sales_orders')).toBe(false);
  });
});
