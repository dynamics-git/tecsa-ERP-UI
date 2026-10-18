import { Component } from '@angular/core';
import { DocumentPage } from '../../../platform/public-api';
import { customerHeaderConfig, customerListConfig } from './customer.config';

@Component({
  selector: 'app-customer-master',
  standalone: true,
  imports: [DocumentPage],
  template: `<app-document-page [pageId]="pageId"
    [listConfig]="listConfig" [headerConfig]="headerConfig"></app-document-page>`,
})
export class CustomerPage {
  readonly pageId = 'customer';
  readonly listConfig = customerListConfig;
  readonly headerConfig = customerHeaderConfig;
}
