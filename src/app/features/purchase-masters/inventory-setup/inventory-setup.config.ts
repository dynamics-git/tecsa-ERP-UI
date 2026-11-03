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
          key: 'allowNegativeInventory',
          label: 'Allow Negative Inventory',
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
          key: 'itemNoSeriesId',
          label: 'Item No Series',
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
        {
          key: 'transferOrderNoSeriesId',
          label: 'Transfer Order No Series',
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
        {
          key: 'inTransitLocationId',
          label: 'In Transit Location',
          type: 'lookup',
          valueType: 'guid',
          defaultValue: null,
          lookup: {
            endpoint: '/locations',
            valueField: 'systemId',
            displayField: 'code',
            searchFields: ['code', 'name'],
          },
          displayFormat: '[code] — [name]',
        },
        {
          key: 'postedTransferShipmentNoSeriesId',
          label: 'Posted Transfer Shipment No Series',
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
        {
          key: 'postedTransferReceiptNoSeriesId',
          label: 'Posted Transfer Receipt No Series',
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
        {
          key: 'warehouseBinMovementNoSeriesId',
          label: 'Warehouse Bin Movement No Series',
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
        {
          key: 'warehousePickWorksheetNoSeriesId',
          label: 'Warehouse Pick Worksheet No Series',
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
    defaultSort: 'itemNoSeriesId asc',
    supportsCreate: false,
  },
  identity: {
    primaryField: '__display_itemNoSeriesId',
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
        field: 'itemNoSeriesId',
      },
      {
        field: 'transferOrderNoSeriesId',
        width: '140px',
      },
      {
        field: 'inTransitLocationId',
        width: '140px',
      },
      {
        field: 'postedTransferShipmentNoSeriesId',
        width: '140px',
      },
      {
        field: 'postedTransferReceiptNoSeriesId',
        width: '140px',
      },
      {
        field: 'warehouseBinMovementNoSeriesId',
        width: '140px',
      },
      {
        field: 'warehousePickWorksheetNoSeriesId',
        width: '140px',
      },
      {
        field: 'locationMandatory',
        width: '140px',
      },
      {
        field: 'allowNegativeInventory',
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
