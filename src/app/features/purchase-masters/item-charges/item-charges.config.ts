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
          key: 'code',
          label: 'Code',
          type: 'code',
          required: true,
          validation: {
            maxLength: 20,
          },
        },
        {
          key: 'description',
          label: 'Description',
          type: 'text',
          required: true,
          validation: {
            maxLength: 100,
          },
        },
        {
          key: 'isActive',
          label: 'Is Active',
          type: 'boolean',
          defaultValue: true,
        },
      ],
    },
    {
      id: 'posting',
      title: 'Posting & Defaults',
      fields: [
        {
          key: 'generalProductPostingGroupId',
          label: 'General Product Posting Group',
          type: 'lookup',
          valueType: 'guid',
          required: true,
          lookup: {
            endpoint: '/generalProductPostingGroups',
            valueField: 'systemId',
            displayField: 'code',
            searchFields: ['code', 'description'],
          },
          displayFormat: '[code] — [description]',
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
  autoSave: true,
  dataSource: {
    endpoint: '/itemCharges',
    keyField: 'systemId',
    defaultSort: 'code asc',
  },
  identity: {
    primaryField: 'code',
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
        field: 'code',
      },
      {
        field: 'description',
      },
      {
        field: 'generalProductPostingGroupId',
        width: '140px',
      },
      {
        field: 'isActive',
        width: '140px',
      },
      {
        field: 'systemModifiedAt',
      },
    ]),
  },
  factBox: itemChargesFactBoxConfig,
};
