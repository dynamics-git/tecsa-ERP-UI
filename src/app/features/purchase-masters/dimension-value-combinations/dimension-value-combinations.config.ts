import {
  DataSourceConfig,
  HeaderConfig,
  LineConfig,
  ListPageConfig,
} from '../../../platform/public-api';
import { dimensionValueCombinationsFactBoxConfig } from './dimension-value-combinations.factbox.config';
const dimensionValueCombinationsDataSource: DataSourceConfig = {
  endpoint: '/dimensionCombinations',
  keyField: 'systemId',
  navigation: {
    parentEndpoint: '/dimensionCombinations',
    parentIdFields: ['systemId'],
    childCollection: 'valueCombinations',
  },
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
    primaryField: '__display_dimension1Id',
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
      id: 'dimension1ValueId',
      label: 'Dimension1 Value',
      type: 'lookup',
      valueType: 'guid',
      required: true,
      readonlyAfterCreate: true,
      lookup: {
        endpoint: '/dimensions/{dimension1Id}/values',
        valueField: 'systemId',
        displayField: 'code',
        searchFields: ['code', 'name'],
        recordRead: 'collection',
        dependsOn: [
          {
            field: 'dimension1Id',
            valueFrom: 'dimension1Id',
            in: 'path',
            source: 'header',
          },
        ],
      },
      displayFormat: '[code] — [name]',
    },
    {
      id: 'dimension2ValueId',
      label: 'Dimension2 Value',
      type: 'lookup',
      valueType: 'guid',
      required: true,
      readonlyAfterCreate: true,
      lookup: {
        endpoint: '/dimensions/{dimension2Id}/values',
        valueField: 'systemId',
        displayField: 'code',
        searchFields: ['code', 'name'],
        recordRead: 'collection',
        dependsOn: [
          {
            field: 'dimension2Id',
            valueFrom: 'dimension2Id',
            in: 'path',
            source: 'header',
          },
        ],
      },
      displayFormat: '[code] — [name]',
    },
    {
      id: 'isBlocked',
      label: 'Is Blocked',
      type: 'boolean',
      defaultValue: true,
    },
    {
      id: 'dimension1Id',
      label: 'Dimension1',
      type: 'lookup',
      valueType: 'guid',
      defaultValue: null,
      readonly: true,
      lookup: {
        endpoint: '/dimensions',
        valueField: 'systemId',
        displayField: 'code',
        searchFields: ['code', 'name'],
      },
      displayFormat: '[code] — [name]',
    },
    {
      id: 'dimension2Id',
      label: 'Dimension2',
      type: 'lookup',
      valueType: 'guid',
      defaultValue: null,
      readonly: true,
      lookup: {
        endpoint: '/dimensions',
        valueField: 'systemId',
        displayField: 'code',
        searchFields: ['code', 'name'],
      },
      displayFormat: '[code] — [name]',
    },
  ],
};
