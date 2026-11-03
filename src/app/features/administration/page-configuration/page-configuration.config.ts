import {
  DataSourceConfig,
  HeaderConfig,
  LineConfig,
  ListPageConfig,
  listColumns,
} from '../../../platform/public-api';
import { pageConfigurationFactBoxConfig } from './page-configuration.factbox.config';

// Generated from page configs; this catalogue is read-only.
export const pageConfigurationHeaderConfig: HeaderConfig = {
  dialogTitle: 'Page Configuration',
  toolbarButtons: [],
  sections: [
    {
      id: 'general',
      title: 'General',
      fields: [
        {
          key: 'pageId',
          label: 'Page ID',
          type: 'text',
          readonly: true,
        },
        {
          key: 'title',
          label: 'Page Name',
          type: 'text',
          readonly: true,
        },
        {
          key: 'module',
          label: 'Module',
          type: 'text',
          readonly: true,
        },
        {
          key: 'pageType',
          label: 'Page Type',
          type: 'text',
          readonly: true,
        },
        {
          key: 'route',
          label: 'Menu URL',
          type: 'text',
          readonly: true,
        },
        {
          key: 'endpoint',
          label: 'Data Source',
          type: 'text',
          readonly: true,
        },
      ],
    },
  ],
};

export const pageConfigurationListConfig: ListPageConfig & {
  dataSource: DataSourceConfig;
} = {
  pageId: 'page-configuration',
  permissionPageId: 'permission-sets',
  pageType: 'document',
  title: 'Page Configuration',
  dataSource: {
    endpoint: '/uiCatalog/pages',
    keyField: 'systemId',
    defaultSort: 'module asc,title asc',
    pageSize: 50,
    supportsCreate: false,
    supportsUpdate: false,
    supportsDelete: false,
  },
  identity: {
    primaryField: 'title',
    secondaryField: 'pageId',
  },
  module: 'Administration',
  menu: {
    module: 'Administration',
    group: 'Setup',
    icon: 'ts-icon ts-icon-settings',
    moduleIcon: 'ts-icon ts-icon-administration-module',
    route: '/page-configuration',
  },
  dataSurface: {
    columns: listColumns(pageConfigurationHeaderConfig, [
      {
        field: 'pageId',
      },
      {
        field: 'title',
      },
      {
        field: 'module',
      },
      {
        field: 'pageType',
      },
      {
        field: 'route',
      },
      {
        field: 'endpoint',
      },
    ]),
  },
  factBox: pageConfigurationFactBoxConfig,
};

// Each page exposes its header/line fields and standard/configured buttons.
export const pageConfigurationLineConfig: LineConfig = {
  placement: {
    mode: 'after-section',
    afterSectionId: 'general',
  },
  editable: false,
  dataSource: {
    endpoint: '/uiCatalog/pages',
    keyField: 'systemId',
    navigation: {
      parentEndpoint: '/uiCatalog/pages',
      parentIdFields: ['systemId'],
      childCollection: 'controls',
    },
    defaultSort: 'targetType asc,surface asc,label asc',
    supportsCreate: false,
    supportsUpdate: false,
    supportsDelete: false,
  },
  columns: [
    {
      id: 'targetType',
      label: 'Control',
      type: 'text',
      readonly: true,
      width: '130px',
    },
    {
      id: 'surface',
      label: 'Area',
      type: 'text',
      readonly: true,
      width: '120px',
    },
    {
      id: 'label',
      label: 'Name',
      type: 'text',
      readonly: true,
      width: '220px',
    },
    {
      id: 'targetKey',
      label: 'Button / Field Key',
      type: 'text',
      readonly: true,
      width: '220px',
    },
    {
      id: 'endpoint',
      label: 'Data Source',
      type: 'text',
      readonly: true,
      width: '280px',
    },
  ],
};
