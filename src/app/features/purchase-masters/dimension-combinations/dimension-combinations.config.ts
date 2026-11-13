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
      runModalRecord: {
        source: 'header',
        fields: {
          dimension1Code: 'dimension1Code',
          dimension2Code: 'dimension2Code',
        },
      },
    },
  ],
  sections: [
    {
      id: 'general',
      title: 'General',
      fields: [
        {
          key: 'combinationRestriction',
          label: 'Combination Type',
          type: 'dropdown',
          defaultValue: 0,
          options: [
            {
              label: 'Limited',
              value: 0,
            },
            {
              label: 'Blocked',
              value: 1,
            },
          ],
          valueType: 'integer',
        },
      ],
    },
    {
      id: 'posting',
      title: 'Posting & Defaults',
      fields: [
        {
          key: 'dimension1Code',
          label: 'Dimension1',
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
          key: 'dimension2Code',
          label: 'Dimension2',
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
    defaultSort: 'dimension1Code asc',
  },
  identity: {
    primaryField: '__display_dimension1Code',
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
        field: 'dimension1Code',
      },
      {
        field: 'dimension2Code',
        width: '140px',
      },
      {
        field: 'combinationRestriction',
        width: '140px',
      },
      {
        field: 'systemModifiedAt',
      },
    ]),
  },
  factBox: dimensionCombinationsFactBoxConfig,
};
