import { describe, expect, it } from 'vitest';
import {
  purchaseOrderHeaderConfig,
  purchaseOrderListCommandsConfig,
  purchaseOrderListConfig,
} from './purchase-order.config';
import { purchaseRequisitionHeaderConfig } from '../purchase-requisition/purchase-requisition.config';

describe('UI-F1.2 Purchase Order command availability', () => {
  it('shows incomplete Purchase Order processing actions as unavailable', () => {
    const pending = [
      ...purchaseOrderHeaderConfig.toolbarButtons,
      ...purchaseOrderListCommandsConfig,
    ];
    expect(pending.length).toBeGreaterThan(10);
    for (const action of pending) {
      expect(action.disabled, action.actionKey).toBe(true);
      expect(action.tooltip, action.actionKey).toContain('not implemented yet');
    }
  });

  it('preserves functional declarative actions and the existing PO read-only policy', () => {
    const requisitionSubmit = purchaseRequisitionHeaderConfig.toolbarButtons.find(
      action => action.actionKey === 'cmd:submit',
    );
    expect(requisitionSubmit?.apiAction?.name).toBe('submit');
    expect(requisitionSubmit?.disabled).not.toBe(true);
    expect(purchaseOrderListConfig.dataSource.supportsCreate).toBe(false);
    expect(purchaseOrderListConfig.dataSource.supportsUpdate).toBe(false);
    expect(purchaseOrderListConfig.dataSource.supportsDelete).toBe(false);
  });
});
