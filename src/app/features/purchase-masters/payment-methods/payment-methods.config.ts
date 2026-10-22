import { HeaderConfig, DataSourceConfig, ListPageConfig, listColumns } from '../../../platform/public-api';
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
          type: 'text',
          valueType: 'code',
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
          type: 'select',
          valueType: 'text',
          defaultValue: 'none',
          options: [
            {
              value: 'none',
              label: 'None',
            },
            {
              value: 'gl_account',
              label: 'Gl account',
            },
            {
              value: 'bank_account',
              label: 'Bank account',
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
          lookup: {
            endpoint: '/glAccounts',
            valueField: 'systemId',
            displayField: 'number',
            searchFields: ['number', 'name'],
          },
          displayFormat: '[number] — [name]',
          hiddenWhen: {
            field: 'balancingAccountType',
            values: ['gl_account'],
            negate: true,
          },
        },
        {
          key: 'balancingBankAccountId',
          label: 'Balancing Bank Account',
          type: 'lookup',
          valueType: 'guid',
          defaultValue: null,
          lookup: {
            endpoint: '/bankAccounts',
            valueField: 'systemId',
            displayField: 'number',
            searchFields: ['number', 'name'],
          },
          displayFormat: '[number] — [name]',
          hiddenWhen: {
            field: 'balancingAccountType',
            values: ['bank_account'],
            negate: true,
          },
        },
      ],
    },
  ],
};

export const paymentMethodsListConfig: ListPageConfig & { dataSource: DataSourceConfig } = {
  pageId: 'payment-methods',
  pageType: 'card',
  autoSave: true,
  title: 'Payment Methods',
  module: 'Finance',
  identity: {
    primaryField: 'code',
    secondaryField: 'description',
  },
  menu: {
    module: 'Finance',
    group: 'Currencies & Payments',
    icon: 'ts-icon ts-icon-payment-methods',
    route: '/payment-methods',
    moduleIcon: 'ts-icon ts-icon-finance-module',
  },
  dataSource: {
    endpoint: '/paymentMethods',
    keyField: 'systemId',
    defaultSort: 'code asc',
  },
  dataSurface: {
    idField: 'systemId',
    columns: listColumns(paymentMethodsHeaderConfig, [
      'code',
      'description',
      { field: 'balancingAccountType', width: '140px' },
      { field: 'balancingGlAccountId', width: '140px' },
      { field: 'balancingBankAccountId', width: '140px' },
      { field: 'isActive', width: '140px' },
      'systemModifiedAt',
    ]),
  },
  factBox: { enabled: false },
};
