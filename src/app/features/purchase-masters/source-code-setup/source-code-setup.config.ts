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
          key: 'generalJournal',
          label: 'General Journal Source Code',
          type: 'lookup',
          valueType: 'code',
          defaultValue: '',
          lookup: {
            endpoint: '/sourceCodes',
            valueField: 'code',
            displayField: 'code',
            recordRead: 'collection',
            searchFields: ['code', 'description'],
          },
          displayFormat: '[code] — [description]',
        },
        {
          key: 'sales',
          label: 'Sales Source Code',
          type: 'lookup',
          valueType: 'code',
          defaultValue: '',
          lookup: {
            endpoint: '/sourceCodes',
            valueField: 'code',
            displayField: 'code',
            recordRead: 'collection',
            searchFields: ['code', 'description'],
          },
          displayFormat: '[code] — [description]',
        },
        {
          key: 'purchases',
          label: 'Purchases Source Code',
          type: 'lookup',
          valueType: 'code',
          defaultValue: '',
          lookup: {
            endpoint: '/sourceCodes',
            valueField: 'code',
            displayField: 'code',
            recordRead: 'collection',
            searchFields: ['code', 'description'],
          },
          displayFormat: '[code] — [description]',
        },
        {
          key: 'cashReceiptJournal',
          label: 'Cash Receipt Source Code',
          type: 'lookup',
          valueType: 'code',
          defaultValue: '',
          lookup: {
            endpoint: '/sourceCodes',
            valueField: 'code',
            displayField: 'code',
            recordRead: 'collection',
            searchFields: ['code', 'description'],
          },
          displayFormat: '[code] — [description]',
        },
        {
          key: 'paymentJournal',
          label: 'Payment Journal Source Code',
          type: 'lookup',
          valueType: 'code',
          defaultValue: '',
          lookup: {
            endpoint: '/sourceCodes',
            valueField: 'code',
            displayField: 'code',
            recordRead: 'collection',
            searchFields: ['code', 'description'],
          },
          displayFormat: '[code] — [description]',
        },
        {
          key: 'itemJournal',
          label: 'Item Journal Source Code',
          type: 'lookup',
          valueType: 'code',
          defaultValue: '',
          lookup: {
            endpoint: '/sourceCodes',
            valueField: 'code',
            displayField: 'code',
            recordRead: 'collection',
            searchFields: ['code', 'description'],
          },
          displayFormat: '[code] — [description]',
        },
        {
          key: 'exchangeRateAdjmt',
          label: 'Exchange Adjustment Source Code',
          type: 'lookup',
          valueType: 'code',
          defaultValue: '',
          lookup: {
            endpoint: '/sourceCodes',
            valueField: 'code',
            displayField: 'code',
            recordRead: 'collection',
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
    defaultSort: 'generalJournal asc',
    // Setup uses PUT, including first creation; it has no New/Delete action.
    supportsCreate: false,
    supportsDelete: false,
  },
  identity: {
    primaryField: '__display_generalJournal',
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
        field: 'generalJournal',
      },
      {
        field: 'sales',
        width: '140px',
      },
      {
        field: 'purchases',
        width: '140px',
      },
      {
        field: 'cashReceiptJournal',
        width: '140px',
      },
      {
        field: 'paymentJournal',
        width: '140px',
      },
      {
        field: 'itemJournal',
        width: '140px',
      },
      {
        field: 'exchangeRateAdjmt',
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
