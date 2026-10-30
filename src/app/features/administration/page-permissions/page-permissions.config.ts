import {
  DataSourceConfig,
  HeaderConfig,
  LineConfig,
  ListPageConfig,
} from '../../../platform/public-api';
import { pagePermissionsFactBoxConfig } from './page-permissions.factbox.config';

const pagePermissionsDataSource: DataSourceConfig = {
  endpoint: '/pagePermissions',
  keyField: 'systemId',
  headerPKProp: 'code',
  lineFKProp: 'permissionSetCode',
  pageSize: 50,
};

// Header form.
export const pagePermissionsHeaderConfig: HeaderConfig = {
  dialogTitle: 'Page Permissions',
  toolbarButtons: [
    {
      label: 'Page Configuration',
      actionKey: 'cmd:page-configuration',
      surface: 'header',
      isPrimary: true,
      order: 50,
      runModalPageId: 'page-configuration',
      runModalTarget: 'list',
    },
  ],
  sections: [],
};

// Related worksheet, opened from the Permission Set card.
export const pagePermissionsListConfig: ListPageConfig & {
  dataSource: DataSourceConfig;
} = {
  pageId: 'page-permissions',
  pageType: 'worksheet',
  title: 'Page Permissions',
  dataSource: pagePermissionsDataSource,
  identity: {
    primaryField: 'code',
    secondaryField: 'name',
  },
  module: 'Administration',
  tools: {
    search: false,
    filter: false,
    columns: false,
    export: false,
  },
  factBox: pagePermissionsFactBoxConfig,
};

// Page, button and field rules share one table and the standard line editor.
export const pagePermissionsLineConfig: LineConfig = {
  placement: {
    mode: 'end',
  },
  dataSource: pagePermissionsDataSource,
  columns: [
    {
      id: 'pageId',
      clearFieldsOnChange: ['apiSource'],
      label: 'Page',
      type: 'lookup',
      lookup: {
        endpoint: '/uiCatalog/pages',
        valueField: 'pageId',
        displayField: 'title',
        searchFields: ['pageId', 'title'],
        recordRead: 'collection',
      },
      required: true,
      width: '200px',
    },
    {
      id: 'targetType',
      clearFieldsOnChange: ['apiSource'],
      label: 'Control',
      type: 'select',
      defaultValue: 'page',
      options: [
        { label: 'Page', value: 'page' },
        { label: 'Button', value: 'command' },
        { label: 'Field', value: 'field' },
      ],
      width: '130px',
    },
    {
      id: 'surface',
      label: 'Area',
      type: 'lookup',
      required: true,
      lookup: {
        endpoint: '/uiCatalog/areas',
        valueField: 'surface',
        displayField: 'label',
        recordRead: 'collection',
        dependsOn: [
          {
            field: 'pageId',
            valueFrom: 'pageId',
          },
          {
            field: 'targetType',
            valueFrom: 'targetType',
          },
        ],
      },
      defaultValue: 'header',
      width: '130px',
    },
    {
      id: 'targetKey',
      label: 'Button / Field',
      type: 'lookup',
      fill: { apiSource: 'apiSource' },
      lookup: {
        endpoint: '/uiCatalog/controls',
        valueField: 'targetKey',
        displayField: 'label',
        searchFields: ['targetKey', 'label'],
        recordRead: 'collection',
        dependsOn: [
          {
            field: 'pageId',
            valueFrom: 'pageId',
          },
          {
            field: 'targetType',
            valueFrom: 'targetType',
          },
          {
            field: 'surface',
            valueFrom: 'surface',
          },
        ],
      },
      defaultValue: '*',
      required: true,
      width: '210px',
    },
    {
      id: 'apiSource',
      label: 'API Source (field protection)',
      type: 'lookup',
      lookup: {
        endpoint: '/permissionSources',
        valueField: 'name',
        displayField: 'name',
        recordRead: 'collection',
      },
      width: '240px',
    },
    {
      id: 'canRead',
      label: 'View / Open',
      type: 'boolean',
      defaultValue: true,
      width: '115px',
    },
    {
      id: 'canCreate',
      label: 'Create',
      type: 'boolean',
      defaultValue: false,
      width: '90px',
    },
    {
      id: 'canModify',
      label: 'Edit',
      type: 'boolean',
      defaultValue: false,
      width: '90px',
    },
    {
      id: 'canDelete',
      label: 'Delete',
      type: 'boolean',
      defaultValue: false,
      width: '90px',
    },
    {
      id: 'canExecute',
      label: 'Execute Button',
      type: 'boolean',
      defaultValue: false,
      width: '130px',
    },
  ],
};
