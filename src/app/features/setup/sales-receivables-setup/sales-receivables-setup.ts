import { Component } from '@angular/core';
import { DocumentPage, DataSourceConfig, ListPageConfig } from '../../../platform/public-api';
import { salesReceivablesSetupHeaderConfig } from './sales-receivables-setup.config';
export { salesReceivablesSetupHeaderConfig } from './sales-receivables-setup.config';
export const salesReceivablesSetupListConfig: ListPageConfig & { dataSource: DataSourceConfig } = {
  pageId: 'sales-receivables-setup',
  pageType: 'setup',
  title: 'Sales & Receivables Setup',
  module: 'Sales',
  menu: { module: 'Sales', group: 'Setup', icon: 'ts-icon ts-icon-settings', route: '/sales-receivables-setup' },
  tools: { filter: false, advancedFilter: false, export: false, columns: false },
  dataSource: {
    endpoint: '/salesReceivablesSetup',
    singleton: true,
    keyField: 'systemId',
    supportsCreate: false,
    supportsUpdate: true,
    supportsDelete: false,
  },
};

@Component({
  selector: 'app-sales-receivables-setup',
  standalone: true,
  imports: [DocumentPage],
  templateUrl: './sales-receivables-setup.html',
})
export class SalesReceivablesSetupPage {
  readonly listConfig = salesReceivablesSetupListConfig;
  readonly headerConfig = salesReceivablesSetupHeaderConfig;
}
