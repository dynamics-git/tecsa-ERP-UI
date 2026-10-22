import { Component, Input } from '@angular/core';
import { ListPage, RunModalPageWindow } from '../../../platform/public-api';
import { paymentMethodsListConfig, paymentMethodsHeaderConfig } from './payment-methods.config';
export * from './payment-methods.config';

@Component({
  selector: 'app-payment-methods',
  standalone: true,
  imports: [ListPage],
  templateUrl: './payment-methods.html',
})
export class PaymentMethodsPage {
  @Input() runModal?: RunModalPageWindow;
  readonly listConfig = paymentMethodsListConfig;
  readonly headerConfig = paymentMethodsHeaderConfig;
}
