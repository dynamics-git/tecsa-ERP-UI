import { HeaderConfig, DataSourceConfig, ListPageConfig, listColumns } from '../../../platform/public-api';
export const dimensionCombinationsHeaderConfig: HeaderConfig = {
  dialogTitle: 'Dimension Combinations',
  toolbarButtons: [
    {
      permissionKey: 'dimension-combinations-lines',
      label: 'Value Combinations',
      actionKey: 'cmd:open-dimension-value-combinations',
      icon: 'ts-icon ts-icon-dimension-combinations',
      group: 'Related',
      order: 40,
      runModalPageId: 'dimension-value-combinations',
      runModalTarget: 'entry',
    },
  ],
  sections: [
    {
      id: 'general',
      title: 'General',
      fields: [
        {
          key: 'combinationType',
          label: 'Combination Type',
          type: 'select',
          valueType: 'text',
          required: true,
          defaultValue: 'no_limitation',
          options: [
            {
              value: 'no_limitation',
              label: 'No limitation',
            },
            {
              value: 'limited',
              label: 'Limited',
            },
            {
              value: 'blocked',
              label: 'Blocked',
            },
          ],
        },
      ],
    },
    {
      id: 'posting',
      title: 'Posting & Defaults',
      fields: [
        {
          key: 'dimension1Id',
          label: 'Dimension1',
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
          key: 'dimension2Id',
          label: 'Dimension2',
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
      ],
    },
  ],
};

export const dimensionCombinationsListConfig: ListPageConfig & { dataSource: DataSourceConfig } = {
  pageId: 'dimension-combinations',
  pageType: 'card',
  autoSave: true,
  title: 'Dimension Combinations',
  module: 'Finance',
  identity: {
    primaryField: '__display_dimension1Id',
  },
  menu: {
    module: 'Finance',
    group: 'Dimensions',
    icon: 'ts-icon ts-icon-dimension-combinations',
    route: '/dimension-combinations',
    moduleIcon: 'ts-icon ts-icon-finance-module',
  },
  dataSource: {
    endpoint: '/dimensionCombinations',
    keyField: 'systemId',
    defaultSort: 'dimension1Id asc',
  },
  dataSurface: {
    idField: 'systemId',
    columns: listColumns(dimensionCombinationsHeaderConfig, [
      'dimension1Id',
      { field: 'dimension2Id', width: '140px' },
      { field: 'combinationType', width: '140px' },
      'systemModifiedAt',
    ]),
  },
  factBox: { enabled: false },
};
