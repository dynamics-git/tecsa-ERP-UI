import { HeaderConfig, DataSourceConfig, ListPageConfig, listColumns } from '../../../platform/public-api';
export const generalProductPostingGroupsHeaderConfig: HeaderConfig = {
  dialogTitle: 'General Product Posting Groups',
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
          key: 'defaultVatProductPostingGroupId',
          label: 'Default VAT Product Posting Group',
          type: 'lookup',
          valueType: 'guid',
          defaultValue: null,
          lookup: {
            endpoint: '/vatProductPostingGroups',
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

export const generalProductPostingGroupsListConfig: ListPageConfig & { dataSource: DataSourceConfig } = {
  pageId: 'general-product-posting-groups',
  pageType: 'card',
  autoSave: true,
  title: 'General Product Posting Groups',
  module: 'Finance',
  identity: {
    primaryField: 'code',
    secondaryField: 'description',
  },
  menu: {
    module: 'Finance',
    group: 'Posting Setup',
    icon: 'ts-icon ts-icon-general-product-posting-groups',
    route: '/general-product-posting-groups',
    moduleIcon: 'ts-icon ts-icon-finance-module',
  },
  dataSource: {
    endpoint: '/generalProductPostingGroups',
    keyField: 'systemId',
    defaultSort: 'code asc',
  },
  dataSurface: {
    idField: 'systemId',
    columns: listColumns(generalProductPostingGroupsHeaderConfig, [
      'code',
      'description',
      { field: 'defaultVatProductPostingGroupId', width: '140px' },
      { field: 'isActive', width: '140px' },
      'systemModifiedAt',
    ]),
  },
  factBox: { enabled: false },
};
