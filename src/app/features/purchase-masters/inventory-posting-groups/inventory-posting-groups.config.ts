import {
  DataSourceConfig,
  HeaderConfig,
  ListPageConfig,
  listColumns,
} from '../../../platform/public-api';
import { inventoryPostingGroupsFactBoxConfig } from './inventory-posting-groups.factbox.config';

// Header form.
export const inventoryPostingGroupsHeaderConfig: HeaderConfig = {
  dialogTitle: 'Inventory Posting Groups',
  toolbarButtons: [],
  sections: [
    {
      id: 'general',
      title: 'General',
      fields: [
        {
          key: 'code',
          label: 'Code',
          type: 'code',
          required: true,
          validation: {
            maxLength: 20,
          },
        },
        {
          key: 'description',
          label: 'Description',
          type: 'text',
          required: true,
          validation: {
            maxLength: 100,
          },
        },
        {
          key: 'isActive',
          label: 'Is Active',
          type: 'boolean',
          defaultValue: true,
        },
      ],
    },
  ],
};

// List page.
export const inventoryPostingGroupsListConfig: ListPageConfig & {
  dataSource: DataSourceConfig;
} = {
  pageId: 'inventory-posting-groups',
  pageType: 'card',
  title: 'Inventory Posting Groups',
  autoSave: true,
  dataSource: {
    endpoint: '/inventoryPostingGroups',
    keyField: 'systemId',
    defaultSort: 'code asc',
  },
  identity: {
    primaryField: 'code',
    secondaryField: 'description',
  },
  module: 'Inventory',
  menu: {
    module: 'Inventory',
    group: 'Setup',
    icon: 'ts-icon ts-icon-inventory-posting-groups',
    moduleIcon: 'ts-icon ts-icon-inventory-module',
    route: '/inventory-posting-groups',
  },
  dataSurface: {
    columns: listColumns(inventoryPostingGroupsHeaderConfig, [
      {
        field: 'code',
      },
      {
        field: 'description',
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
  factBox: inventoryPostingGroupsFactBoxConfig,
};
