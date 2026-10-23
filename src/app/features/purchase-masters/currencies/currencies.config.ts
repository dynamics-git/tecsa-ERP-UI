import { HeaderConfig, DataSourceConfig, ListPageConfig, listColumns } from '../../../platform/public-api';
export const currenciesHeaderConfig: HeaderConfig = {
  dialogTitle: 'Currencies',
  toolbarButtons: [
    {
      permissionKey: 'currencies-lines',
      label: 'Exchange Rates',
      actionKey: 'cmd:open-currency-exchange-rates',
      icon: 'ts-icon ts-icon-exchange',
      group: 'Related',
      order: 40,
      runModalPageId: 'currency-exchange-rates',
      runModalTarget: 'entry',
    },
  ],
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
          key: 'isoCode',
          label: 'Iso Code',
          type: 'text',
          valueType: 'code',
          validation: {
            maxLength: 3,
          },
        },
        {
          key: 'symbol',
          label: 'Symbol',
          type: 'text',
          validation: {
            maxLength: 10,
          },
        },
        {
          key: 'amountRoundingPrecision',
          label: 'Amount Rounding Precision',
          type: 'number',
          valueType: 'decimal',
          defaultValue: '0.01',
          validation: {
            precision: 20,
            scale: 10,
            min: '0.000001',
          },
        },
        {
          key: 'unitAmountRoundingPrecision',
          label: 'Unit Amount Rounding Precision',
          type: 'number',
          valueType: 'decimal',
          defaultValue: '0.00001',
          validation: {
            precision: 20,
            scale: 10,
            min: '0.000001',
          },
        },
        {
          key: 'invoiceRoundingPrecision',
          label: 'Invoice Rounding Precision',
          type: 'number',
          valueType: 'decimal',
          defaultValue: '0.01',
          validation: {
            precision: 20,
            scale: 10,
            min: '0.000001',
          },
        },
        {
          key: 'applicationRoundingPrecision',
          label: 'Application Rounding Precision',
          type: 'number',
          valueType: 'decimal',
          defaultValue: '0.01',
          validation: {
            precision: 20,
            scale: 10,
            min: '0.000001',
          },
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
          key: 'realizedGainAccountId',
          label: 'Realized Gain Account',
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
        },
        {
          key: 'realizedLossAccountId',
          label: 'Realized Loss Account',
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
        },
        {
          key: 'unrealizedGainAccountId',
          label: 'Unrealized Gain Account',
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
        },
        {
          key: 'unrealizedLossAccountId',
          label: 'Unrealized Loss Account',
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
        },
      ],
    },
  ],
};

export const currenciesListConfig: ListPageConfig & { dataSource: DataSourceConfig } = {
  pageId: 'currencies',
  pageType: 'card',
  autoSave: true,
  title: 'Currencies',
  module: 'Finance',
  identity: {
    primaryField: 'code',
    secondaryField: 'description',
  },
  menu: {
    module: 'Finance',
    group: 'Currencies & Payments',
    icon: 'ts-icon ts-icon-currencies',
    route: '/currencies',
    moduleIcon: 'ts-icon ts-icon-finance-module',
  },
  dataSource: {
    endpoint: '/currencies',
    keyField: 'systemId',
    defaultSort: 'code asc',
  },
  dataSurface: {
    idField: 'systemId',
    columns: listColumns(currenciesHeaderConfig, [
      'code',
      'description',
      { field: 'isoCode', width: '140px' },
      { field: 'symbol', width: '140px' },
      { field: 'amountRoundingPrecision', width: '140px' },
      { field: 'unitAmountRoundingPrecision', width: '140px' },
      { field: 'isActive', width: '140px' },
      'systemModifiedAt',
    ]),
  },
  factBox: { enabled: true },
};
