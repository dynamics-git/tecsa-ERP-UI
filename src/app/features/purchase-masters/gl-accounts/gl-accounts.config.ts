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
      runModalRecord: {
        source: 'header',
        fields: {
          number: 'number',
        },
      },
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
          readonlyAfterCreate: true,
        },
        {
          key: 'name',
          label: 'Name',
          type: 'text',
          validation: {
            maxLength: 100,
          },
        },
        {
          key: 'searchName',
          label: 'Search Name',
          type: 'code',
          validation: {
            maxLength: 100,
          },
        },
        {
          key: 'accountType',
          label: 'Account Type',
          type: 'dropdown',
          defaultValue: 0,
          options: [
            {
              label: 'Posting',
              value: 0,
            },
            {
              label: 'Heading',
              value: 1,
            },
            {
              label: 'Total',
              value: 2,
            },
            {
              label: 'Begin-Total',
              value: 3,
            },
            {
              label: 'End-Total',
              value: 4,
            },
          ],
          valueType: 'integer',
        },
        {
          key: 'incomeBalance',
          label: 'Income Balance',
          type: 'dropdown',
          options: [
            {
              label: 'Income Statement',
              value: 0,
            },
            {
              label: 'Balance Sheet',
              value: 1,
            },
          ],
          valueType: 'integer',
          defaultValue: 0,
        },
        {
          key: 'accountCategory',
          label: 'Account Category',
          type: 'dropdown',
          options: [
            {
              label: ' ',
              value: 0,
            },
            {
              label: 'Assets',
              value: 1,
            },
            {
              label: 'Liabilities',
              value: 2,
            },
            {
              label: 'Equity',
              value: 3,
            },
            {
              label: 'Income',
              value: 4,
            },
            {
              label: 'Cost of Goods Sold',
              value: 5,
            },
            {
              label: 'Expense',
              value: 6,
            },
          ],
          valueType: 'integer',
          defaultValue: 0,
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
  dataSource: {
    endpoint: '/glAccounts',
    keyField: 'systemId',
    defaultSort: 'number asc',
    headerPKProp: 'number',
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
