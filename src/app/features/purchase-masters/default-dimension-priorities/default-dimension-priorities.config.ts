import {
  DataSourceConfig,
  HeaderConfig,
  LineConfig,
  ListPageConfig,
} from '../../../platform/public-api';
import { defaultDimensionPrioritiesFactBoxConfig } from './default-dimension-priorities.factbox.config';
const defaultDimensionPrioritiesDataSource: DataSourceConfig = {
  keyField: 'systemId',
  endpoint: '/defaultDimensionPriorities',
  headerPKProp: 'code',
  lineFKProp: 'sourceCode',
  defaultSort: 'priority asc',
  pageSize: 20,
};

// Header form.
export const defaultDimensionPrioritiesHeaderConfig: HeaderConfig = {
  dialogTitle: 'Default Dimension Priorities',
  toolbarButtons: [],
  sections: [],
};

// List page.
export const defaultDimensionPrioritiesListConfig: ListPageConfig & {
  dataSource: DataSourceConfig;
} = {
  pageId: 'default-dimension-priorities',
  pageType: 'worksheet',
  title: 'Default Dimension Priorities',
  dataSource: defaultDimensionPrioritiesDataSource,
  identity: {
    primaryField: 'code',
    secondaryField: 'description',
  },
  module: 'Administration',
  permissionPageId: 'source-codes-lines',
  tools: {
    search: false,
    filter: false,
    columns: false,
    export: false,
  },
  factBox: defaultDimensionPrioritiesFactBoxConfig,
};

// Document lines.
export const defaultDimensionPrioritiesLineConfig: LineConfig = {
  placement: {
    mode: 'end',
  },
  dataSource: defaultDimensionPrioritiesDataSource,
  permissionPageId: 'source-codes-lines',
  toolbarButtons: [],
  columns: [
    {
      id: 'tableId',
      label: 'Table ID',
      type: 'integer',
      required: true,
      readonlyAfterCreate: true,
    },
    {
      id: 'priority',
      label: 'Priority',
      type: 'integer',
      validation: {
        min: 1,
        max: 2147483647,
      },
    },
  ],
};
