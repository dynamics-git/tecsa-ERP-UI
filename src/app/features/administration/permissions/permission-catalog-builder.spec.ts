import { describe, expect, it } from 'vitest';
import { discoverPermissionCatalog } from './permission-catalog-builder';

describe('Permission Page Config discovery', () => {
  const sample = {
    sampleListConfig: {
      pageId: 'sample-order',
      pageType: 'document',
      title: 'Sample Order',
      menu: {module: 'Purchase',group: 'Documents',route: '/sample-order',icon: 'x'},
      dataSource: {endpoint: '/purchaseOrders'},
      dataSurface: {columns: [{field:'number',label:'No.'}]},
      commands: [{actionKey:'cmd:release',label:'Release'}],
    },
    sampleHeaderConfig: {
      dialogTitle: 'Order',
      toolbarButtons: [{actionKey:'cmd:submit',label:'Submit',runModalPageId:'order-details'}],
      sections: [{id:'general',fields:[{key:'status',label:'Status'}]}],
    },
    sampleLineConfig: {
      placement:{mode:'end'},dataSource:{endpoint:'/purchaseOrderLines'},
      columns:[{id:'quantity',label:'Quantity'}],toolbarButtons:[],
    },
  };

  it('registers one page with stable field, command and Run Modal identities', () => {
    const result = discoverPermissionCatalog([sample], ['purchase_orders']);
    expect(result.unmapped).toEqual([]);
    expect(result.mapped.length).toBe(1);
    const page = result.mapped[0];
    expect(page.pageId).toBe('sample-order');
    expect(page.route).toBe('/sample-order');
    expect(page.resource).toBe('purchase_orders');
    expect(page.targets).toContain(expect.objectContaining({surface:'header',targetType:'field',targetKey:'status'}));
    expect(page.targets).toContain(expect.objectContaining({surface:'line',targetType:'field',targetKey:'quantity'}));
    expect(page.targets).toContain(expect.objectContaining({surface:'list',targetType:'command',targetKey:'cmd:release'}));
    expect(page.targets).toContain(expect.objectContaining({surface:'runModal',targetType:'page',targetKey:'order-details'}));
  });

  it('does not register pages without an approved backend permission resource', () => {
    const result = discoverPermissionCatalog([sample], ['unrelated']);
    expect(result.mapped).toEqual([]);
    expect(result.unmapped).toEqual(['sample-order']);
  });

  it('does not create duplicate control identities', () => {
    const result = discoverPermissionCatalog([sample], ['purchase_orders']);
    const ids = result.mapped[0].targets.map(t => [t.surface,t.targetType,t.targetKey].join('|'));
    expect(new Set(ids).size).toBe(ids.length);
  });
});
