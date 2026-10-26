import { Component, Input, inject } from '@angular/core';
import { ConfirmationService } from '../../../shared/ui/confirmation.service';
import { ListPage, RunModalPageWindow, DocumentPageCommandEvent } from '../../../platform/public-api';
import { purchaseOrderListConfig, purchaseOrderHeaderConfig, purchaseOrderLineConfig } from './purchase-order-erp.config';
export * from './purchase-order-erp.config';

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
  private readonly confirmation = inject(ConfirmationService);

  handleBusinessCommand(event: DocumentPageCommandEvent): void {
    // Configured PO processing goes through shared declarative REST commands.
    // Unconfigured future commands must never appear to have succeeded.
    void this.confirmation.message(
      `The action ${event.actionKey} is not available for Purchase Orders yet.`,
    );
  }
}
