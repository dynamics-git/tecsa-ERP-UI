import { Component } from '@angular/core';
import { DocumentPage } from '../../../platform/public-api';
import { purchaseRequisitionListConfig, purchaseRequisitionHeaderConfig, purchaseRequisitionLineConfig } from './purchase-requisition.config';

@Component({ selector: 'app-purchase-requisition', standalone: true, imports: [DocumentPage], templateUrl: './purchase-requisition.html' })
export class PurchaseRequisitionPage {
  readonly listConfig = purchaseRequisitionListConfig;
  readonly headerConfig = purchaseRequisitionHeaderConfig;
  readonly lineConfig = purchaseRequisitionLineConfig;
}
