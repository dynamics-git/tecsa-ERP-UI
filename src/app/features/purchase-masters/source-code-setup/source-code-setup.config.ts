import {
  DataSourceConfig,
  HeaderConfig,
  ListPageConfig,
  listColumns,
} from '../../../platform/public-api';
import { sourceCodeSetupFactBoxConfig } from './source-code-setup.factbox.config';

// Header form.
export const sourceCodeSetupHeaderConfig: HeaderConfig = {
  dialogTitle: 'Source Code Setup',
  toolbarButtons: [],
  sections: [
    {
      id: 'posting',
      title: 'Posting & Defaults',
      fields: [
        {
          key: 'generalJournalSourceCodeId',
          label: 'General Journal Source Code',
          type: 'lookup',
          valueType: 'guid',
          defaultValue: null,
          lookup: {
            endpoint: '/sourceCodes',
            valueField: 'systemId',
            displayField: 'code',
            searchFields: ['code', 'description'],
          },
          displayFormat: '[code] — [description]',
        },
        {
          key: 'salesSourceCodeId',
          label: 'Sales Source Code',
          type: 'lookup',
          valueType: 'guid',
          defaultValue: null,
          lookup: {
            endpoint: '/sourceCodes',
            valueField: 'systemId',
            displayField: 'code',
            searchFields: ['code', 'description'],
          },
          displayFormat: '[code] — [description]',
        },
        {
          key: 'purchasesSourceCodeId',
          label: 'Purchases Source Code',
          type: 'lookup',
          valueType: 'guid',
          defaultValue: null,
          lookup: {
            endpoint: '/sourceCodes',
            valueField: 'systemId',
            displayField: 'code',
            searchFields: ['code', 'description'],
          },
          displayFormat: '[code] — [description]',
        },
        {
          key: 'cashReceiptSourceCodeId',
          label: 'Cash Receipt Source Code',
          type: 'lookup',
          valueType: 'guid',
          defaultValue: null,
          lookup: {
            endpoint: '/sourceCodes',
            valueField: 'systemId',
            displayField: 'code',
            searchFields: ['code', 'description'],
          },
          displayFormat: '[code] — [description]',
        },
        {
          key: 'paymentJournalSourceCodeId',
          label: 'Payment Journal Source Code',
          type: 'lookup',
          valueType: 'guid',
          defaultValue: null,
          lookup: {
            endpoint: '/sourceCodes',
            valueField: 'systemId',
            displayField: 'code',
            searchFields: ['code', 'description'],
          },
          displayFormat: '[code] — [description]',
        },
        {
          key: 'itemJournalSourceCodeId',
          label: 'Item Journal Source Code',
          type: 'lookup',
          valueType: 'guid',
          defaultValue: null,
          lookup: {
            endpoint: '/sourceCodes',
            valueField: 'systemId',
            displayField: 'code',
            searchFields: ['code', 'description'],
          },
          displayFormat: '[code] — [description]',
        },
        {
          key: 'exchangeAdjustmentSourceCodeId',
          label: 'Exchange Adjustment Source Code',
          type: 'lookup',
          valueType: 'guid',
          defaultValue: null,
          lookup: {
            endpoint: '/sourceCodes',
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
export const sourceCodeSetupListConfig: ListPageConfig & {
  dataSource: DataSourceConfig;
} = {
  pageId: 'source-code-setup',
  pageType: 'setup',
  title: 'Source Code Setup',
  dataSource: {
    endpoint: '/sourceCodeSetup',
    keyField: 'systemId',
    singleton: true,
    defaultSort: 'generalJournalSourceCodeId asc',
    supportsCreate: false,
  },
  identity: {
    primaryField: '__display_generalJournalSourceCodeId',
  },
  module: 'Administration',
  menu: {
    module: 'Administration',
    group: 'Setup',
    icon: 'ts-icon ts-icon-source-code-setup',
    moduleIcon: 'ts-icon ts-icon-administration-module',
    route: '/source-code-setup',
  },
  dataSurface: {
    columns: listColumns(sourceCodeSetupHeaderConfig, [
      {
        field: 'generalJournalSourceCodeId',
      },
      {
        field: 'salesSourceCodeId',
        width: '140px',
      },
      {
        field: 'purchasesSourceCodeId',
        width: '140px',
      },
      {
        field: 'cashReceiptSourceCodeId',
        width: '140px',
      },
      {
        field: 'paymentJournalSourceCodeId',
        width: '140px',
      },
      {
        field: 'itemJournalSourceCodeId',
        width: '140px',
      },
      {
        field: 'exchangeAdjustmentSourceCodeId',
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
  factBox: sourceCodeSetupFactBoxConfig,
};
