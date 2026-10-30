import {
  DataSourceConfig,
  HeaderConfig,
  ListPageConfig,
  listColumns,
} from '../../../platform/public-api';
import { vatProductPostingGroupsFactBoxConfig } from './vat-product-posting-groups.factbox.config';

// Header form.
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
export const vatProductPostingGroupsListConfig: ListPageConfig & {
  dataSource: DataSourceConfig;
} = {
  pageId: 'vat-product-posting-groups',
  pageType: 'card',
  title: 'VAT Product Posting Groups',
  dataSource: {
    endpoint: '/vatProductPostingGroups',
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
    group: 'Tax Setup',
    icon: 'ts-icon ts-icon-vat-product-posting-groups',
    moduleIcon: 'ts-icon ts-icon-finance-module',
    route: '/vat-product-posting-groups',
  },
  dataSurface: {
    columns: listColumns(vatProductPostingGroupsHeaderConfig, [
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
  factBox: vatProductPostingGroupsFactBoxConfig,
};
