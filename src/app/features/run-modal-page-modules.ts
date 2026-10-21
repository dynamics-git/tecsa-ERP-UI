import * as purchaseOrder from './purchasing/purchase-order/purchase-order.config';
import * as noSeries from './administration/no-series/no-series';
import * as purchaseRequisition from './purchasing/purchase-requisition/purchase-requisition.config';
import * as purchasesPayablesSetup from './setup/purchases-payables-setup/purchases-payables-setup';
import * as salesReceivablesSetup from './setup/sales-receivables-setup/sales-receivables-setup';
import { RunModalConfigModule } from '../platform/public-api';

export const runModalPageModules: RunModalConfigModule[] = [
  purchaseOrder,
  noSeries,
  purchaseRequisition,
  purchasesPayablesSetup,
  salesReceivablesSetup,
];
