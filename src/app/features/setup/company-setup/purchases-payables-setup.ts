import { Component } from '@angular/core';
import { CompanySetupCard } from './company-setup-card';
import { purchasesPayablesSetup } from './company-setup.config';

@Component({
  selector: 'app-purchases-payables-setup',
  standalone: true,
  imports: [CompanySetupCard],
  template: `<app-company-setup-card [definition]="definition"></app-company-setup-card>`,
})
export class PurchasesPayablesSetupPage {
  readonly definition = purchasesPayablesSetup;
}
