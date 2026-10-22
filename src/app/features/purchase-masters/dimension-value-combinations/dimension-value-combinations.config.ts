import { DataSourceConfig, HeaderConfig, ListPageConfig, LineConfig } from '../../../platform/public-api';
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

export const dimensionValueCombinationsListConfig: ListPageConfig & {
  dataSource: DataSourceConfig;
} = {
  pageId: 'dimension-value-combinations',
  pageType: 'worksheet',
  autoSave: true,
  title: 'Dimension Value Combinations',
  module: 'Finance',
  permissionPageId: 'dimension-combinations-lines',
  identity: {
    primaryField: '__display_dimension1Id',
  },
  dataSource: dimensionValueCombinationsDataSource,
  tools: {
    search: false,
    filter: false,
    columns: false,
    export: false,
  },
  factBox: {
    enabled: false,
  },
};
export const dimensionValueCombinationsHeaderConfig: HeaderConfig = {
  dialogTitle: 'Dimension Value Combinations',
  toolbarButtons: [],
  sections: [],
};
export const dimensionValueCombinationsLineConfig: LineConfig = {
  permissionPageId: 'dimension-combinations-lines',
  placement: {
    mode: 'end',
  },
  lineKeyField: 'systemId',
  dataSource: dimensionValueCombinationsDataSource,
  toolbarButtons: [],
  columns: [
    {
      id: 'dimension1ValueId',
      label: 'Dimension1 Value',
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
      cellType: 'dropdown',
    },
    {
      id: 'dimension2ValueId',
      label: 'Dimension2 Value',
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
      cellType: 'dropdown',
    },
    {
      id: 'isBlocked',
      label: 'Is Blocked',
      valueType: 'boolean',
      defaultValue: true,
    },
    {
      id: 'dimension1Id',
      label: 'Dimension1',
      valueType: 'guid',
      readonly: true,
      defaultValue: null,
      lookup: {
        endpoint: '/dimensions',
        valueField: 'systemId',
        displayField: 'code',
        searchFields: ['code', 'name'],
      },
      displayFormat: '[code] — [name]',
      cellType: 'dropdown',
    },
    {
      id: 'dimension2Id',
      label: 'Dimension2',
      valueType: 'guid',
      readonly: true,
      defaultValue: null,
      lookup: {
        endpoint: '/dimensions',
        valueField: 'systemId',
        displayField: 'code',
        searchFields: ['code', 'name'],
      },
      displayFormat: '[code] — [name]',
      cellType: 'dropdown',
    },
  ],
};
