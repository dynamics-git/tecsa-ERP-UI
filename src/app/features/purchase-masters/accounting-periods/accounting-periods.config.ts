import { HeaderConfig, DataSourceConfig, ListPageConfig, listColumns } from '../../../platform/public-api';
export const accountingPeriodsHeaderConfig: HeaderConfig = {
  dialogTitle: 'Accounting Periods',
  toolbarButtons: [],
  sections: [
    {
      id: 'general',
      title: 'General',
      fields: [
        {
          key: 'startingDate',
          label: 'Starting Date',
          type: 'date',
          valueType: 'date',
          required: true,
        },
        {
          key: 'name',
          label: 'Name',
          type: 'text',
          required: true,
          validation: {
            maxLength: 50,
          },
        },
        {
          key: 'newFiscalYear',
          label: 'New Fiscal Year',
          type: 'boolean',
          defaultValue: false,
        },
      ],
    },
  ],
};

export const accountingPeriodsListConfig: ListPageConfig & { dataSource: DataSourceConfig } = {
  pageId: 'accounting-periods',
  pageType: 'card',
  autoSave: true,
  title: 'Accounting Periods',
  module: 'Finance',
  identity: {
    primaryField: 'startingDate',
    secondaryField: 'name',
  },
  menu: {
    module: 'Finance',
    group: 'General Ledger',
    icon: 'ts-icon ts-icon-accounting-periods',
    route: '/accounting-periods',
    moduleIcon: 'ts-icon ts-icon-finance-module',
  },
  dataSource: {
    endpoint: '/accountingPeriods',
    keyField: 'systemId',
    defaultSort: 'startingDate asc',
  },
  dataSurface: {
    idField: 'systemId',
    columns: listColumns(accountingPeriodsHeaderConfig, [
      'startingDate',
      'name',
      { field: 'newFiscalYear', width: '140px' },
      { field: 'closed', label: 'Closed', type: 'boolean', width: '140px' },
      { field: 'dateLocked', label: 'Date Locked', type: 'boolean', width: '140px' },
      'systemModifiedAt',
    ]),
  },
  factBox: { enabled: true },
};
