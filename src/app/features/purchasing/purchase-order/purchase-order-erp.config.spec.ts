import { describe, expect, it, vi } from 'vitest';
import { MenuService } from '../../../core/services/menu.service';
import type { PermissionService } from '../../../core/services/permission.service';
import { PageCommandService } from '../../../platform/pages/page-command.service';
import {
  purchaseOrderHeaderConfig,
  purchaseOrderLineConfig,
  purchaseOrderListConfig,
} from './purchase-order-erp.config';

describe('Live Purchase Order List + Header + Lines contract', () => {
  it('registers a navigable company-authorized document in the shared Purchase menu', () => {
    const menu = new MenuService({ canView: () => true } as unknown as PermissionService);
    const purchase = menu.getModuleItems('Purchase');
    expect(purchase.find(page => page.pageId === 'purchase-order')).toMatchObject({
      label: 'Purchase Orders', route: '/purchase-order',
    });
    expect(purchaseOrderListConfig.pageType).toBe('document');
    expect(purchaseOrderListConfig.dataSource.endpoint).toBe('/purchaseOrders');
  });

  it('uses only Laravel PO list/card fields rather than legacy PO API names', () => {
    const listFields = purchaseOrderListConfig.dataSurface?.columns.map(field => field.field);
    expect(listFields).toContain('vendorName');
    expect(listFields).toContain('amountTotal');
    expect(listFields).toContain('sourceRequisitionNumber');
    expect(listFields).not.toContain('buyFromVendorNumber');
    const headerFields = purchaseOrderHeaderConfig.sections.flatMap(section => section.fields);
    expect(headerFields.filter(field => !field.readonly).map(field => field.key))
      .toEqual(['externalDocumentNo']);
    expect(purchaseOrderListConfig.dataSource.updateFields).toEqual(['externalDocumentNo']);
    expect(purchaseOrderListConfig.dataSource.writableStates).toEqual({
      field: 'status', values: ['open'],
    });
  });

  it('uses nested company-scoped PO lines and permits only supported updates', () => {
    const source = purchaseOrderLineConfig.dataSource;
    expect(source.navigation).toEqual({
      parentEndpoint: '/purchaseOrders', parentIdFields: ['systemId'], childCollection: 'lines',
    });
    expect(source.supportsCreate).toBe(false);
    expect(source.supportsUpdate).toBe(true);
    expect(source.supportsDelete).toBe(false);
    expect(source.updateFields).toEqual([
      'quantity', 'directUnitCost', 'description', 'requiredDate',
    ]);
    const fields = purchaseOrderLineConfig.columns;
    expect(fields.find(field => field.id === 'lineAmount')?.readonly).toBe(true);
    expect(fields.find(field => field.id === 'sourceRequisitionLineNo')?.readonly).toBe(true);
  });

  it('never claims a standalone PO or PO-line create/delete API exists', () => {
    expect(purchaseOrderListConfig.dataSource.supportsCreate).toBe(false);
    expect(purchaseOrderListConfig.dataSource.supportsDelete).toBe(false);
    expect(purchaseOrderListConfig.standardActions?.new).toBe(false);
    expect(purchaseOrderListConfig.standardActions?.delete).toBe(false);
    const hidden = purchaseOrderHeaderConfig.toolbarButtons.filter(button => button.hidden);
    expect(hidden.map(button => button.actionKey)).toEqual(['cmd:new', 'cmd:delete']);
    expect(purchaseOrderLineConfig.toolbarButtons.every(button => button.hidden)).toBe(true);
  });

  it('routes backend-authorized release, reopen and cancel with valid states', () => {
    const actions = purchaseOrderHeaderConfig.toolbarButtons.filter(action => action.apiAction);
    expect(actions.map(action => action.apiAction?.name)).toEqual(['release', 'reopen', 'cancel']);
    expect(actions.map(action => action.apiAction?.states?.values)).toEqual([
      ['open'], ['released'], ['open', 'released'],
    ]);
    expect(actions.every(action => action.disabled !== true)).toBe(true);
  });

  it('dispatches standard prefixed commands while retaining custom action identities', () => {
    const service = new PageCommandService();
    const refresh = vi.fn();
    const custom = vi.fn();
    expect(service.handleListCommand({ actionKey: 'cmd:refresh' }, { refresh, command: custom }))
      .toBe(true);
    expect(refresh).toHaveBeenCalledOnce();
    expect(custom).not.toHaveBeenCalled();
    service.handleListCommand({ actionKey: 'cmd:business-action', payload: 42 }, { command: custom });
    expect(custom).toHaveBeenCalledWith('cmd:business-action', 42);
  });
});
