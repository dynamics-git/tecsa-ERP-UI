import { Component } from '@angular/core';
import { DocumentPage } from '../../../platform/public-api';
import { salesReceivablesSetupListConfig, salesReceivablesSetupHeaderConfig } from './sales-receivables-setup.config';

@Component({ selector: 'app-sales-receivables-setup', standalone: true, imports: [DocumentPage], templateUrl: './sales-receivables-setup.html' })
export class SalesReceivablesSetupPage {
  readonly listConfig = salesReceivablesSetupListConfig;
  readonly headerConfig = salesReceivablesSetupHeaderConfig;
}
