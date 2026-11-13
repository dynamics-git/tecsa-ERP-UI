import {
  DataSourceConfig,
  HeaderConfig,
  ListPageConfig,
  listColumns,
} from '../../../platform/public-api';
import { currenciesFactBoxConfig } from './currencies.factbox.config';

// Header form.
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
      runModalRecord: {
        source: 'header',
        fields: {
          code: 'code',
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
            maxLength: 30,
          },
        },
        {
          key: 'isoCode',
          label: 'Iso Code',
          type: 'code',
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
          type: 'decimal',
          defaultValue: '0.01',
          validation: {
            precision: 38,
            scale: 20,
            min: '0.000001',
          },
        },
        {
          key: 'unitAmountRoundingPrecision',
          label: 'Unit Amount Rounding Precision',
          type: 'decimal',
          defaultValue: '0.00001',
          validation: {
            precision: 38,
            scale: 20,
            min: '0.000001',
          },
        },
        {
          key: 'invoiceRoundingPrecision',
          label: 'Invoice Rounding Precision',
          type: 'decimal',
          defaultValue: '0.01',
          validation: {
            precision: 38,
            scale: 20,
            min: '0.000001',
          },
        },
        {
          key: 'applnRoundingPrecision',
          label: 'Application Rounding Precision',
          type: 'decimal',
          defaultValue: '0.01',
          validation: {
            precision: 38,
            scale: 20,
            min: '0.000001',
          },
        },
      ],
    },
    {
      id: 'posting',
      title: 'Posting & Defaults',
      fields: [
        {
          key: 'realizedGainsAcc',
          label: 'Realized Gain Account',
          type: 'lookup',
          valueType: 'code',
          defaultValue: '',
          lookup: {
            endpoint: '/glAccounts',
            valueField: 'number',
            displayField: 'number',
            searchFields: ['number', 'name'],
            recordRead: 'collection',
          },
          displayFormat: '[number] — [name]',
          validation: {
            maxLength: 20,
          },
        },
        {
          key: 'realizedLossesAcc',
          label: 'Realized Loss Account',
          type: 'lookup',
          valueType: 'code',
          defaultValue: '',
          lookup: {
            endpoint: '/glAccounts',
            valueField: 'number',
            displayField: 'number',
            searchFields: ['number', 'name'],
            recordRead: 'collection',
          },
          displayFormat: '[number] — [name]',
          validation: {
            maxLength: 20,
          },
        },
        {
          key: 'unrealizedGainsAcc',
          label: 'Unrealized Gain Account',
          type: 'lookup',
          valueType: 'code',
          defaultValue: '',
          lookup: {
            endpoint: '/glAccounts',
            valueField: 'number',
            displayField: 'number',
            searchFields: ['number', 'name'],
            recordRead: 'collection',
          },
          displayFormat: '[number] — [name]',
          validation: {
            maxLength: 20,
          },
        },
        {
          key: 'unrealizedLossesAcc',
          label: 'Unrealized Loss Account',
          type: 'lookup',
          valueType: 'code',
          defaultValue: '',
          lookup: {
            endpoint: '/glAccounts',
            valueField: 'number',
            displayField: 'number',
            searchFields: ['number', 'name'],
            recordRead: 'collection',
          },
          displayFormat: '[number] — [name]',
          validation: {
            maxLength: 20,
          },
        },
      ],
    },
  ],
};

// List page.
export const currenciesListConfig: ListPageConfig & {
  dataSource: DataSourceConfig;
} = {
  pageId: 'currencies',
  pageType: 'card',
  title: 'Currencies',
  dataSource: {
    endpoint: '/currencies',
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
    icon: 'ts-icon ts-icon-currencies',
    moduleIcon: 'ts-icon ts-icon-finance-module',
    route: '/currencies',
  },
  dataSurface: {
    columns: listColumns(currenciesHeaderConfig, [
      {
        field: 'code',
      },
      {
        field: 'description',
      },
      {
        field: 'isoCode',
        width: '140px',
      },
      {
        field: 'symbol',
        width: '140px',
      },
      {
        field: 'amountRoundingPrecision',
        width: '140px',
      },
      {
        field: 'unitAmountRoundingPrecision',
        width: '140px',
      },

      {
        field: 'systemModifiedAt',
      },
    ]),
  },
  factBox: currenciesFactBoxConfig,
};
