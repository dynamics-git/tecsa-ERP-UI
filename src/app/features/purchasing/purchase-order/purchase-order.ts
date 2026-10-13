import { Component } from '@angular/core';
import { DocumentPageCommandEvent, DocumentPage } from '../../../platform/public-api';
import {
  purchaseOrderHeaderConfig,
  purchaseOrderLineConfig,
  purchaseOrderListConfig,
} from './purchase-order.config';

@Component({
  selector: 'app-purchase-order',
  standalone: true,
  imports: [DocumentPage],
  templateUrl: './purchase-order.html',
})
export class PurchaseOrderPage {
  readonly pageId = 'purchase-order';
  readonly listConfig = purchaseOrderListConfig;
  readonly headerConfig = purchaseOrderHeaderConfig;
  readonly lineConfig = purchaseOrderLineConfig;

 handleBusinessCommand(event: DocumentPageCommandEvent): void {
    // Only add code here for real business processes.
  }
}


