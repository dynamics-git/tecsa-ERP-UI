import { Component, Input } from '@angular/core';
import { ListPage, RunModalPageWindow } from '../../../platform/public-api';
import { glAccountsListConfig, glAccountsHeaderConfig } from './gl-accounts.config';
export * from './gl-accounts.config';

@Component({
  selector: 'app-gl-accounts',
  standalone: true,
  imports: [ListPage],
  templateUrl: './gl-accounts.html',
})
export class GlAccountsPage {
  @Input() runModal?: RunModalPageWindow;
  readonly listConfig = glAccountsListConfig;
  readonly headerConfig = glAccountsHeaderConfig;
}
