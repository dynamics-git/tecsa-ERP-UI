import * as customer from './sales/customer/customer.config';
import * as purchaseRequisition from './purchasing/purchase-requisition/purchase-requisition.config';
import * as numberSeries from './setup/number-series/number-series.config';
import { RunModalConfigModule } from '../platform/public-api';

export const runModalPageModules: RunModalConfigModule[] = [numberSeries, customer, purchaseRequisition];
