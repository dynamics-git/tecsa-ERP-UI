import { Component, Input } from '@angular/core';
import { ListPage, RunModalPageWindow, PageCommandEvent } from '../../../platform/public-api';
import {
  purchaseOrderListConfig,
  purchaseOrderHeaderConfig,
  purchaseOrderLineConfig,
} from './purchase-order.config';
export * from './purchase-order.config';

@Component({
  selector: 'app-purchase-order',
  standalone: true,
  imports: [ListPage],
  templateUrl: './purchase-order.html',
})
export class PurchaseOrderPage {
  @Input() runModal?: RunModalPageWindow;
  readonly listConfig = purchaseOrderListConfig;
  readonly headerConfig = purchaseOrderHeaderConfig;
  readonly lineConfig = purchaseOrderLineConfig;
  readonly pageId = purchaseOrderListConfig.pageId!;

  handleBusinessCommand(event: PageCommandEvent): void {
    // Only add code here for real business processes.
  }
}
