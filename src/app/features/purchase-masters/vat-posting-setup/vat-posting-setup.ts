import { Component, Input } from '@angular/core';
import { ListPage, RunModalPageWindow } from '../../../platform/public-api';
import { vatPostingSetupListConfig, vatPostingSetupHeaderConfig } from './vat-posting-setup.config';
export * from './vat-posting-setup.config';

@Component({
  selector: 'app-vat-posting-setup',
  standalone: true,
  imports: [ListPage],
  templateUrl: './vat-posting-setup.html',
})
export class VatPostingSetupPage {
  @Input() runModal?: RunModalPageWindow;
  readonly listConfig = vatPostingSetupListConfig;
  readonly headerConfig = vatPostingSetupHeaderConfig;
}
