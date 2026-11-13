import {
  DataSourceConfig,
  HeaderConfig,
  LineConfig,
  ListPageConfig,
} from '../../../platform/public-api';
import { glAccountDefaultDimensionsFactBoxConfig } from './gl-account-default-dimensions.factbox.config';
const glAccountDefaultDimensionsDataSource: DataSourceConfig = {
  keyField: 'systemId',
  endpoint: '/defaultDimensions',
  headerPKProp: 'number',
  lineFKProp: 'number',
  parentFixedFields: {
    tableId: 7000270,
  },
  defaultSort: 'dimensionCode asc',
  pageSize: 20,
};

// Header form.
export const glAccountDefaultDimensionsHeaderConfig: HeaderConfig = {
  dialogTitle: 'G/L Account Dimensions',
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
export const glAccountDefaultDimensionsListConfig: ListPageConfig & {
  dataSource: DataSourceConfig;
} = {
  pageId: 'gl-account-default-dimensions',
  pageType: 'worksheet',
  title: 'G/L Account Dimensions',
  dataSource: glAccountDefaultDimensionsDataSource,
  identity: {
    primaryField: 'number',
    secondaryField: 'name',
  },
  module: 'Finance',
  permissionPageId: 'gl-accounts-lines',
  tools: {
    search: false,
    filter: false,
    columns: false,
    export: false,
  },
  factBox: glAccountDefaultDimensionsFactBoxConfig,
};

// Document lines.
export const glAccountDefaultDimensionsLineConfig: LineConfig = {
  placement: {
    mode: 'end',
  },
  dataSource: glAccountDefaultDimensionsDataSource,
  permissionPageId: 'gl-accounts-lines',
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
