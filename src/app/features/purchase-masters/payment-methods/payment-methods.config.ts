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
          readonlyAfterCreate: true,
        },
        {
          key: 'description',
          label: 'Description',
          type: 'text',
          validation: {
            maxLength: 100,
          },
        },
        {
          key: 'balAccountType',
          label: 'Balancing Account Type',
          type: 'dropdown',
          defaultValue: 0,
          options: [
            {
              label: 'G/L Account',
              value: 0,
            },
            {
              label: 'Bank Account',
              value: 1,
            },
          ],
          valueType: 'integer',
        },
      ],
    },
    {
      id: 'posting',
      title: 'Posting & Defaults',
      fields: [
        {
          key: 'balAccountNo',
          label: 'Balancing Account No.',
          type: 'code',
          validation: {
            maxLength: 20,
          },
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
    headerPKProp: 'code',
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
        field: 'balAccountType',
        width: '140px',
      },
      {
        field: 'balAccountNo',
        width: '140px',
      },

      {
        field: 'systemModifiedAt',
      },
    ]),
  },
  factBox: paymentMethodsFactBoxConfig,
};
