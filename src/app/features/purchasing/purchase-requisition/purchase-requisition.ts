import { Component } from '@angular/core';
import { DocumentPage } from '../../../platform/public-api';
import {
  purchaseRequisitionHeaderConfig, purchaseRequisitionLineConfig,
  purchaseRequisitionListConfig,
} from './purchase-requisition.config';

@Component({
  selector: 'app-purchase-requisition',
  standalone: true,
  imports: [DocumentPage],
  template: `<app-document-page [pageId]="pageId"
    [listConfig]="listConfig" [headerConfig]="headerConfig"
    [lineConfig]="lineConfig"></app-document-page>`,
})
export class PurchaseRequisitionPage {
  readonly pageId = 'purchase-requisition';
  readonly listConfig = purchaseRequisitionListConfig;
  readonly headerConfig = purchaseRequisitionHeaderConfig;
  readonly lineConfig = purchaseRequisitionLineConfig;
}
