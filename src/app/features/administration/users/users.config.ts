import {
  DataSourceConfig,
  HeaderConfig,
  LineConfig,
  ListPageConfig,
  listColumns,
} from '../../../platform/public-api';
import { usersFactBoxConfig } from './users.factbox.config';

// Header form.
export const usersHeaderConfig: HeaderConfig = {
  dialogTitle: 'User',
  toolbarButtons: [
    {
      label: 'Company Access',
      actionKey: 'cmd:company-access',
      surface: 'header',
      icon: 'ts-icon ts-icon-building',
      isPrimary: true,
      order: 40,
      runModalPageId: 'user-company-access',
      runModalTarget: 'entry',
      runModalRecord: {
        source: 'header',
        fields: {
          userName: 'userName',
          name: 'name',
        },
      },
    },
  ],
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

// Permission Set assignments use the normal shared line CRUD flow.
export const usersLineConfig: LineConfig = {
  placement: {
    mode: 'after-section',
    afterSectionId: 'general',
  },
  dataSource: {
    endpoint: '/userPermissionSets',
    keyField: 'systemId',
    headerPKProp: 'userName',
    lineFKProp: 'userName',
  },
  editable: true,
  toolbarButtons: [
    {
      label: 'Open Permission Set',
      actionKey: 'cmd:open-permission-set',
      surface: 'line',
      icon: 'ts-icon ts-icon-arrow',
      isPrimary: true,
      order: 25,
      requireSelection: true,
      runModalPageId: 'permission-sets',
      runModalTarget: 'entry',
      runModalRecord: {
        source: 'activeLine',
        fields: {
          code: 'permissionSetCode',
        },
      },
    },
  ],
  columns: [
    {
      id: 'permissionSetCode',
      label: 'Permission Set Code',
      type: 'lookup',
      required: true,
      optionsDataKey: '__permissionSetCodeOptions',
      lookup: {
        endpoint: '/permissionSets',
        valueField: 'code',
        displayField: 'code',
        recordRead: 'collection',
      },
      width: '190px',
    },
    {
      id: 'permissionSetName',
      field: 'permissionSetCode',
      label: 'Name',
      type: 'lookup',
      readonly: true,
      optionsDataKey: '__permissionSetNameOptions',
      lookup: {
        endpoint: '/permissionSets',
        valueField: 'code',
        displayField: 'name',
        recordRead: 'collection',
      },
      width: '240px',
    },
    {
      id: 'companyCode',
      label: 'Company scope (blank = All companies)',
      type: 'lookup',
      lookup: {
        endpoint: '/permissionCompanies',
        recordRead: 'collection',
        valueField: 'code',
        displayField: 'name',
      },
      width: '260px',
    },
    {
      id: 'isActive',
      label: 'Active',
      type: 'boolean',
      defaultValue: true,
      width: '100px',
    },
  ],
};
