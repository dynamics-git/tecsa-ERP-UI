import { HeaderConfig, DataSourceConfig, ListPageConfig, listColumns } from '../../../platform/public-api';
export const vatBusinessPostingGroupsHeaderConfig: HeaderConfig = {
  dialogTitle: 'VAT Business Posting Groups',
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

export const vatBusinessPostingGroupsListConfig: ListPageConfig & { dataSource: DataSourceConfig } = {
  pageId: 'vat-business-posting-groups',
  pageType: 'card',
  autoSave: true,
  title: 'VAT Business Posting Groups',
  module: 'Finance',
  identity: {
    primaryField: 'code',
    secondaryField: 'description',
  },
  menu: {
    module: 'Finance',
    group: 'Tax Setup',
    icon: 'ts-icon ts-icon-vat-business-posting-groups',
    route: '/vat-business-posting-groups',
    moduleIcon: 'ts-icon ts-icon-finance-module',
  },
  dataSource: {
    endpoint: '/vatBusinessPostingGroups',
    keyField: 'systemId',
    defaultSort: 'code asc',
  },
  dataSurface: {
    idField: 'systemId',
    columns: listColumns(vatBusinessPostingGroupsHeaderConfig, [
      'code',
      'description',
      { field: 'isActive', width: '140px' },
      'systemModifiedAt',
    ]),
  },
  factBox: { enabled: false },
};
