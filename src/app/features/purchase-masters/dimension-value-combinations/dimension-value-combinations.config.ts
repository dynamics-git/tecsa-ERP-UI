import {
  DataSourceConfig,
  HeaderConfig,
  LineConfig,
  ListPageConfig,
} from '../../../platform/public-api';
import { dimensionValueCombinationsFactBoxConfig } from './dimension-value-combinations.factbox.config';
const dimensionValueCombinationsDataSource: DataSourceConfig = {
  keyField: 'systemId',
  endpoint: '/dimensionValueCombinations',
  headerPKProp: 'dimension1Code',
  lineFKProp: 'dimension1Code',
  parentFieldMap: {
    dimension2Code: 'dimension2Code',
  },
  defaultSort: 'dimension1ValueCode asc,dimension2ValueCode asc',
  pageSize: 20,
};

// Header form.
export const dimensionValueCombinationsHeaderConfig: HeaderConfig = {
  dialogTitle: 'Dimension Value Combinations',
  toolbarButtons: [],
  sections: [],
};

// List page.
export const dimensionValueCombinationsListConfig: ListPageConfig & {
  dataSource: DataSourceConfig;
} = {
  pageId: 'dimension-value-combinations',
  pageType: 'worksheet',
  title: 'Dimension Value Combinations',
  dataSource: dimensionValueCombinationsDataSource,
  identity: {
    primaryField: '__display_dimension1Code',
  },
  module: 'Finance',
  permissionPageId: 'dimension-combinations-lines',
  tools: {
    search: false,
    filter: false,
    columns: false,
    export: false,
  },
  factBox: dimensionValueCombinationsFactBoxConfig,
};

// Document lines.
export const dimensionValueCombinationsLineConfig: LineConfig = {
  placement: {
    mode: 'end',
  },
  dataSource: dimensionValueCombinationsDataSource,
  permissionPageId: 'dimension-combinations-lines',
  toolbarButtons: [],
  columns: [
    {
      id: 'dimension1ValueCode',
      label: 'Dimension1 Value',
      type: 'lookup',
      valueType: 'code',
      required: true,
      readonlyAfterCreate: true,
      lookup: {
        endpoint: '/dimensionValues',
        valueField: 'code',
        displayField: 'code',
        searchFields: ['code', 'name'],
        recordRead: 'collection',
        dependsOn: [
          {
            field: 'dimensionCode',
            valueFrom: 'dimension1Code',
            in: 'filter',
            source: 'header',
          },
        ],
        filter: 'blocked eq false',
      },
      displayFormat: '[code] — [name]',
      validation: {
        maxLength: 20,
      },
      defaultValue: '',
    },
    {
      id: 'dimension2ValueCode',
      label: 'Dimension2 Value',
      type: 'lookup',
      valueType: 'code',
      required: true,
      readonlyAfterCreate: true,
      lookup: {
        endpoint: '/dimensionValues',
        valueField: 'code',
        displayField: 'code',
        searchFields: ['code', 'name'],
        recordRead: 'collection',
        dependsOn: [
          {
            field: 'dimensionCode',
            valueFrom: 'dimension2Code',
            in: 'filter',
            source: 'header',
          },
        ],
        filter: 'blocked eq false',
      },
      displayFormat: '[code] — [name]',
      validation: {
        maxLength: 20,
      },
      defaultValue: '',
    },

    {
      id: 'dimension1Code',
      label: 'Dimension1',
      type: 'lookup',
      valueType: 'code',
      defaultValue: '',
      readonly: true,
      lookup: {
        endpoint: '/dimensions',
        valueField: 'code',
        displayField: 'code',
        searchFields: ['code', 'name'],
        recordRead: 'collection',
      },
      displayFormat: '[code] — [name]',
      validation: {
        maxLength: 20,
      },
      readonlyAfterCreate: true,
    },
    {
      id: 'dimension2Code',
      label: 'Dimension2',
      type: 'lookup',
      valueType: 'code',
      defaultValue: '',
      readonly: true,
      lookup: {
        endpoint: '/dimensions',
        valueField: 'code',
        displayField: 'code',
        searchFields: ['code', 'name'],
        recordRead: 'collection',
      },
      displayFormat: '[code] — [name]',
      validation: {
        maxLength: 20,
      },
      readonlyAfterCreate: true,
    },
  ],
};
