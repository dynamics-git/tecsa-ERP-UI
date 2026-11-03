import {
  DataSourceConfig,
  HeaderConfig,
  LineConfig,
  ListPageConfig,
  listColumns,
} from '../../../platform/public-api';
import { permissionSetsFactBoxConfig } from './permission-sets.factbox.config';

// Header form.
export const permissionSetsHeaderConfig: HeaderConfig = {
  dialogTitle: 'Permission Set',
  toolbarButtons: [
    {
      label: 'Page Permissions',
      actionKey: 'cmd:page-permissions',
      surface: 'header',
      order: 50,
      isPrimary: true,
      runModalPageId: 'page-permissions',
      runModalTarget: 'entry',
      runModalRecord: {
        source: 'header',
        fields: {
          code: 'code',
          name: 'name',
          isSystem: 'isSystem',
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
          key: 'code',
          label: 'Code',
          type: 'code',
          required: true,
          readonlyAfterCreate: true,
          readonlyWhen: {
            field: 'isSystem',
            values: [true],
          },
          validation: {
            maxLength: 30,
          },
        },
        {
          key: 'name',
          label: 'Name',
          type: 'text',
          required: true,
          readonlyWhen: {
            field: 'isSystem',
            values: [true],
          },
          validation: {
            maxLength: 100,
          },
        },
        {
          key: 'description',
          label: 'Description',
          type: 'textarea',
          readonlyWhen: {
            field: 'isSystem',
            values: [true],
          },
          validation: {
            maxLength: 255,
          },
        },
        {
          key: 'assignable',
          label: 'Assignable',
          type: 'boolean',
          defaultValue: true,
          readonlyWhen: {
            field: 'isSystem',
            values: [true],
          },
        },
        {
          key: 'isActive',
          label: 'Active',
          type: 'boolean',
          defaultValue: true,
          readonlyWhen: {
            field: 'isSystem',
            values: [true],
          },
        },
        {
          key: 'isSystem',
          label: 'System Owned',
          type: 'boolean',
          readonly: true,
          defaultValue: false,
        },
      ],
    },
  ],
};

// List page.
export const permissionSetsListConfig: ListPageConfig & {
  dataSource: DataSourceConfig;
} = {
  pageId: 'permission-sets',
  pageType: 'document',
  title: 'Permission Sets',
  dataSource: {
    endpoint: '/permissionSets',
    keyField: 'systemId',
    headerPKProp: 'code',
    defaultSort: 'code asc',
    pageSize: 25,
    supportsCreate: true,
    supportsUpdate: true,
    supportsDelete: false,
    writableStates: {
      field: 'isSystem',
      values: [false],
    },
  },
  identity: {
    primaryField: 'code',
    secondaryField: 'name',
  },
  module: 'Administration',
  menu: {
    module: 'Administration',
    group: 'Setup',
    icon: 'ts-icon ts-icon-settings',
    moduleIcon: 'ts-icon ts-icon-administration-module',
    route: '/permission-sets',
  },
  dataSurface: {
    columns: listColumns(permissionSetsHeaderConfig, [
      {
        field: 'code',
      },
      {
        field: 'name',
      },
      {
        field: 'description',
      },
      {
        field: 'assignable',
      },
      {
        field: 'isActive',
      },
      {
        field: 'isSystem',
      },
    ]),
  },
  factBox: permissionSetsFactBoxConfig,
};

// Resource permissions use the same line relation and autosave as PR.
export const permissionSetsLineConfig: LineConfig = {
  placement: {
    mode: 'after-section',
    afterSectionId: 'general',
  },
  dataSource: {
    endpoint: '/permissionSetPermissions',
    keyField: 'systemId',
    headerPKProp: 'code',
    lineFKProp: 'permissionSetCode',
  },
  editable: true,
  columns: [
    {
      id: 'resource',
      label: 'Resource',
      type: 'lookup',
      required: true,
      lookup: {
        endpoint: '/permissionResources',
        valueField: 'resource',
        displayField: 'resource',
        recordRead: 'collection',
      },
      width: '260px',
    },
    {
      id: 'canRead',
      label: 'Read',
      type: 'boolean',
      defaultValue: false,
      width: '100px',
    },
    {
      id: 'canCreate',
      label: 'Create',
      type: 'boolean',
      defaultValue: false,
      width: '100px',
    },
    {
      id: 'canModify',
      label: 'Modify',
      type: 'boolean',
      defaultValue: false,
      width: '100px',
    },
    {
      id: 'canDelete',
      label: 'Delete',
      type: 'boolean',
      defaultValue: false,
      width: '100px',
    },
    {
      id: 'canExecute',
      label: 'Execute',
      type: 'boolean',
      defaultValue: false,
      width: '100px',
    },
  ],
};
