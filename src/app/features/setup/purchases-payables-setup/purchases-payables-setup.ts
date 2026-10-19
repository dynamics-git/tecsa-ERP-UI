import { Component } from '@angular/core';
import { DocumentPage } from '../../../platform/public-api';
import { purchasesPayablesSetupListConfig, purchasesPayablesSetupHeaderConfig } from './purchases-payables-setup.config';

@Component({ selector: 'app-purchases-payables-setup', standalone: true, imports: [DocumentPage], templateUrl: './purchases-payables-setup.html' })
export class PurchasesPayablesSetupPage {
  readonly listConfig = purchasesPayablesSetupListConfig;
  readonly headerConfig = purchasesPayablesSetupHeaderConfig;
}
