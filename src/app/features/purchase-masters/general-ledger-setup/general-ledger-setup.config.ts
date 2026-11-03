import {
  DataSourceConfig,
  HeaderConfig,
  ListPageConfig,
  listColumns,
} from '../../../platform/public-api';
import { generalLedgerSetupFactBoxConfig } from './general-ledger-setup.factbox.config';

// Header form.
export const generalLedgerSetupHeaderConfig: HeaderConfig = {
  dialogTitle: 'General Ledger Setup',
  toolbarButtons: [],
  sections: [
    {
      id: 'general',
      title: 'General',
      fields: [
        {
          key: 'allowPostingFrom',
          label: 'Allow Posting From',
          type: 'date',
        },
        {
          key: 'allowPostingTo',
          label: 'Allow Posting To',
          type: 'date',
        },
        {
          key: 'paymentDiscountGracePeriod',
          label: 'Payment Discount Grace Period',
          type: 'text',
          validation: {
            maxLength: 32,
          },
        },
        {
          key: 'paymentToleranceEnabled',
          label: 'Payment Tolerance Enabled',
          type: 'boolean',
        },
        {
          key: 'paymentTolerancePercent',
          label: 'Payment Tolerance Percent',
          type: 'decimal',
          validation: {
            min: 0,
            max: 100,
            precision: 9,
            scale: 6,
          },
        },
        {
          key: 'maxPaymentToleranceAmount',
          label: 'Max Payment Tolerance Amount',
          type: 'decimal',
          validation: {
            min: 0,
            precision: 20,
            scale: 6,
          },
        },
        {
          key: 'applicationRoundingPrecision',
          label: 'Application Rounding Precision',
          type: 'decimal',
          validation: {
            precision: 20,
            scale: 10,
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
          key: 'localCurrencyId',
          label: 'Local Currency',
          type: 'lookup',
          valueType: 'guid',
          defaultValue: null,
          lookup: {
            endpoint: '/currencies',
            valueField: 'systemId',
            displayField: 'code',
            searchFields: ['code', 'description'],
          },
          displayFormat: '[code] — [description]',
        },
        {
          key: 'globalDimension1Id',
          label: 'Global Dimension1',
          type: 'lookup',
          valueType: 'guid',
          defaultValue: null,
          lookup: {
            endpoint: '/dimensions',
            valueField: 'systemId',
            displayField: 'code',
            searchFields: ['code', 'name'],
          },
          displayFormat: '[code] — [name]',
        },
        {
          key: 'globalDimension2Id',
          label: 'Global Dimension2',
          type: 'lookup',
          valueType: 'guid',
          defaultValue: null,
          lookup: {
            endpoint: '/dimensions',
            valueField: 'systemId',
            displayField: 'code',
            searchFields: ['code', 'name'],
          },
          displayFormat: '[code] — [name]',
        },
        {
          key: 'shortcutDimension3Id',
          label: 'Shortcut Dimension3',
          type: 'lookup',
          valueType: 'guid',
          defaultValue: null,
          lookup: {
            endpoint: '/dimensions',
            valueField: 'systemId',
            displayField: 'code',
            searchFields: ['code', 'name'],
          },
          displayFormat: '[code] — [name]',
        },
        {
          key: 'shortcutDimension4Id',
          label: 'Shortcut Dimension4',
          type: 'lookup',
          valueType: 'guid',
          defaultValue: null,
          lookup: {
            endpoint: '/dimensions',
            valueField: 'systemId',
            displayField: 'code',
            searchFields: ['code', 'name'],
          },
          displayFormat: '[code] — [name]',
        },
        {
          key: 'shortcutDimension5Id',
          label: 'Shortcut Dimension5',
          type: 'lookup',
          valueType: 'guid',
          defaultValue: null,
          lookup: {
            endpoint: '/dimensions',
            valueField: 'systemId',
            displayField: 'code',
            searchFields: ['code', 'name'],
          },
          displayFormat: '[code] — [name]',
        },
        {
          key: 'shortcutDimension6Id',
          label: 'Shortcut Dimension6',
          type: 'lookup',
          valueType: 'guid',
          defaultValue: null,
          lookup: {
            endpoint: '/dimensions',
            valueField: 'systemId',
            displayField: 'code',
            searchFields: ['code', 'name'],
          },
          displayFormat: '[code] — [name]',
        },
        {
          key: 'shortcutDimension7Id',
          label: 'Shortcut Dimension7',
          type: 'lookup',
          valueType: 'guid',
          defaultValue: null,
          lookup: {
            endpoint: '/dimensions',
            valueField: 'systemId',
            displayField: 'code',
            searchFields: ['code', 'name'],
          },
          displayFormat: '[code] — [name]',
        },
        {
          key: 'shortcutDimension8Id',
          label: 'Shortcut Dimension8',
          type: 'lookup',
          valueType: 'guid',
          defaultValue: null,
          lookup: {
            endpoint: '/dimensions',
            valueField: 'systemId',
            displayField: 'code',
            searchFields: ['code', 'name'],
          },
          displayFormat: '[code] — [name]',
        },
        {
          key: 'bankAccountNoSeriesId',
          label: 'Bank Account No Series',
          type: 'lookup',
          valueType: 'guid',
          defaultValue: null,
          lookup: {
            endpoint: '/numberSeries',
            valueField: 'systemId',
            displayField: 'code',
            searchFields: ['code', 'description'],
          },
          displayFormat: '[code] — [description]',
        },
      ],
    },
  ],
};

// List page.
export const generalLedgerSetupListConfig: ListPageConfig & {
  dataSource: DataSourceConfig;
} = {
  pageId: 'general-ledger-setup',
  pageType: 'setup',
  title: 'General Ledger Setup',
  dataSource: {
    endpoint: '/generalLedgerSetup',
    keyField: 'systemId',
    singleton: true,
    defaultSort: 'allowPostingFrom asc',
    supportsCreate: false,
  },
  identity: {
    primaryField: 'allowPostingFrom',
  },
  module: 'Finance',
  menu: {
    module: 'Finance',
    group: 'General Ledger',
    icon: 'ts-icon ts-icon-general-ledger-setup',
    moduleIcon: 'ts-icon ts-icon-finance-module',
    route: '/general-ledger-setup',
  },
  dataSurface: {
    columns: listColumns(generalLedgerSetupHeaderConfig, [
      {
        field: 'allowPostingFrom',
      },
      {
        field: 'allowPostingTo',
        width: '140px',
      },
      {
        field: 'localCurrencyId',
        width: '140px',
      },
      {
        field: 'globalDimension1Id',
        width: '140px',
      },
      {
        field: 'globalDimension2Id',
        width: '140px',
      },
      {
        field: 'shortcutDimension3Id',
        width: '140px',
      },
      {
        field: 'shortcutDimension4Id',
        width: '140px',
      },
      {
        field: 'shortcutDimension5Id',
        width: '140px',
      },
      {
        field: 'shortcutDimension6Id',
        width: '140px',
      },
      {
        field: 'shortcutDimension7Id',
        width: '140px',
      },
      {
        field: 'shortcutDimension8Id',
        width: '140px',
      },
      {
        field: 'systemModifiedAt',
      },
    ]),
  },
  tools: {
    filter: false,
    advancedFilter: false,
    export: false,
    columns: false,
  },
  factBox: generalLedgerSetupFactBoxConfig,
};
