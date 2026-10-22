import { Component, Input } from '@angular/core';
import { ListPage, RunModalPageWindow } from '../../../platform/public-api';
import { accountingPeriodsListConfig, accountingPeriodsHeaderConfig } from './accounting-periods.config';
export * from './accounting-periods.config';

@Component({
  selector: 'app-accounting-periods',
  standalone: true,
  imports: [ListPage],
  templateUrl: './accounting-periods.html',
})
export class AccountingPeriodsPage {
  @Input() runModal?: RunModalPageWindow;
  readonly listConfig = accountingPeriodsListConfig;
  readonly headerConfig = accountingPeriodsHeaderConfig;
}
