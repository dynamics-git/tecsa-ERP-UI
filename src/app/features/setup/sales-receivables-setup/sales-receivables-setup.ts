import { Component, Input } from '@angular/core';
import { ListPage, RunModalPageWindow } from '../../../platform/public-api';
import {
  salesReceivablesSetupListConfig,
  salesReceivablesSetupHeaderConfig,
} from './sales-receivables-setup.config';
export * from './sales-receivables-setup.config';

@Component({
  selector: 'app-sales-receivables-setup',
  standalone: true,
  imports: [ListPage],
  templateUrl: './sales-receivables-setup.html',
})
export class SalesReceivablesSetupPage {
  @Input() runModal?: RunModalPageWindow;
  readonly listConfig = salesReceivablesSetupListConfig;
  readonly headerConfig = salesReceivablesSetupHeaderConfig;
}
