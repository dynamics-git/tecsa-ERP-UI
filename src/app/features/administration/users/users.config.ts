import {
  DataSourceConfig,
  HeaderConfig,
  ListPageConfig,
  listColumns,
} from '../../../platform/public-api';
import { usersFactBoxConfig } from './users.factbox.config';

// Header form.
export const usersHeaderConfig: HeaderConfig = {
  dialogTitle: 'User',
  toolbarButtons: [],
  sections: [
    {
      id: 'general',
      title: 'General',
      fields: [
        {
          key: 'userName',
          label: 'User ID',
          type: 'text',
          required: true,
          validation: {
            maxLength: 100,
          },
        },
        {
          key: 'name',
          label: 'Name',
          type: 'text',
          required: true,
          validation: {
            maxLength: 150,
          },
        },
        {
          key: 'email',
          label: 'Email',
          type: 'email',
          required: true,
          validation: {
            maxLength: 255,
          },
        },
        {
          key: 'password',
          label: 'Password',
          type: 'password',
          required: true,
          readonlyAfterCreate: true,
          validation: {
            maxLength: 255,
            pattern: '^.{8,}$',
            message: 'Use at least 8 characters.',
          },
          factBox: false,
        },
        {
          key: 'isActive',
          label: 'Active',
          type: 'boolean',
          defaultValue: true,
        },
        {
          key: 'lastLoginAt',
          label: 'Last Login',
          type: 'datetime',
          readonly: true,
        },
      ],
    },
  ],
};

// List page.
export const usersListConfig: ListPageConfig & {
  dataSource: DataSourceConfig;
} = {
  pageId: 'users',
  pageType: 'card',
  title: 'Users',
  dataSource: {
    endpoint: '/users',
    keyField: 'systemId',
    defaultSort: 'userName asc',
    pageSize: 25,
  },
  identity: {
    primaryField: 'userName',
    secondaryField: 'name',
  },
  module: 'Administration',
  menu: {
    module: 'Administration',
    group: 'Setup',
    icon: 'ts-icon ts-icon-users',
    moduleIcon: 'ts-icon ts-icon-administration-module',
    route: '/users',
  },
  dataSurface: {
    columns: listColumns(usersHeaderConfig, [
      {
        field: 'userName',
      },
      {
        field: 'name',
      },
      {
        field: 'email',
      },
      {
        field: 'isActive',
      },
      {
        field: 'lastLoginAt',
      },
    ]),
  },
  factBox: usersFactBoxConfig,
};
