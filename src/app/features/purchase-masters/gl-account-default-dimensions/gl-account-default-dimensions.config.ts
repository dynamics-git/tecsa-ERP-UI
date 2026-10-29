import { DataSourceConfig, HeaderConfig, ListPageConfig, LineConfig } from '../../../platform/public-api';
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

export const glAccountDefaultDimensionsListConfig: ListPageConfig & {
  dataSource: DataSourceConfig;
} = {
  pageId: 'gl-account-default-dimensions',
  pageType: 'worksheet',
  autoSave: true,
  title: 'G/L Account Dimensions',
  module: 'Finance',
  permissionPageId: 'gl-accounts-lines',
  identity: {
    primaryField: 'number',
    secondaryField: 'name',
  },
  dataSource: glAccountDefaultDimensionsDataSource,
  tools: {
    search: false,
    filter: false,
    columns: false,
    export: false,
  },
  factBox: {
    enabled: true,
  },
};
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
export const glAccountDefaultDimensionsLineConfig: LineConfig = {
  permissionPageId: 'gl-accounts-lines',
  placement: {
    mode: 'end',
  },
  dataSource: glAccountDefaultDimensionsDataSource,
  toolbarButtons: [],
  columns: [
    {
      id: 'dimensionId',
      label: 'Dimension',
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
      cellType: 'dropdown',
    },
    {
      id: 'dimensionValueId',
      label: 'Dimension Value',
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
      cellType: 'dropdown',
    },
    {
      cellType: 'select',
      id: 'valuePosting',
      label: 'Value Posting',
      valueType: 'text',
      defaultValue: 'optional',
      options: [
        {
          value: 'optional',
          label: 'Optional',
        },
        {
          value: 'code_mandatory',
          label: 'Code mandatory',
        },
        {
          value: 'same_code',
          label: 'Same code',
        },
        {
          value: 'no_code',
          label: 'No code',
        },
      ],
    },
  ],
};
