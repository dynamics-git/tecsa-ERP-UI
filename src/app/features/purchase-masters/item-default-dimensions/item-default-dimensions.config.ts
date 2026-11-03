import {
  DataSourceConfig,
  HeaderConfig,
  LineConfig,
  ListPageConfig,
} from '../../../platform/public-api';
import { itemDefaultDimensionsFactBoxConfig } from './item-default-dimensions.factbox.config';
const itemDefaultDimensionsDataSource: DataSourceConfig = {
  endpoint: '/items',
  keyField: 'systemId',
  navigation: {
    parentEndpoint: '/items',
    parentIdFields: ['systemId'],
    childCollection: 'defaultDimensions',
  },
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
          systemId: 'dimensionId',
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
      id: 'dimensionId',
      label: 'Dimension',
      type: 'lookup',
      valueType: 'guid',
      required: true,
      readonlyAfterCreate: true,
      lookup: {
        endpoint: '/dimensions',
        valueField: 'systemId',
        displayField: 'code',
        searchFields: ['code', 'name'],
      },
      displayFormat: '[code] — [name]',
    },
    {
      id: 'dimensionValueId',
      label: 'Dimension Value',
      type: 'lookup',
      valueType: 'guid',
      defaultValue: null,
      lookup: {
        endpoint: '/dimensions/{dimensionId}/values',
        valueField: 'systemId',
        displayField: 'code',
        searchFields: ['code', 'name'],
        recordRead: 'collection',
        dependsOn: [
          {
            field: 'dimensionId',
            valueFrom: 'dimensionId',
            in: 'path',
          },
        ],
      },
      displayFormat: '[code] — [name]',
    },
    {
      id: 'valuePosting',
      label: 'Value Posting',
      type: 'dropdown',
      defaultValue: 'optional',
      options: [
        {
          label: 'Optional',
          value: 'optional',
        },
        {
          label: 'Code mandatory',
          value: 'code_mandatory',
        },
        {
          label: 'Same code',
          value: 'same_code',
        },
        {
          label: 'No code',
          value: 'no_code',
        },
      ],
    },
  ],
};
