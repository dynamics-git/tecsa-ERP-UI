import {
  DataSourceConfig,
  HeaderConfig,
  LineConfig,
  ListPageConfig,
} from '../../../platform/public-api';
import { defaultDimensionPrioritiesFactBoxConfig } from './default-dimension-priorities.factbox.config';
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
      id: 'sourceType',
      label: 'Source Type',
      type: 'dropdown',
      required: true,
      readonlyAfterCreate: true,
      options: [
        {
          label: 'Gl account',
          value: 'gl_account',
        },
        {
          label: 'Vendor',
          value: 'vendor',
        },
        {
          label: 'Item',
          value: 'item',
        },
        {
          label: 'Customer',
          value: 'customer',
        },
        {
          label: 'Bank account',
          value: 'bank_account',
        },
      ],
    },
    {
      id: 'priority',
      label: 'Priority',
      type: 'integer',
      required: true,
      validation: {
        min: 1,
        max: 2147483647,
      },
    },
    {
      id: 'isActive',
      label: 'Is Active',
      type: 'boolean',
      defaultValue: true,
    },
  ],
};
