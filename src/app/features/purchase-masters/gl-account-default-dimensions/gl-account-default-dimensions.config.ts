import {
  DataSourceConfig,
  HeaderConfig,
  LineConfig,
  ListPageConfig,
} from '../../../platform/public-api';
import { glAccountDefaultDimensionsFactBoxConfig } from './gl-account-default-dimensions.factbox.config';
const glAccountDefaultDimensionsDataSource: DataSourceConfig = {
  endpoint: '/glAccounts',
  keyField: 'systemId',
  navigation: {
    parentEndpoint: '/glAccounts',
    parentIdFields: ['systemId'],
    childCollection: 'defaultDimensions',
  },
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
          systemId: 'dimensionId',
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
