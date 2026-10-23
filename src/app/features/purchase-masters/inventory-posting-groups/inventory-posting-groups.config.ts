import { HeaderConfig, DataSourceConfig, ListPageConfig, listColumns } from '../../../platform/public-api';
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
          type: 'text',
          valueType: 'code',
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

export const inventoryPostingGroupsListConfig: ListPageConfig & { dataSource: DataSourceConfig } = {
  pageId: 'inventory-posting-groups',
  pageType: 'card',
  autoSave: true,
  title: 'Inventory Posting Groups',
  module: 'Inventory',
  identity: {
    primaryField: 'code',
    secondaryField: 'description',
  },
  menu: {
    module: 'Inventory',
    group: 'Setup',
    icon: 'ts-icon ts-icon-inventory-posting-groups',
    route: '/inventory-posting-groups',
    moduleIcon: 'ts-icon ts-icon-inventory-module',
  },
  dataSource: {
    endpoint: '/inventoryPostingGroups',
    keyField: 'systemId',
    defaultSort: 'code asc',
  },
  dataSurface: {
    idField: 'systemId',
    columns: listColumns(inventoryPostingGroupsHeaderConfig, [
      'code',
      'description',
      { field: 'isActive', width: '140px' },
      'systemModifiedAt',
    ]),
  },
  factBox: { enabled: true },
};
