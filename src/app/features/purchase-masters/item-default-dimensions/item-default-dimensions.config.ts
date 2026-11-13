import {
  DataSourceConfig,
  HeaderConfig,
  LineConfig,
  ListPageConfig,
} from '../../../platform/public-api';
import { itemDefaultDimensionsFactBoxConfig } from './item-default-dimensions.factbox.config';
const itemDefaultDimensionsDataSource: DataSourceConfig = {
  keyField: 'systemId',
  endpoint: '/defaultDimensions',
  headerPKProp: 'number',
  lineFKProp: 'number',
  parentFixedFields: {
    tableId: 7000392,
  },
  defaultSort: 'dimensionCode asc',
  pageSize: 20,
};

// Header form.
export const itemDefaultDimensionsHeaderConfig: HeaderConfig = {
  dialogTitle: 'Item Dimensions',
  toolbarButtons: [
    {
      permissionKey: 'dimensions',
      label: 'Dimension',
      actionKey: 'cmd:open-related-master',
      icon: 'ts-icon ts-icon-dimensions',
      group: 'Related',
      runModalPageId: 'dimensions',
      runModalTarget: 'entry',
      requireSelection: true,
      runModalRecord: {
        source: 'activeLine',
        fields: {
          code: 'dimensionCode',
        },
      },
    },
  ],
  sections: [],
};

// List page.
export const itemDefaultDimensionsListConfig: ListPageConfig & {
  dataSource: DataSourceConfig;
} = {
  pageId: 'item-default-dimensions',
  pageType: 'worksheet',
  title: 'Item Dimensions',
  dataSource: itemDefaultDimensionsDataSource,
  identity: {
    primaryField: 'number',
    secondaryField: 'description',
  },
  module: 'Inventory',
  permissionPageId: 'item-default-dimensions-lines',
  tools: {
    search: false,
    filter: false,
    columns: false,
    export: false,
  },
  factBox: itemDefaultDimensionsFactBoxConfig,
};

// Document lines.
export const itemDefaultDimensionsLineConfig: LineConfig = {
  placement: {
    mode: 'end',
  },
  dataSource: itemDefaultDimensionsDataSource,
  permissionPageId: 'item-default-dimensions-lines',
  toolbarButtons: [],
  columns: [
    {
      id: 'dimensionCode',
      label: 'Dimension',
      type: 'lookup',
      valueType: 'code',
      required: true,
      readonlyAfterCreate: true,
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
      defaultValue: '',
    },
    {
      id: 'dimensionValueCode',
      label: 'Dimension Value',
      type: 'lookup',
      valueType: 'code',
      defaultValue: '',
      lookup: {
        endpoint: '/dimensionValues',
        valueField: 'code',
        displayField: 'code',
        searchFields: ['code', 'name'],
        recordRead: 'collection',
        dependsOn: [
          {
            field: 'dimensionCode',
            valueFrom: 'dimensionCode',
            in: 'filter',
          },
        ],
        filter: 'blocked eq false',
      },
      displayFormat: '[code] — [name]',
      validation: {
        maxLength: 20,
      },
    },
    {
      id: 'valuePosting',
      label: 'Value Posting',
      type: 'dropdown',
      defaultValue: 0,
      options: [
        {
          label: ' ',
          value: 0,
        },
        {
          label: 'Code Mandatory',
          value: 1,
        },
        {
          label: 'Same Code',
          value: 2,
        },
        {
          label: 'No Code',
          value: 3,
        },
      ],
      valueType: 'integer',
    },
  ],
};
