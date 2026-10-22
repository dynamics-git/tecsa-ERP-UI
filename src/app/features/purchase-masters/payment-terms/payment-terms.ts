import { Component, Input } from '@angular/core';
import { ListPage, RunModalPageWindow } from '../../../platform/public-api';
import { paymentTermsListConfig, paymentTermsHeaderConfig } from './payment-terms.config';
export * from './payment-terms.config';

@Component({
  selector: 'app-payment-terms',
  standalone: true,
  imports: [ListPage],
  templateUrl: './payment-terms.html',
})
export class PaymentTermsPage {
  @Input() runModal?: RunModalPageWindow;
  readonly listConfig = paymentTermsListConfig;
  readonly headerConfig = paymentTermsHeaderConfig;
}
