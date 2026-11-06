import { Component, Input } from '@angular/core';
import { ListPage, RunModalPageWindow } from '../../../platform/public-api';
import {
  purchaseRequisitionListConfig,
  purchaseRequisitionHeaderConfig,
  purchaseRequisitionLineConfig,
} from './purchase-requisition.config';
export * from './purchase-requisition.config';

@Component({
  selector: 'app-purchase-requisition',
  standalone: true,
  imports: [ListPage],
  templateUrl: './purchase-requisition.html',
})
export class PurchaseRequisitionPage {
  private window?: RunModalPageWindow;
  @Input() set runModal(value: RunModalPageWindow | undefined) {
    this.window = value;
    this.listConfig = (value?.module?.['purchaseRequisitionListConfig'] ?? purchaseRequisitionListConfig) as typeof purchaseRequisitionListConfig;
    this.headerConfig = (value?.module?.['purchaseRequisitionHeaderConfig'] ?? purchaseRequisitionHeaderConfig) as typeof purchaseRequisitionHeaderConfig;
    this.lineConfig = (value?.module?.['purchaseRequisitionLineConfig'] ?? purchaseRequisitionLineConfig) as typeof purchaseRequisitionLineConfig;
  }
  get runModal(): RunModalPageWindow | undefined { return this.window; }
  listConfig = purchaseRequisitionListConfig;
  headerConfig = purchaseRequisitionHeaderConfig;
  lineConfig = purchaseRequisitionLineConfig;
}
