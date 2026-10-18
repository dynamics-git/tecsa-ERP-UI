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
    expect(permissions.canView('customer')).toBe(false);
    expect(permissions.hasPermission('customers')).toBe(false);
  });

  it('accepts explicit backend page read and refuses a different page', () => {
    const session = {
      SuperAdmin: false,
      UserName: 'ordinary',
      Permissions: [{ PageId: 'customer', PageName: 'Customer', ObjectName: 'customers', ReadPermission: 'Yes' }],
    } as unknown as SessionService;
    const permissions = new PermissionService(session);
    expect(permissions.canView('customer')).toBe(true);
    expect(permissions.canView('sales-order')).toBe(false);
    expect(permissions.hasPermission('customers')).toBe(true);
    expect(permissions.hasPermission('sales_orders')).toBe(false);
  });
});
