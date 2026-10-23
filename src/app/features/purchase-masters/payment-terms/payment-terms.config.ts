import { HeaderConfig, DataSourceConfig, ListPageConfig, listColumns } from '../../../platform/public-api';
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
          type: 'number',
          valueType: 'decimal',
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

export const paymentTermsListConfig: ListPageConfig & { dataSource: DataSourceConfig } = {
  pageId: 'payment-terms',
  pageType: 'card',
  autoSave: true,
  title: 'Payment Terms',
  module: 'Finance',
  identity: {
    primaryField: 'code',
    secondaryField: 'description',
  },
  menu: {
    module: 'Finance',
    group: 'Currencies & Payments',
    icon: 'ts-icon ts-icon-payment-terms',
    route: '/payment-terms',
    moduleIcon: 'ts-icon ts-icon-finance-module',
  },
  dataSource: {
    endpoint: '/paymentTerms',
    keyField: 'systemId',
    defaultSort: 'code asc',
  },
  dataSurface: {
    idField: 'systemId',
    columns: listColumns(paymentTermsHeaderConfig, [
      'code',
      'description',
      { field: 'dueDateCalculation', width: '140px' },
      { field: 'discountDateCalculation', width: '140px' },
      { field: 'discountPercent', width: '140px' },
      { field: 'isActive', width: '140px' },
      'systemModifiedAt',
    ]),
  },
  factBox: { enabled: true },
};
