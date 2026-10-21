import { Component } from '@angular/core';
import { DocumentPage } from '../../../platform/public-api';
import { salesReceivablesSetupHeaderConfig, salesReceivablesSetupListConfig } from './sales-receivables-setup.config';
export { salesReceivablesSetupHeaderConfig, salesReceivablesSetupListConfig } from './sales-receivables-setup.config';
@Component({
  selector: 'app-sales-receivables-setup',
  standalone: true,
  imports: [DocumentPage],
  templateUrl: './sales-receivables-setup.html',
})
export class SalesReceivablesSetupPage {
  readonly listConfig = salesReceivablesSetupListConfig;
  readonly headerConfig = salesReceivablesSetupHeaderConfig;
}
