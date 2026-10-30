import {
  DataSourceConfig,
  HeaderConfig,
  ListPageConfig,
  listColumns,
} from '../../../platform/public-api';
import { paymentTermsFactBoxConfig } from './payment-terms.factbox.config';

// Header form.
export const paymentTermsHeaderConfig: HeaderConfig = {
  dialogTitle: 'Payment Terms',
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
          key: 'dueDateCalculation',
          label: 'Due Date Calculation',
          type: 'text',
          validation: {
            maxLength: 32,
          },
        },
        {
          key: 'discountDateCalculation',
          label: 'Discount Date Calculation',
          type: 'text',
          validation: {
            maxLength: 32,
          },
        },
        {
          key: 'discountPercent',
          label: 'Discount Percent',
          type: 'decimal',
          defaultValue: '0',
          validation: {
            min: 0,
            max: 100,
            precision: 7,
            scale: 4,
          },
        },
        {
          key: 'calculateDiscountOnCreditMemos',
          label: 'Calculate Discount On Credit Memos',
          type: 'boolean',
          defaultValue: false,
        },
        {
          key: 'isActive',
          label: 'Is Active',
          type: 'boolean',
          defaultValue: true,
        },
      ],
    },
  ],
};

// List page.
export const paymentTermsListConfig: ListPageConfig & {
  dataSource: DataSourceConfig;
} = {
  pageId: 'payment-terms',
  pageType: 'card',
  title: 'Payment Terms',
  autoSave: true,
  dataSource: {
    endpoint: '/paymentTerms',
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
    icon: 'ts-icon ts-icon-payment-terms',
    moduleIcon: 'ts-icon ts-icon-finance-module',
    route: '/payment-terms',
  },
  dataSurface: {
    columns: listColumns(paymentTermsHeaderConfig, [
      {
        field: 'code',
      },
      {
        field: 'description',
      },
      {
        field: 'dueDateCalculation',
        width: '140px',
      },
      {
        field: 'discountDateCalculation',
        width: '140px',
      },
      {
        field: 'discountPercent',
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
  factBox: paymentTermsFactBoxConfig,
};
