import { Component, Input } from '@angular/core';
import { ListPage, RunModalPageWindow } from '../../../platform/public-api';
import { generalLedgerSetupListConfig, generalLedgerSetupHeaderConfig } from './general-ledger-setup.config';
export * from './general-ledger-setup.config';

@Component({
  selector: 'app-general-ledger-setup',
  standalone: true,
  imports: [ListPage],
  templateUrl: './general-ledger-setup.html',
})
export class GeneralLedgerSetupPage {
  @Input() runModal?: RunModalPageWindow;
  readonly listConfig = generalLedgerSetupListConfig;
  readonly headerConfig = generalLedgerSetupHeaderConfig;
}
