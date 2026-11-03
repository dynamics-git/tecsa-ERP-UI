import {
  DataSourceConfig,
  HeaderConfig,
  ListPageConfig,
  listColumns,
} from '../../../platform/public-api';
import { paymentMethodsFactBoxConfig } from './payment-methods.factbox.config';

// Header form.
export const paymentMethodsHeaderConfig: HeaderConfig = {
  dialogTitle: 'Payment Methods',
  toolbarButtons: [],
  sections: [
    {
      id: 'general',
      title: 'General',
      fields: [
        {
          key: 'code',
          label: 'Code',
          type: 'code',
          required: true,
          validation: {
            maxLength: 10,
          },
        },
        {
          key: 'description',
          label: 'Description',
          type: 'text',
          required: true,
          validation: {
            maxLength: 100,
          },
        },
        {
          key: 'balancingAccountType',
          label: 'Balancing Account Type',
          type: 'dropdown',
          defaultValue: 'none',
          options: [
            {
              label: 'None',
              value: 'none',
            },
            {
              label: 'Gl account',
              value: 'gl_account',
            },
            {
              label: 'Bank account',
              value: 'bank_account',
            },
          ],
        },
        {
          key: 'isActive',
          label: 'Is Active',
          type: 'boolean',
          defaultValue: true,
        },
      ],
    },
    {
      id: 'posting',
      title: 'Posting & Defaults',
      fields: [
        {
          key: 'balancingGlAccountId',
          label: 'Balancing G/L Account',
          type: 'lookup',
          valueType: 'guid',
          defaultValue: null,
          hiddenWhen: {
            field: 'balancingAccountType',
            values: ['gl_account'],
            negate: true,
          },
          lookup: {
            endpoint: '/glAccounts',
            valueField: 'systemId',
            displayField: 'number',
            searchFields: ['number', 'name'],
          },
          displayFormat: '[number] — [name]',
        },
        {
          key: 'balancingBankAccountId',
          label: 'Balancing Bank Account',
          type: 'lookup',
          valueType: 'guid',
          defaultValue: null,
          hiddenWhen: {
            field: 'balancingAccountType',
            values: ['bank_account'],
            negate: true,
          },
          lookup: {
            endpoint: '/bankAccounts',
            valueField: 'systemId',
            displayField: 'number',
            searchFields: ['number', 'name'],
          },
          displayFormat: '[number] — [name]',
        },
      ],
    },
  ],
};

// List page.
export const paymentMethodsListConfig: ListPageConfig & {
  dataSource: DataSourceConfig;
} = {
  pageId: 'payment-methods',
  pageType: 'card',
  title: 'Payment Methods',
  dataSource: {
    endpoint: '/paymentMethods',
    keyField: 'systemId',
    defaultSort: 'code asc',
  },
  identity: {
    primaryField: 'code',
    secondaryField: 'description',
  },
  module: 'Finance',
  menu: {
    module: 'Finance',
    group: 'Currencies & Payments',
    icon: 'ts-icon ts-icon-payment-methods',
    moduleIcon: 'ts-icon ts-icon-finance-module',
    route: '/payment-methods',
  },
  dataSurface: {
    columns: listColumns(paymentMethodsHeaderConfig, [
      {
        field: 'code',
      },
      {
        field: 'description',
      },
      {
        field: 'balancingAccountType',
        width: '140px',
      },
      {
        field: 'balancingGlAccountId',
        width: '140px',
      },
      {
        field: 'balancingBankAccountId',
        width: '140px',
      },
      {
        field: 'isActive',
        width: '140px',
      },
      {
        field: 'systemModifiedAt',
      },
    ]),
  },
  factBox: paymentMethodsFactBoxConfig,
};
