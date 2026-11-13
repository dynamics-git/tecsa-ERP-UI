import {
  DataSourceConfig,
  HeaderConfig,
  ListPageConfig,
  listColumns,
} from '../../../platform/public-api';
import { inventorySetupFactBoxConfig } from './inventory-setup.factbox.config';

// Header form.
export const inventorySetupHeaderConfig: HeaderConfig = {
  dialogTitle: 'Inventory Setup',
  toolbarButtons: [],
  sections: [
    {
      id: 'general',
      title: 'General',
      fields: [
        {
          key: 'locationMandatory',
          label: 'Location Mandatory',
          type: 'boolean',
          defaultValue: false,
        },
        {
          key: 'preventNegativeInventory',
          label: 'Prevent Negative Inventory',
          type: 'boolean',
          defaultValue: false,
        },
      ],
    },
    {
      id: 'posting',
      title: 'Posting & Defaults',
      fields: [
        {
          key: 'itemNos',
          label: 'Item No Series',
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
        {
          key: 'transferOrderNos',
          label: 'Transfer Order No Series',
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

        {
          key: 'postedTransferShptNos',
          label: 'Posted Transfer Shipment No Series',
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
        {
          key: 'postedTransferRcptNos',
          label: 'Posted Transfer Receipt No Series',
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
export const inventorySetupListConfig: ListPageConfig & {
  dataSource: DataSourceConfig;
} = {
  pageId: 'inventory-setup',
  pageType: 'setup',
  title: 'Inventory Setup',
  dataSource: {
    endpoint: '/inventorySetup',
    keyField: 'systemId',
    singleton: true,
    defaultSort: 'itemNos asc',
    supportsCreate: false,
    supportsDelete: false,
  },
  identity: {
    primaryField: '__display_itemNos',
  },
  module: 'Inventory',
  menu: {
    module: 'Inventory',
    group: 'Setup',
    icon: 'ts-icon ts-icon-inventory-setup',
    moduleIcon: 'ts-icon ts-icon-inventory-module',
    route: '/inventory-setup',
  },
  dataSurface: {
    columns: listColumns(inventorySetupHeaderConfig, [
      {
        field: 'itemNos',
      },
      {
        field: 'transferOrderNos',
        width: '140px',
      },

      {
        field: 'postedTransferShptNos',
        width: '140px',
      },
      {
        field: 'postedTransferRcptNos',
        width: '140px',
      },

      {
        field: 'locationMandatory',
        width: '140px',
      },
      {
        field: 'preventNegativeInventory',
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
  factBox: inventorySetupFactBoxConfig,
};
