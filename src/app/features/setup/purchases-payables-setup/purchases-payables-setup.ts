import { Component } from '@angular/core';
import { DocumentPage, DataSourceConfig, ListPageConfig } from '../../../platform/public-api';
import { purchasesPayablesSetupHeaderConfig } from './purchases-payables-setup.config';
export { purchasesPayablesSetupHeaderConfig } from './purchases-payables-setup.config';
export const purchasesPayablesSetupListConfig: ListPageConfig & { dataSource: DataSourceConfig } = {
  pageId: 'purchases-payables-setup',
  pageType: 'setup',
  title: 'Purchases & Payables Setup',
  module: 'Purchase',
  menu: {
    module: 'Purchase',
    group: 'Setup',
    icon: 'ts-icon ts-icon-settings',
    route: '/purchases-payables-setup',
  },
  tools: { filter: false, advancedFilter: false, export: false, columns: false },
  dataSource: {
    endpoint: '/purchasesPayablesSetup',
    singleton: true,
    keyField: 'systemId',
    supportsCreate: false,
    supportsUpdate: true,
    supportsDelete: false,
  },
};

@Component({
  selector: 'app-purchases-payables-setup',
  standalone: true,
  imports: [DocumentPage],
  templateUrl: './purchases-payables-setup.html',
})
export class PurchasesPayablesSetupPage {
  readonly listConfig = purchasesPayablesSetupListConfig;
  readonly headerConfig = purchasesPayablesSetupHeaderConfig;
}
