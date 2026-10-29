import { DataSourceConfig, HeaderConfig, ListPageConfig, LineConfig } from '../../../platform/public-api';
const defaultDimensionPrioritiesDataSource: DataSourceConfig = {
  endpoint: '/sourceCodes',
  keyField: 'systemId',
  navigation: {
    parentEndpoint: '/sourceCodes',
    parentIdFields: ['systemId'],
    childCollection: 'defaultDimensionPriorities',
  },
  pageSize: 20,
};

export const defaultDimensionPrioritiesListConfig: ListPageConfig & {
  dataSource: DataSourceConfig;
} = {
  pageId: 'default-dimension-priorities',
  pageType: 'worksheet',
  autoSave: true,
  title: 'Default Dimension Priorities',
  module: 'Administration',
  permissionPageId: 'source-codes-lines',
  identity: {
    primaryField: 'code',
    secondaryField: 'description',
  },
  dataSource: defaultDimensionPrioritiesDataSource,
  tools: {
    search: false,
    filter: false,
    columns: false,
    export: false,
  },
  factBox: {
    enabled: true,
  },
};
export const defaultDimensionPrioritiesHeaderConfig: HeaderConfig = {
  dialogTitle: 'Default Dimension Priorities',
  toolbarButtons: [],
  sections: [],
};
export const defaultDimensionPrioritiesLineConfig: LineConfig = {
  permissionPageId: 'source-codes-lines',
  placement: {
    mode: 'end',
  },
  dataSource: defaultDimensionPrioritiesDataSource,
  toolbarButtons: [],
  columns: [
    {
      cellType: 'select',
      id: 'sourceType',
      label: 'Source Type',
      valueType: 'text',
      required: true,
      readonlyAfterCreate: true,
      options: [
        {
          value: 'gl_account',
          label: 'Gl account',
        },
        {
          value: 'vendor',
          label: 'Vendor',
        },
        {
          value: 'item',
          label: 'Item',
        },
        {
          value: 'customer',
          label: 'Customer',
        },
        {
          value: 'bank_account',
          label: 'Bank account',
        },
      ],
    },
    {
      id: 'priority',
      label: 'Priority',
      valueType: 'integer',
      required: true,
      validation: {
        min: 1,
        max: 2147483647,
      },
    },
    {
      id: 'isActive',
      label: 'Is Active',
      valueType: 'boolean',
      defaultValue: true,
    },
  ],
};
