import {
  DataSourceConfig,
  HeaderConfig,
  ListPageConfig,
  listColumns,
} from '../../../platform/public-api';
import { vatBusinessPostingGroupsFactBoxConfig } from './vat-business-posting-groups.factbox.config';

// Header form.
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
export const vatBusinessPostingGroupsListConfig: ListPageConfig & {
  dataSource: DataSourceConfig;
} = {
  pageId: 'vat-business-posting-groups',
  pageType: 'card',
  title: 'VAT Business Posting Groups',
  dataSource: {
    endpoint: '/vatBusinessPostingGroups',
    keyField: 'systemId',
    defaultSort: 'code asc',
    headerPKProp: 'code',
  },
  identity: {
    primaryField: 'code',
    secondaryField: 'description',
  },
  module: 'Finance',
  menu: {
    module: 'Finance',
    group: 'Tax Setup',
    icon: 'ts-icon ts-icon-vat-business-posting-groups',
    moduleIcon: 'ts-icon ts-icon-finance-module',
    route: '/vat-business-posting-groups',
  },
  dataSurface: {
    columns: listColumns(vatBusinessPostingGroupsHeaderConfig, [
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
  factBox: vatBusinessPostingGroupsFactBoxConfig,
};
