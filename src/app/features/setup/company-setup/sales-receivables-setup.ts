import { Component } from '@angular/core';
import { CompanySetupCard } from './company-setup-card';
import { salesReceivablesSetup } from './company-setup.config';

@Component({
  selector: 'app-sales-receivables-setup',
  standalone: true,
  imports: [CompanySetupCard],
  template: `<app-company-setup-card [definition]="definition"></app-company-setup-card>`,
})
export class SalesReceivablesSetupPage {
  readonly definition = salesReceivablesSetup;
}
