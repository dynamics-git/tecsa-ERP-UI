import {
  DataSourceConfig,
  HeaderConfig,
  ListPageConfig,
  listColumns,
} from '../../../platform/public-api';
import { inventoryPostingSetupFactBoxConfig } from './inventory-posting-setup.factbox.config';

// Header form.
export const inventoryPostingSetupHeaderConfig: HeaderConfig = {
  dialogTitle: 'Inventory Posting Setup',
  toolbarButtons: [],
  sections: [
    {
      id: 'posting',
      title: 'Posting & Defaults',
      fields: [
        {
          key: 'locationCode',
          label: 'Location',
          type: 'lookup',
          valueType: 'code',
          defaultValue: '',
          readonlyAfterCreate: true,
          lookup: {
            endpoint: '/locations',
            valueField: 'code',
            displayField: 'code',
            searchFields: ['code', 'name'],
            recordRead: 'collection',
          },
          displayFormat: '[code] — [name]',
          validation: {
            maxLength: 10,
          },
        },
        {
          key: 'invtPostingGroupCode',
          label: 'Inventory Posting Group',
          type: 'lookup',
          valueType: 'code',
          readonlyAfterCreate: true,
          lookup: {
            endpoint: '/inventoryPostingGroups',
            valueField: 'code',
            displayField: 'code',
            searchFields: ['code', 'description'],
            recordRead: 'collection',
          },
          displayFormat: '[code] — [description]',
          validation: {
            maxLength: 20,
          },
          defaultValue: '',
        },
        {
          key: 'inventoryAccount',
          label: 'Inventory Account',
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
          key: 'inventoryAccountInterim',
          label: 'Inventory Account Interim',
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
          key: 'wipAccount',
          label: 'Wip Account',
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
          key: 'materialVarianceAccount',
          label: 'Material Variance Account',
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
          key: 'capacityVarianceAccount',
          label: 'Capacity Variance Account',
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
          key: 'mfgOverheadVarianceAccount',
          label: 'Manufacturing Overhead Variance Account',
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
          key: 'capOverheadVarianceAccount',
          label: 'Capacity Overhead Variance Account',
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
export const inventoryPostingSetupListConfig: ListPageConfig & {
  dataSource: DataSourceConfig;
} = {
  pageId: 'inventory-posting-setup',
  pageType: 'card',
  title: 'Inventory Posting Setup',
  dataSource: {
    endpoint: '/inventoryPostingSetup',
    keyField: 'systemId',
    defaultSort: 'locationCode asc',
  },
  identity: {
    primaryField: '__display_locationCode',
  },
  module: 'Inventory',
  menu: {
    module: 'Inventory',
    group: 'Setup',
    icon: 'ts-icon ts-icon-inventory-posting-setup',
    moduleIcon: 'ts-icon ts-icon-inventory-module',
    route: '/inventory-posting-setup',
  },
  dataSurface: {
    columns: listColumns(inventoryPostingSetupHeaderConfig, [
      {
        field: 'locationCode',
      },
      {
        field: 'invtPostingGroupCode',
        width: '140px',
      },
      {
        field: 'inventoryAccount',
        width: '140px',
      },
      {
        field: 'inventoryAccountInterim',
        width: '140px',
      },

      {
        field: 'systemModifiedAt',
      },
    ]),
  },
  factBox: inventoryPostingSetupFactBoxConfig,
};
