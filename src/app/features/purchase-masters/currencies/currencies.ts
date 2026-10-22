import { Component, Input } from '@angular/core';
import { ListPage, RunModalPageWindow } from '../../../platform/public-api';
import { currenciesListConfig, currenciesHeaderConfig } from './currencies.config';
export * from './currencies.config';

@Component({
  selector: 'app-currencies',
  standalone: true,
  imports: [ListPage],
  templateUrl: './currencies.html',
})
export class CurrenciesPage {
  @Input() runModal?: RunModalPageWindow;
  readonly listConfig = currenciesListConfig;
  readonly headerConfig = currenciesHeaderConfig;
}
