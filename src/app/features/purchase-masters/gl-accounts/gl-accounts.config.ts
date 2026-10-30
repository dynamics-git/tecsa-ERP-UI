import {
  DataSourceConfig,
  HeaderConfig,
  ListPageConfig,
  listColumns,
} from '../../../platform/public-api';
import { glAccountsFactBoxConfig } from './gl-accounts.factbox.config';

// Header form.
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
          type: 'code',
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
          type: 'dropdown',
          defaultValue: 'posting',
          options: [
            {
              label: 'Posting',
              value: 'posting',
            },
            {
              label: 'Heading',
              value: 'heading',
            },
            {
              label: 'Total',
              value: 'total',
            },
            {
              label: 'Begin total',
              value: 'begin_total',
            },
            {
              label: 'End total',
              value: 'end_total',
            },
          ],
        },
        {
          key: 'incomeBalance',
          label: 'Income Balance',
          type: 'dropdown',
          options: [
            {
              label: 'Income statement',
              value: 'income_statement',
            },
            {
              label: 'Balance sheet',
              value: 'balance_sheet',
            },
          ],
        },
        {
          key: 'accountCategory',
          label: 'Account Category',
          type: 'dropdown',
          options: [
            {
              label: 'Assets',
              value: 'assets',
            },
            {
              label: 'Liabilities',
              value: 'liabilities',
            },
            {
              label: 'Equity',
              value: 'equity',
            },
            {
              label: 'Income',
              value: 'income',
            },
            {
              label: 'Cost of goods sold',
              value: 'cost_of_goods_sold',
            },
            {
              label: 'Expense',
              value: 'expense',
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

// List page.
export const glAccountsListConfig: ListPageConfig & {
  dataSource: DataSourceConfig;
} = {
  pageId: 'gl-accounts',
  pageType: 'card',
  title: 'G/L Accounts',
  autoSave: true,
  dataSource: {
    endpoint: '/glAccounts',
    keyField: 'systemId',
    defaultSort: 'number asc',
  },
  identity: {
    primaryField: 'number',
    secondaryField: 'name',
  },
  module: 'Finance',
  menu: {
    module: 'Finance',
    group: 'General Ledger',
    icon: 'ts-icon ts-icon-gl-accounts',
    moduleIcon: 'ts-icon ts-icon-finance-module',
    route: '/gl-accounts',
  },
  dataSurface: {
    columns: listColumns(glAccountsHeaderConfig, [
      {
        field: 'number',
      },
      {
        field: 'name',
      },
      {
        field: 'accountType',
        width: '140px',
      },
      {
        field: 'incomeBalance',
        width: '140px',
      },
      {
        field: 'accountCategory',
        width: '140px',
      },
      {
        field: 'directPosting',
        width: '140px',
      },
      {
        field: 'blocked',
        width: '140px',
      },
      {
        field: 'systemModifiedAt',
      },
    ]),
  },
  factBox: glAccountsFactBoxConfig,
};
