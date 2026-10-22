import { HeaderConfig, DataSourceConfig, ListPageConfig, listColumns } from '../../../platform/public-api';
export const generalBusinessPostingGroupsHeaderConfig: HeaderConfig = {
  dialogTitle: 'General Business Posting Groups',
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
          key: 'defaultVatBusinessPostingGroupId',
          label: 'Default VAT Business Posting Group',
          type: 'lookup',
          valueType: 'guid',
          defaultValue: null,
          lookup: {
            endpoint: '/vatBusinessPostingGroups',
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

export const generalBusinessPostingGroupsListConfig: ListPageConfig & { dataSource: DataSourceConfig } = {
  pageId: 'general-business-posting-groups',
  pageType: 'card',
  autoSave: true,
  title: 'General Business Posting Groups',
  module: 'Finance',
  identity: {
    primaryField: 'code',
    secondaryField: 'description',
  },
  menu: {
    module: 'Finance',
    group: 'Posting Setup',
    icon: 'ts-icon ts-icon-general-business-posting-groups',
    route: '/general-business-posting-groups',
    moduleIcon: 'ts-icon ts-icon-finance-module',
  },
  dataSource: {
    endpoint: '/generalBusinessPostingGroups',
    keyField: 'systemId',
    defaultSort: 'code asc',
  },
  dataSurface: {
    idField: 'systemId',
    columns: listColumns(generalBusinessPostingGroupsHeaderConfig, [
      'code',
      'description',
      { field: 'defaultVatBusinessPostingGroupId', width: '140px' },
      { field: 'isActive', width: '140px' },
      'systemModifiedAt',
    ]),
  },
  factBox: { enabled: false },
};
