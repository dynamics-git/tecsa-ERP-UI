import {
  DataSourceConfig,
  HeaderConfig,
  ListPageConfig,
  listColumns,
} from '../../../platform/public-api';
import { itemChargesFactBoxConfig } from './item-charges.factbox.config';

// Header form.
export const itemChargesHeaderConfig: HeaderConfig = {
  dialogTitle: 'Item Charges',
  toolbarButtons: [],
  sections: [
    {
      id: 'general',
      title: 'General',
      fields: [
        {
          key: 'number',
          label: 'Code',
          type: 'code',
          required: true,
          validation: {
            maxLength: 20,
          },
          readonlyAfterCreate: true,
        },
        {
          key: 'description',
          label: 'Description',
          type: 'text',
          validation: {
            maxLength: 100,
          },
        },
      ],
    },
    {
      id: 'posting',
      title: 'Posting & Defaults',
      fields: [
        {
          key: 'genProdPostingGroup',
          label: 'General Product Posting Group',
          type: 'lookup',
          valueType: 'code',
          lookup: {
            endpoint: '/generalProductPostingGroups',
            valueField: 'code',
            displayField: 'code',
            searchFields: ['code', 'description'],
            recordRead: 'collection',
          },
          displayFormat: '[number] — [description]',
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
export const itemChargesListConfig: ListPageConfig & {
  dataSource: DataSourceConfig;
} = {
  pageId: 'item-charges',
  pageType: 'card',
  title: 'Item Charges',
  dataSource: {
    endpoint: '/itemCharges',
    keyField: 'systemId',
    defaultSort: 'number asc',
    headerPKProp: 'number',
  },
  identity: {
    primaryField: 'number',
    secondaryField: 'description',
  },
  module: 'Inventory',
  menu: {
    module: 'Inventory',
    group: 'Items',
    icon: 'ts-icon ts-icon-item-charges',
    moduleIcon: 'ts-icon ts-icon-inventory-module',
    route: '/item-charges',
  },
  dataSurface: {
    columns: listColumns(itemChargesHeaderConfig, [
      {
        field: 'number',
      },
      {
        field: 'description',
      },
      {
        field: 'genProdPostingGroup',
        width: '140px',
      },

      {
        field: 'systemModifiedAt',
      },
    ]),
  },
  factBox: itemChargesFactBoxConfig,
};
