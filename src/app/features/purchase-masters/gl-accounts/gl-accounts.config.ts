import { HeaderConfig, DataSourceConfig, ListPageConfig, listColumns } from '../../../platform/public-api';
export const glAccountsHeaderConfig: HeaderConfig = {
  dialogTitle: 'G/L Accounts',
  toolbarButtons: [
    {
      permissionKey: 'gl-accounts-lines',
      label: 'Dimensions',
      actionKey: 'cmd:open-gl-account-default-dimensions',
      icon: 'ts-icon ts-icon-gl-accounts',
      group: 'Related',
      order: 40,
      runModalPageId: 'gl-account-default-dimensions',
      runModalTarget: 'entry',
    },
  ],
  sections: [
    {
      id: 'general',
      title: 'General',
      fields: [
        {
          key: 'number',
          label: 'Number',
          type: 'text',
          valueType: 'code',
          required: true,
          validation: {
            maxLength: 20,
          },
        },
        {
          key: 'name',
          label: 'Name',
          type: 'text',
          required: true,
          validation: {
            maxLength: 100,
          },
        },
        {
          key: 'searchName',
          label: 'Search Name',
          type: 'text',
          validation: {
            maxLength: 100,
          },
        },
        {
          key: 'accountType',
          label: 'Account Type',
          type: 'select',
          valueType: 'text',
          defaultValue: 'posting',
          options: [
            {
              value: 'posting',
              label: 'Posting',
            },
            {
              value: 'heading',
              label: 'Heading',
            },
            {
              value: 'total',
              label: 'Total',
            },
            {
              value: 'begin_total',
              label: 'Begin total',
            },
            {
              value: 'end_total',
              label: 'End total',
            },
          ],
        },
        {
          key: 'incomeBalance',
          label: 'Income Balance',
          type: 'select',
          valueType: 'text',
          options: [
            {
              value: 'income_statement',
              label: 'Income statement',
            },
            {
              value: 'balance_sheet',
              label: 'Balance sheet',
            },
          ],
        },
        {
          key: 'accountCategory',
          label: 'Account Category',
          type: 'select',
          valueType: 'text',
          options: [
            {
              value: 'assets',
              label: 'Assets',
            },
            {
              value: 'liabilities',
              label: 'Liabilities',
            },
            {
              value: 'equity',
              label: 'Equity',
            },
            {
              value: 'income',
              label: 'Income',
            },
            {
              value: 'cost_of_goods_sold',
              label: 'Cost of goods sold',
            },
            {
              value: 'expense',
              label: 'Expense',
            },
          ],
        },
        {
          key: 'totaling',
          label: 'Totaling',
          type: 'text',
          validation: {
            maxLength: 250,
          },
        },
        {
          key: 'directPosting',
          label: 'Direct Posting',
          type: 'boolean',
          defaultValue: true,
        },
        {
          key: 'blocked',
          label: 'Blocked',
          type: 'boolean',
          defaultValue: false,
        },
      ],
    },
  ],
};

export const glAccountsListConfig: ListPageConfig & { dataSource: DataSourceConfig } = {
  pageId: 'gl-accounts',
  pageType: 'card',
  autoSave: true,
  title: 'G/L Accounts',
  module: 'Finance',
  identity: {
    primaryField: 'number',
    secondaryField: 'name',
  },
  menu: {
    module: 'Finance',
    group: 'General Ledger',
    icon: 'ts-icon ts-icon-gl-accounts',
    route: '/gl-accounts',
    moduleIcon: 'ts-icon ts-icon-finance-module',
  },
  dataSource: {
    endpoint: '/glAccounts',
    keyField: 'systemId',
    defaultSort: 'number asc',
  },
  dataSurface: {
    idField: 'systemId',
    columns: listColumns(glAccountsHeaderConfig, [
      'number',
      'name',
      { field: 'accountType', width: '140px' },
      { field: 'incomeBalance', width: '140px' },
      { field: 'accountCategory', width: '140px' },
      { field: 'directPosting', width: '140px' },
      { field: 'blocked', width: '140px' },
      'systemModifiedAt',
    ]),
  },
  factBox: { enabled: true },
};
