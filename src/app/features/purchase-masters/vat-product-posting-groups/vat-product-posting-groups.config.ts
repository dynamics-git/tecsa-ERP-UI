import { HeaderConfig, DataSourceConfig, ListPageConfig, listColumns } from '../../../platform/public-api';
export const vatProductPostingGroupsHeaderConfig: HeaderConfig = {
  dialogTitle: 'VAT Product Posting Groups',
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

export const vatProductPostingGroupsListConfig: ListPageConfig & { dataSource: DataSourceConfig } = {
  pageId: 'vat-product-posting-groups',
  pageType: 'card',
  autoSave: true,
  title: 'VAT Product Posting Groups',
  module: 'Finance',
  identity: {
    primaryField: 'code',
    secondaryField: 'description',
  },
  menu: {
    module: 'Finance',
    group: 'Tax Setup',
    icon: 'ts-icon ts-icon-vat-product-posting-groups',
    route: '/vat-product-posting-groups',
    moduleIcon: 'ts-icon ts-icon-finance-module',
  },
  dataSource: {
    endpoint: '/vatProductPostingGroups',
    keyField: 'systemId',
    defaultSort: 'code asc',
  },
  dataSurface: {
    idField: 'systemId',
    columns: listColumns(vatProductPostingGroupsHeaderConfig, [
      'code',
      'description',
      { field: 'isActive', width: '140px' },
      'systemModifiedAt',
    ]),
  },
  factBox: { enabled: false },
};
