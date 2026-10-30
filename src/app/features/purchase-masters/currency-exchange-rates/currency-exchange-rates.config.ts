import {
  DataSourceConfig,
  HeaderConfig,
  LineConfig,
  ListPageConfig,
} from '../../../platform/public-api';
import { currencyExchangeRatesFactBoxConfig } from './currency-exchange-rates.factbox.config';
const currencyExchangeRatesDataSource: DataSourceConfig = {
  endpoint: '/currencies',
  keyField: 'systemId',
  navigation: {
    parentEndpoint: '/currencies',
    parentIdFields: ['systemId'],
    childCollection: 'exchangeRates',
  },
  pageSize: 20,
};

// Header form.
export const currencyExchangeRatesHeaderConfig: HeaderConfig = {
  dialogTitle: 'Currency Exchange Rates',
  toolbarButtons: [],
  sections: [],
};

// List page.
export const currencyExchangeRatesListConfig: ListPageConfig & {
  dataSource: DataSourceConfig;
} = {
  pageId: 'currency-exchange-rates',
  pageType: 'worksheet',
  title: 'Currency Exchange Rates',
  dataSource: currencyExchangeRatesDataSource,
  identity: {
    primaryField: 'code',
    secondaryField: 'description',
  },
  module: 'Finance',
  permissionPageId: 'currencies-lines',
  tools: {
    search: false,
    filter: false,
    columns: false,
    export: false,
  },
  factBox: currencyExchangeRatesFactBoxConfig,
};

// Document lines.
export const currencyExchangeRatesLineConfig: LineConfig = {
  placement: {
    mode: 'end',
  },
  dataSource: currencyExchangeRatesDataSource,
  permissionPageId: 'currencies-lines',
  toolbarButtons: [],
  columns: [
    {
      id: 'startingDate',
      label: 'Starting Date',
      type: 'date',
      required: true,
      readonlyAfterCreate: true,
    },
    {
      id: 'foreignAmount',
      label: 'Foreign Amount',
      type: 'decimal',
      defaultValue: '1',
      validation: {
        precision: 20,
        scale: 10,
        min: '0.000001',
      },
    },
    {
      id: 'localAmount',
      label: 'Local Amount',
      type: 'decimal',
      required: true,
      validation: {
        precision: 20,
        scale: 10,
        min: '0.000001',
      },
    },
    {
      id: 'isActive',
      label: 'Is Active',
      type: 'boolean',
      defaultValue: true,
    },
  ],
};
