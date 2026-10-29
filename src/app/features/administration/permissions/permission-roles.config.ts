import { DataSourceConfig, HeaderConfig, ListPageConfig, listColumns } from '../../../platform/public-api';

export const permissionRolesHeaderConfig: HeaderConfig = {
  dialogTitle: 'Permission Set',
  toolbarButtons: [],
  sections: [{
    id: 'general',
    title: 'General',
    fields: [
      { key: 'code', label: 'Role Code', valueType: 'code', required: true, readonlyAfterCreate: true, validation: { maxLength: 30 } },
      { key: 'name', label: 'Role Name', required: true, validation: { maxLength: 100 } },
      { key: 'description', label: 'Description', validation: { maxLength: 255 }, width: 'wide' },
      { key: 'assignable', label: 'Assignable to Users', type: 'boolean', defaultValue: true },
      { key: 'isSystem', label: 'System Role', readonly: true, type: 'boolean' },
      { key: 'isActive', label: 'Active', type: 'boolean', defaultValue: true },
    ],
  }],
};

export const permissionRolesListConfig: ListPageConfig & { dataSource: DataSourceConfig } = {
  pageId: 'permission-roles',
  pageType: 'card',
  title: 'Permission Sets',
  autoSave: false,
  module: 'Administration',
  menu: {
    module: 'Administration', group: 'Security',
    icon: 'ts-icon ts-icon-shield', moduleIcon: 'ts-icon ts-icon-administration-module',
    route: '/permission-roles',
  },
  identity: { primaryField: 'code', secondaryField: 'name' },
  dataSource: {
    endpoint: '/permissionSets',
    keyField: 'systemId',
    documentNoField: 'code',
    defaultSort: 'code asc',
    pageSize: 25,
    supportsDelete: false,
  },
  standardActions: { delete: false },
  commands: [{
    label: 'Page / Resource Permissions',
    actionKey: 'manage-permissions',
    permissionOperation: 'modify',
    group: 'Process',
    requireSelection: true,
    selectionMode: 'single',
    order: 40,
    icon: 'ts-icon ts-icon-shield',
  }],
  dataSurface: {
    idField: 'systemId',
    columns: listColumns(permissionRolesHeaderConfig, ['code', 'name', 'description', 'assignable', 'isActive', 'isSystem']),
  },
};
