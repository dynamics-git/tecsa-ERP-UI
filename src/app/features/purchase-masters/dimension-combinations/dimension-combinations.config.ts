import {
  DataSourceConfig,
  HeaderConfig,
  ListPageConfig,
  listColumns,
} from '../../../platform/public-api';
import { dimensionCombinationsFactBoxConfig } from './dimension-combinations.factbox.config';

// Header form.
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
          type: 'dropdown',
          defaultValue: 'no_limitation',
          required: true,
          options: [
            {
              label: 'No limitation',
              value: 'no_limitation',
            },
            {
              label: 'Limited',
              value: 'limited',
            },
            {
              label: 'Blocked',
              value: 'blocked',
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

// List page.
export const dimensionCombinationsListConfig: ListPageConfig & {
  dataSource: DataSourceConfig;
} = {
  pageId: 'dimension-combinations',
  pageType: 'card',
  title: 'Dimension Combinations',
  dataSource: {
    endpoint: '/dimensionCombinations',
    keyField: 'systemId',
    defaultSort: 'dimension1Id asc',
  },
  identity: {
    primaryField: '__display_dimension1Id',
  },
  module: 'Finance',
  menu: {
    module: 'Finance',
    group: 'Dimensions',
    icon: 'ts-icon ts-icon-dimension-combinations',
    moduleIcon: 'ts-icon ts-icon-finance-module',
    route: '/dimension-combinations',
  },
  dataSurface: {
    columns: listColumns(dimensionCombinationsHeaderConfig, [
      {
        field: 'dimension1Id',
      },
      {
        field: 'dimension2Id',
        width: '140px',
      },
      {
        field: 'combinationType',
        width: '140px',
      },
      {
        field: 'systemModifiedAt',
      },
    ]),
  },
  factBox: dimensionCombinationsFactBoxConfig,
};
