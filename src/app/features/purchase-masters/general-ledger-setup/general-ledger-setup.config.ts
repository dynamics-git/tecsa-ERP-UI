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
          key: 'paymentTolerancePercent',
          label: 'Payment Tolerance Percent',
          type: 'decimal',
          validation: {
            min: 0,
            max: 100,
            precision: 38,
            scale: 20,
          },
        },
        {
          key: 'maxPaymentToleranceAmount',
          label: 'Max Payment Tolerance Amount',
          type: 'decimal',
          validation: {
            min: 0,
            precision: 38,
            scale: 20,
          },
        },
        {
          key: 'applnRoundingPrecision',
          label: 'Application Rounding Precision',
          type: 'decimal',
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
          key: 'lcyCode',
          label: 'Local Currency',
          type: 'lookup',
          valueType: 'code',
          defaultValue: '',
          lookup: {
            endpoint: '/currencies',
            valueField: 'code',
            displayField: 'code',
            searchFields: ['code', 'description'],
            recordRead: 'collection',
          },
          displayFormat: '[code] — [description]',
          validation: {
            maxLength: 10,
          },
        },
        {
          key: 'globalDimension1Code',
          label: 'Global Dimension1',
          type: 'lookup',
          valueType: 'code',
          defaultValue: '',
          lookup: {
            endpoint: '/dimensions',
            valueField: 'code',
            displayField: 'code',
            searchFields: ['code', 'name'],
            recordRead: 'collection',
          },
          displayFormat: '[code] — [name]',
          validation: {
            maxLength: 20,
          },
        },
        {
          key: 'globalDimension2Code',
          label: 'Global Dimension2',
          type: 'lookup',
          valueType: 'code',
          defaultValue: '',
          lookup: {
            endpoint: '/dimensions',
            valueField: 'code',
            displayField: 'code',
            searchFields: ['code', 'name'],
            recordRead: 'collection',
          },
          displayFormat: '[code] — [name]',
          validation: {
            maxLength: 20,
          },
        },
        {
          key: 'shortcutDimension3Code',
          label: 'Shortcut Dimension3',
          type: 'lookup',
          valueType: 'code',
          defaultValue: '',
          lookup: {
            endpoint: '/dimensions',
            valueField: 'code',
            displayField: 'code',
            searchFields: ['code', 'name'],
            recordRead: 'collection',
          },
          displayFormat: '[code] — [name]',
          validation: {
            maxLength: 20,
          },
        },
        {
          key: 'shortcutDimension4Code',
          label: 'Shortcut Dimension4',
          type: 'lookup',
          valueType: 'code',
          defaultValue: '',
          lookup: {
            endpoint: '/dimensions',
            valueField: 'code',
            displayField: 'code',
            searchFields: ['code', 'name'],
            recordRead: 'collection',
          },
          displayFormat: '[code] — [name]',
          validation: {
            maxLength: 20,
          },
        },
        {
          key: 'shortcutDimension5Code',
          label: 'Shortcut Dimension5',
          type: 'lookup',
          valueType: 'code',
          defaultValue: '',
          lookup: {
            endpoint: '/dimensions',
            valueField: 'code',
            displayField: 'code',
            searchFields: ['code', 'name'],
            recordRead: 'collection',
          },
          displayFormat: '[code] — [name]',
          validation: {
            maxLength: 20,
          },
        },
        {
          key: 'shortcutDimension6Code',
          label: 'Shortcut Dimension6',
          type: 'lookup',
          valueType: 'code',
          defaultValue: '',
          lookup: {
            endpoint: '/dimensions',
            valueField: 'code',
            displayField: 'code',
            searchFields: ['code', 'name'],
            recordRead: 'collection',
          },
          displayFormat: '[code] — [name]',
          validation: {
            maxLength: 20,
          },
        },
        {
          key: 'shortcutDimension7Code',
          label: 'Shortcut Dimension7',
          type: 'lookup',
          valueType: 'code',
          defaultValue: '',
          lookup: {
            endpoint: '/dimensions',
            valueField: 'code',
            displayField: 'code',
            searchFields: ['code', 'name'],
            recordRead: 'collection',
          },
          displayFormat: '[code] — [name]',
          validation: {
            maxLength: 20,
          },
        },
        {
          key: 'shortcutDimension8Code',
          label: 'Shortcut Dimension8',
          type: 'lookup',
          valueType: 'code',
          defaultValue: '',
          lookup: {
            endpoint: '/dimensions',
            valueField: 'code',
            displayField: 'code',
            searchFields: ['code', 'name'],
            recordRead: 'collection',
          },
          displayFormat: '[code] — [name]',
          validation: {
            maxLength: 20,
          },
        },
        {
          key: 'bankAccountNos',
          label: 'Bank Account No Series',
          type: 'lookup',
          valueType: 'code',
          defaultValue: '',
          lookup: {
            endpoint: '/noSeries',
            valueField: 'code',
            displayField: 'code',
            searchFields: ['code', 'description'],
            recordRead: 'collection',
          },
          displayFormat: '[code] — [description]',
          validation: {
            maxLength: 20,
          },
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
    supportsDelete: false,
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
        field: 'lcyCode',
        width: '140px',
      },
      {
        field: 'globalDimension1Code',
        width: '140px',
      },
      {
        field: 'globalDimension2Code',
        width: '140px',
      },
      {
        field: 'shortcutDimension3Code',
        width: '140px',
      },
      {
        field: 'shortcutDimension4Code',
        width: '140px',
      },
      {
        field: 'shortcutDimension5Code',
        width: '140px',
      },
      {
        field: 'shortcutDimension6Code',
        width: '140px',
      },
      {
        field: 'shortcutDimension7Code',
        width: '140px',
      },
      {
        field: 'shortcutDimension8Code',
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
