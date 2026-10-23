import { DataSourceConfig, HeaderConfig, ListPageConfig, LineConfig } from '../../../platform/public-api';
const dimensionValuesDataSource: DataSourceConfig = {
  endpoint: '/dimensions',
  keyField: 'systemId',
  navigation: {
    parentEndpoint: '/dimensions',
    parentIdFields: ['systemId'],
    childCollection: 'values',
  },
  pageSize: 20,
};

export const dimensionValuesListConfig: ListPageConfig & {
  dataSource: DataSourceConfig;
} = {
  pageId: 'dimension-values',
  pageType: 'worksheet',
  autoSave: true,
  title: 'Dimension Values',
  module: 'Finance',
  permissionPageId: 'dimensions-lines',
  identity: {
    primaryField: 'code',
    secondaryField: 'name',
  },
  dataSource: dimensionValuesDataSource,
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
export const dimensionValuesHeaderConfig: HeaderConfig = {
  dialogTitle: 'Dimension Values',
  toolbarButtons: [],
  sections: [],
};
export const dimensionValuesLineConfig: LineConfig = {
  permissionPageId: 'dimensions-lines',
  placement: {
    mode: 'end',
  },
  lineKeyField: 'systemId',
  dataSource: dimensionValuesDataSource,
  toolbarButtons: [],
  columns: [
    {
      id: 'code',
      label: 'Code',
      valueType: 'code',
      required: true,
      validation: {
        maxLength: 20,
      },
    },
    {
      id: 'name',
      label: 'Name',
      valueType: 'text',
      required: true,
      validation: {
        maxLength: 100,
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
