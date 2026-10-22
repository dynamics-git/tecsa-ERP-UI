import { Component, Input } from '@angular/core';
import { ListPage, RunModalPageWindow } from '../../../platform/public-api';
import { purchaseRequisitionListConfig, purchaseRequisitionHeaderConfig, purchaseRequisitionLineConfig } from './purchase-requisition.config';
export * from './purchase-requisition.config';

@Component({
  selector: 'app-purchase-requisition',
  standalone: true,
  imports: [ListPage],
  templateUrl: './purchase-requisition.html',
})
export class PurchaseRequisitionPage {
  @Input() runModal?: RunModalPageWindow;
  readonly listConfig = purchaseRequisitionListConfig;
  readonly headerConfig = purchaseRequisitionHeaderConfig;
  readonly lineConfig = purchaseRequisitionLineConfig;
}
