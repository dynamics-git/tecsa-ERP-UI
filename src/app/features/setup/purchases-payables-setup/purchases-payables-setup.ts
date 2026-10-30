import { Component, Input } from '@angular/core';
import { ListPage, RunModalPageWindow } from '../../../platform/public-api';
import {
  purchasesPayablesSetupListConfig,
  purchasesPayablesSetupHeaderConfig,
} from './purchases-payables-setup.config';
export * from './purchases-payables-setup.config';

@Component({
  selector: 'app-purchases-payables-setup',
  standalone: true,
  imports: [ListPage],
  templateUrl: './purchases-payables-setup.html',
})
export class PurchasesPayablesSetupPage {
  @Input() runModal?: RunModalPageWindow;
  readonly listConfig = purchasesPayablesSetupListConfig;
  readonly headerConfig = purchasesPayablesSetupHeaderConfig;
}
