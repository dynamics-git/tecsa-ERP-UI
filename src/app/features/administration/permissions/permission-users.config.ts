import { DataSourceConfig, HeaderConfig, ListPageConfig, listColumns } from '../../../platform/public-api';

export const permissionUsersHeaderConfig: HeaderConfig = {
  dialogTitle: 'ERP User',
  toolbarButtons: [],
  sections: [{
    id: 'user',
    title: 'User Information',
    fields: [
      { key: 'userName', label: 'User ID', required: true, readonlyAfterCreate: true, validation: { maxLength: 100 } },
      { key: 'name', label: 'Full Name', required: true, validation: { maxLength: 150 } },
      { key: 'email', label: 'Login Email', required: true, type: 'email', validation: { maxLength: 255 } },
      { key: 'isActive', label: 'Active', type: 'boolean' },
      { key: 'lastLoginAt', label: 'Last Login', readonly: true, type: 'datetime' },
    ],
  }],
};

export const permissionUsersListConfig: ListPageConfig & { dataSource: DataSourceConfig } = {
  pageId: 'permission-users',
  pageType: 'card',
  title: 'ERP Users',
  module: 'Administration',
  menu: {
    module: 'Administration', group: 'Security',
    route: '/permission-users', icon: 'ts-icon ts-icon-users',
    moduleIcon: 'ts-icon ts-icon-administration-module',
  },
  identity: { primaryField: 'userName', secondaryField: 'name' },
  dataSource: {
    endpoint: '/users', keyField: 'systemId', documentNoField: 'userName',
    defaultSort: 'userName asc', pageSize: 25, supportsCreate: false, supportsDelete: false,
  },
  standardActions: { new: false, delete: false },
  commands: [
    { label: 'Create User', actionKey: 'create-user', group: 'New', order: 10, icon: 'ts-icon ts-icon-plus' },
    {
      label: 'Company / Role Access', actionKey: 'manage-access', group: 'Process',
      order: 30, requireSelection: true, selectionMode: 'single', icon: 'ts-icon ts-icon-users',
    },
  ],
  dataSurface: {
    idField: 'systemId',
    columns: listColumns(permissionUsersHeaderConfig, ['userName', 'name', 'email', 'isActive', 'lastLoginAt']),
  },
};
