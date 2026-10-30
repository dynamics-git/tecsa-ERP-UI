import {
  DataSourceConfig,
  HeaderConfig,
  ListPageConfig,
  listColumns,
} from '../../../platform/public-api';
import { generalBusinessPostingGroupsFactBoxConfig } from './general-business-posting-groups.factbox.config';

// Header form.
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

// List page.
export const generalBusinessPostingGroupsListConfig: ListPageConfig & {
  dataSource: DataSourceConfig;
} = {
  pageId: 'general-business-posting-groups',
  pageType: 'card',
  title: 'General Business Posting Groups',
  dataSource: {
    endpoint: '/generalBusinessPostingGroups',
    keyField: 'systemId',
    defaultSort: 'code asc',
  },
  identity: {
    primaryField: 'code',
    secondaryField: 'description',
  },
  module: 'Finance',
  menu: {
    module: 'Finance',
    group: 'Posting Setup',
    icon: 'ts-icon ts-icon-general-business-posting-groups',
    moduleIcon: 'ts-icon ts-icon-finance-module',
    route: '/general-business-posting-groups',
  },
  dataSurface: {
    columns: listColumns(generalBusinessPostingGroupsHeaderConfig, [
      {
        field: 'code',
      },
      {
        field: 'description',
      },
      {
        field: 'defaultVatBusinessPostingGroupId',
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
  factBox: generalBusinessPostingGroupsFactBoxConfig,
};
