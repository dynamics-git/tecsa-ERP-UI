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
          readonlyAfterCreate: true,
        },
        {
          key: 'description',
          label: 'Description',
          type: 'text',
          validation: {
            maxLength: 100,
          },
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
  dataSource: {
    endpoint: '/inventoryPostingGroups',
    keyField: 'systemId',
    defaultSort: 'code asc',
    headerPKProp: 'code',
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
        field: 'systemModifiedAt',
      },
    ]),
  },
  factBox: inventoryPostingGroupsFactBoxConfig,
};
