import {
  DataSourceConfig,
  HeaderConfig,
  LineConfig,
  ListPageConfig,
} from '../../../platform/public-api';
import { vendorDefaultDimensionsFactBoxConfig } from './vendor-default-dimensions.factbox.config';
const vendorDefaultDimensionsDataSource: DataSourceConfig = {
  endpoint: '/vendors',
  keyField: 'systemId',
  navigation: {
    parentEndpoint: '/vendors',
    parentIdFields: ['systemId'],
    childCollection: 'defaultDimensions',
  },
  pageSize: 20,
};

// Header form.
export const vendorDefaultDimensionsHeaderConfig: HeaderConfig = {
  dialogTitle: 'Vendor Dimensions',
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
export const vendorDefaultDimensionsListConfig: ListPageConfig & {
  dataSource: DataSourceConfig;
} = {
  pageId: 'vendor-default-dimensions',
  pageType: 'worksheet',
  title: 'Vendor Dimensions',
  dataSource: vendorDefaultDimensionsDataSource,
  identity: {
    primaryField: 'number',
    secondaryField: 'name',
  },
  module: 'Purchase',
  permissionPageId: 'vendors-lines',
  tools: {
    search: false,
    filter: false,
    columns: false,
    export: false,
  },
  factBox: vendorDefaultDimensionsFactBoxConfig,
};

// Document lines.
export const vendorDefaultDimensionsLineConfig: LineConfig = {
  placement: {
    mode: 'end',
  },
  dataSource: vendorDefaultDimensionsDataSource,
  permissionPageId: 'vendors-lines',
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
