import { DataSourceConfig, HeaderConfig, ListPageConfig, LineConfig } from '../../../platform/public-api';
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

export const currencyExchangeRatesListConfig: ListPageConfig & {
  dataSource: DataSourceConfig;
} = {
  pageId: 'currency-exchange-rates',
  pageType: 'worksheet',
  autoSave: true,
  title: 'Currency Exchange Rates',
  module: 'Finance',
  permissionPageId: 'currencies-lines',
  identity: {
    primaryField: 'code',
    secondaryField: 'description',
  },
  dataSource: currencyExchangeRatesDataSource,
  tools: {
    search: false,
    filter: false,
    columns: false,
    export: false,
  },
  factBox: {
    enabled: false,
  },
};
export const currencyExchangeRatesHeaderConfig: HeaderConfig = {
  dialogTitle: 'Currency Exchange Rates',
  toolbarButtons: [],
  sections: [],
};
export const currencyExchangeRatesLineConfig: LineConfig = {
  permissionPageId: 'currencies-lines',
  placement: {
    mode: 'end',
  },
  lineKeyField: 'systemId',
  dataSource: currencyExchangeRatesDataSource,
  toolbarButtons: [],
  columns: [
    {
      id: 'startingDate',
      label: 'Starting Date',
      valueType: 'date',
      required: true,
      readonlyAfterCreate: true,
    },
    {
      id: 'foreignAmount',
      label: 'Foreign Amount',
      valueType: 'decimal',
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
      valueType: 'decimal',
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
      valueType: 'boolean',
      defaultValue: true,
    },
  ],
};
