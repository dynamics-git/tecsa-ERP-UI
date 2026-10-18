import * as customer from './sales/customer/customer.config';
import * as purchaseRequisition from './purchasing/purchase-requisition/purchase-requisition.config';
import { RunModalConfigModule } from '../platform/public-api';

export const runModalPageModules: RunModalConfigModule[] = [customer, purchaseRequisition];
