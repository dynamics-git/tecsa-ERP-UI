import { HeaderConfig, DataSourceConfig, ListPageConfig, listColumns } from '../../../platform/public-api';
export const itemChargesHeaderConfig: HeaderConfig = {
  dialogTitle: 'Item Charges',
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
    {
      id: 'posting',
      title: 'Posting & Defaults',
      fields: [
        {
          key: 'generalProductPostingGroupId',
          label: 'General Product Posting Group',
          type: 'lookup',
          valueType: 'guid',
          required: true,
          lookup: {
            endpoint: '/generalProductPostingGroups',
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

export const itemChargesListConfig: ListPageConfig & { dataSource: DataSourceConfig } = {
  pageId: 'item-charges',
  pageType: 'card',
  autoSave: true,
  title: 'Item Charges',
  module: 'Inventory',
  identity: {
    primaryField: 'code',
    secondaryField: 'description',
  },
  menu: {
    module: 'Inventory',
    group: 'Items',
    icon: 'ts-icon ts-icon-item-charges',
    route: '/item-charges',
    moduleIcon: 'ts-icon ts-icon-inventory-module',
  },
  dataSource: {
    endpoint: '/itemCharges',
    keyField: 'systemId',
    defaultSort: 'code asc',
  },
  dataSurface: {
    idField: 'systemId',
    columns: listColumns(itemChargesHeaderConfig, [
      'code',
      'description',
      { field: 'generalProductPostingGroupId', width: '140px' },
      { field: 'isActive', width: '140px' },
      'systemModifiedAt',
    ]),
  },
  factBox: { enabled: false },
};
