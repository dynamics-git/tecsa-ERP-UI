import { itemsFactBoxConfig } from './items.factbox.config';
import {
  DataSourceConfig,
  HeaderConfig,
  ListPageConfig,
  listColumns,
} from '../../../platform/public-api';

// Header form.
export const itemsHeaderConfig: HeaderConfig = {
  dialogTitle: 'Items',
  toolbarButtons: [
    {
      permissionKey: 'items-lines',
      label: 'Units of Measure',
      actionKey: 'cmd:open-item-units-of-measure',
      icon: 'ts-icon ts-icon-units-of-measure',
      group: 'Related',
      order: 40,
      runModalPageId: 'item-units-of-measure',
      runModalTarget: 'entry',
    },
    {
      permissionKey: 'item-default-dimensions-lines',
      label: 'Dimensions',
      actionKey: 'cmd:open-item-default-dimensions',
      icon: 'ts-icon ts-icon-item-default-dimensions',
      group: 'Related',
      order: 40,
      runModalPageId: 'item-default-dimensions',
      runModalTarget: 'entry',
    },
  ],
  sections: [
    {
      id: 'general',
      title: 'General',
      fields: [
        {
          key: 'number',
          label: 'No.',
          type: 'code',
          readonlyAfterCreate: true,
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
          key: 'description2',
          label: 'Description2',
          type: 'text',
          validation: {
            maxLength: 50,
          },
        },
        {
          key: 'searchDescription',
          label: 'Search Description',
          type: 'text',
          validation: {
            maxLength: 100,
          },
        },
        {
          key: 'itemType',
          label: 'Item Type',
          type: 'dropdown',
          defaultValue: 'inventory',
          options: [
            {
              label: 'Inventory',
              value: 'inventory',
            },
            {
              label: 'Service',
              value: 'service',
            },
            {
              label: 'Non inventory',
              value: 'non_inventory',
            },
          ],
        },
        {
          key: 'costingMethod',
          label: 'Costing Method',
          type: 'dropdown',
          defaultValue: 'fifo',
          options: [
            {
              label: 'Fifo',
              value: 'fifo',
            },
            {
              label: 'Lifo',
              value: 'lifo',
            },
            {
              label: 'Specific',
              value: 'specific',
            },
            {
              label: 'Average',
              value: 'average',
            },
            {
              label: 'Standard',
              value: 'standard',
            },
          ],
        },
        {
          key: 'unitCost',
          label: 'Unit Cost',
          type: 'decimal',
          defaultValue: '0',
          validation: {
            precision: 20,
            scale: 6,
          },
        },
        {
          key: 'standardCost',
          label: 'Standard Cost',
          type: 'decimal',
          defaultValue: '0',
          validation: {
            precision: 20,
            scale: 6,
          },
        },
        {
          key: 'lastDirectCost',
          label: 'Last Direct Cost',
          type: 'decimal',
          defaultValue: '0',
          validation: {
            precision: 20,
            scale: 6,
          },
        },
        {
          key: 'unitPrice',
          label: 'Unit Price',
          type: 'decimal',
          defaultValue: '0',
          validation: {
            precision: 20,
            scale: 6,
          },
        },
        {
          key: 'blocked',
          label: 'Blocked',
          type: 'boolean',
          defaultValue: false,
        },
        {
          key: 'preventNegativeInventory',
          label: 'Prevent Negative Inventory',
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
          key: 'baseUnitOfMeasureId',
          label: 'Base Unit Of Measure',
          type: 'lookup',
          valueType: 'guid',
          required: true,
          lookup: {
            endpoint: '/unitsOfMeasure',
            valueField: 'systemId',
            displayField: 'code',
            searchFields: ['code', 'description'],
          },
          displayFormat: '[code] — [description]',
        },
        {
          key: 'inventoryPostingGroupId',
          label: 'Inventory Posting Group',
          type: 'lookup',
          valueType: 'guid',
          defaultValue: null,
          lookup: {
            endpoint: '/inventoryPostingGroups',
            valueField: 'systemId',
            displayField: 'code',
            searchFields: ['code', 'description'],
          },
          displayFormat: '[code] — [description]',
        },
        {
          key: 'generalProductPostingGroupId',
          label: 'General Product Posting Group',
          type: 'lookup',
          valueType: 'guid',
          defaultValue: null,
          lookup: {
            endpoint: '/generalProductPostingGroups',
            valueField: 'systemId',
            displayField: 'code',
            searchFields: ['code', 'description'],
          },
          displayFormat: '[code] — [description]',
        },
        {
          key: 'vatProductPostingGroupId',
          label: 'Vat Product Posting Group',
          type: 'lookup',
          valueType: 'guid',
          defaultValue: null,
          lookup: {
            endpoint: '/vatProductPostingGroups',
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
export const itemsListConfig: ListPageConfig & {
  dataSource: DataSourceConfig;
} = {
  pageId: 'items',
  pageType: 'card',
  title: 'Items',
  autoSave: true,
  dataSource: {
    endpoint: '/items',
    keyField: 'systemId',
    headerPKProp: 'number',
    defaultSort: 'number asc',
    autoGenerateNumber: true,
    lazyCreateOnFirstInput: true,
    omitEmptyFields: ['number'],
  },
  identity: {
    primaryField: 'number',
    secondaryField: 'description',
  },
  module: 'Inventory',
  menu: {
    module: 'Inventory',
    group: 'Items',
    icon: 'ts-icon ts-icon-items',
    moduleIcon: 'ts-icon ts-icon-inventory-module',
    route: '/items',
  },
  dataSurface: {
    columns: listColumns(itemsHeaderConfig, [
      {
        field: 'number',
      },
      {
        field: 'description',
      },
      {
        field: 'itemType',
      },
      {
        field: 'baseUnitOfMeasureId',
      },
      {
        field: 'costingMethod',
      },
      {
        field: 'unitCost',
      },
      {
        field: 'unitPrice',
      },
      {
        field: 'blocked',
      },
      {
        field: 'systemModifiedAt',
      },
    ]),
  },
  factBox: itemsFactBoxConfig,
};
