import {
  DataSourceConfig,
  HeaderConfig,
  LineConfig,
  ListPageConfig,
} from '../../../platform/public-api';
import { currencyExchangeRatesFactBoxConfig } from './currency-exchange-rates.factbox.config';
const currencyExchangeRatesDataSource: DataSourceConfig = {
  keyField: 'systemId',
  endpoint: '/currencyExchangeRates',
  headerPKProp: 'code',
  lineFKProp: 'currencyCode',
  defaultSort: 'startingDate asc',
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
      id: 'exchangeRateAmount',
      label: 'Foreign Amount',
      type: 'decimal',
      defaultValue: '1',
      validation: {
        precision: 38,
        scale: 20,
        min: '0.000001',
      },
    },
    {
      id: 'relationalExchRateAmount',
      label: 'Local Amount',
      type: 'decimal',
      validation: {
        precision: 38,
        scale: 20,
        min: '0.000001',
      },
    },
  ],
};
