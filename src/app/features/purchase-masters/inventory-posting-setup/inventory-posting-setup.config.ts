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
      id: 'general',
      title: 'General',
      fields: [
        {
          key: 'isActive',
          label: 'Is Active',
          type: 'boolean',
          defaultValue: true,
        },
      ],
    },
    {
      id: 'posting',
      title: 'Posting & Defaults',
      fields: [
        {
          key: 'locationId',
          label: 'Location',
          type: 'lookup',
          valueType: 'guid',
          defaultValue: null,
          readonlyAfterCreate: true,
          lookup: {
            endpoint: '/locations',
            valueField: 'systemId',
            displayField: 'code',
            searchFields: ['code', 'name'],
          },
          displayFormat: '[code] — [name]',
        },
        {
          key: 'inventoryPostingGroupId',
          label: 'Inventory Posting Group',
          type: 'lookup',
          valueType: 'guid',
          required: true,
          readonlyAfterCreate: true,
          lookup: {
            endpoint: '/inventoryPostingGroups',
            valueField: 'systemId',
            displayField: 'code',
            searchFields: ['code', 'description'],
          },
          displayFormat: '[code] — [description]',
        },
        {
          key: 'inventoryAccountId',
          label: 'Inventory Account',
          type: 'lookup',
          valueType: 'guid',
          defaultValue: null,
          lookup: {
            endpoint: '/glAccounts',
            valueField: 'systemId',
            displayField: 'number',
            searchFields: ['number', 'name'],
          },
          displayFormat: '[number] — [name]',
        },
        {
          key: 'inventoryAccountInterimId',
          label: 'Inventory Account Interim',
          type: 'lookup',
          valueType: 'guid',
          defaultValue: null,
          lookup: {
            endpoint: '/glAccounts',
            valueField: 'systemId',
            displayField: 'number',
            searchFields: ['number', 'name'],
          },
          displayFormat: '[number] — [name]',
        },
        {
          key: 'wipAccountId',
          label: 'Wip Account',
          type: 'lookup',
          valueType: 'guid',
          defaultValue: null,
          lookup: {
            endpoint: '/glAccounts',
            valueField: 'systemId',
            displayField: 'number',
            searchFields: ['number', 'name'],
          },
          displayFormat: '[number] — [name]',
        },
        {
          key: 'materialVarianceAccountId',
          label: 'Material Variance Account',
          type: 'lookup',
          valueType: 'guid',
          defaultValue: null,
          lookup: {
            endpoint: '/glAccounts',
            valueField: 'systemId',
            displayField: 'number',
            searchFields: ['number', 'name'],
          },
          displayFormat: '[number] — [name]',
        },
        {
          key: 'capacityVarianceAccountId',
          label: 'Capacity Variance Account',
          type: 'lookup',
          valueType: 'guid',
          defaultValue: null,
          lookup: {
            endpoint: '/glAccounts',
            valueField: 'systemId',
            displayField: 'number',
            searchFields: ['number', 'name'],
          },
          displayFormat: '[number] — [name]',
        },
        {
          key: 'manufacturingOverheadVarianceAccountId',
          label: 'Manufacturing Overhead Variance Account',
          type: 'lookup',
          valueType: 'guid',
          defaultValue: null,
          lookup: {
            endpoint: '/glAccounts',
            valueField: 'systemId',
            displayField: 'number',
            searchFields: ['number', 'name'],
          },
          displayFormat: '[number] — [name]',
        },
        {
          key: 'capacityOverheadVarianceAccountId',
          label: 'Capacity Overhead Variance Account',
          type: 'lookup',
          valueType: 'guid',
          defaultValue: null,
          lookup: {
            endpoint: '/glAccounts',
            valueField: 'systemId',
            displayField: 'number',
            searchFields: ['number', 'name'],
          },
          displayFormat: '[number] — [name]',
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
  autoSave: true,
  dataSource: {
    endpoint: '/inventoryPostingSetup',
    keyField: 'systemId',
    defaultSort: 'locationId asc',
  },
  identity: {
    primaryField: '__display_locationId',
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
        field: 'locationId',
      },
      {
        field: 'inventoryPostingGroupId',
        width: '140px',
      },
      {
        field: 'inventoryAccountId',
        width: '140px',
      },
      {
        field: 'inventoryAccountInterimId',
        width: '140px',
      },
      {
        field: 'isActive',
        width: '140px',
      },
      {
        field: 'systemModifiedAt',
      },
    ]),
  },
  factBox: inventoryPostingSetupFactBoxConfig,
};
