import {
  DataSourceConfig,
  HeaderConfig,
  LineConfig,
  ListPageConfig,
} from '../../../platform/public-api';
import { dimensionValuesFactBoxConfig } from './dimension-values.factbox.config';
const dimensionValuesDataSource: DataSourceConfig = {
  keyField: 'systemId',
  endpoint: '/dimensionValues',
  headerPKProp: 'code',
  lineFKProp: 'dimensionCode',
  defaultSort: 'code asc',
  pageSize: 20,
};

// Header form.
export const dimensionValuesHeaderConfig: HeaderConfig = {
  dialogTitle: 'Dimension Values',
  toolbarButtons: [],
  sections: [],
};

// List page.
export const dimensionValuesListConfig: ListPageConfig & {
  dataSource: DataSourceConfig;
} = {
  pageId: 'dimension-values',
  pageType: 'worksheet',
  title: 'Dimension Values',
  dataSource: dimensionValuesDataSource,
  identity: {
    primaryField: 'code',
    secondaryField: 'name',
  },
  module: 'Finance',
  permissionPageId: 'dimensions-lines',
  tools: {
    search: false,
    filter: false,
    columns: false,
    export: false,
  },
  factBox: dimensionValuesFactBoxConfig,
};

// Document lines.
export const dimensionValuesLineConfig: LineConfig = {
  placement: {
    mode: 'end',
  },
  dataSource: dimensionValuesDataSource,
  permissionPageId: 'dimensions-lines',
  toolbarButtons: [],
  columns: [
    {
      id: 'code',
      label: 'Code',
      type: 'code',
      required: true,
      validation: {
        maxLength: 20,
      },
      readonlyAfterCreate: true,
    },
    {
      id: 'name',
      label: 'Name',
      type: 'text',
      validation: {
        maxLength: 50,
      },
    },
  ],
};
