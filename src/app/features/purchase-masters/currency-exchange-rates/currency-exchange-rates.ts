import { Component, Input } from '@angular/core';
import { ListPage, RunModalPageWindow } from '../../../platform/public-api';
import {
  currencyExchangeRatesListConfig,
  currencyExchangeRatesHeaderConfig,
  currencyExchangeRatesLineConfig,
} from './currency-exchange-rates.config';
export * from './currency-exchange-rates.config';

@Component({
  selector: 'app-currency-exchange-rates',
  standalone: true,
  imports: [ListPage],
  templateUrl: './currency-exchange-rates.html',
})
export class CurrencyExchangeRatesPage {
  @Input() runModal?: RunModalPageWindow;
  readonly listConfig = currencyExchangeRatesListConfig;
  readonly headerConfig = currencyExchangeRatesHeaderConfig;
  readonly lineConfig = currencyExchangeRatesLineConfig;
}
