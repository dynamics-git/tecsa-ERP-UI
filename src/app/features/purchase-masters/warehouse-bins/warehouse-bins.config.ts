import {
  DataSourceConfig,
  HeaderConfig,
  ListPageConfig,
  listColumns,
} from '../../../platform/public-api';
import { warehouseBinsFactBoxConfig } from './warehouse-bins.factbox.config';

// Header form.
export const warehouseBinsHeaderConfig: HeaderConfig = {
  dialogTitle: 'Warehouse Bins',
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
          key: 'isActive',
          label: 'Is Active',
          type: 'boolean',
          defaultValue: true,
        },
        {
          key: 'binRole',
          label: 'Bin Role',
          type: 'dropdown',
          defaultValue: 'storage',
          options: [
            {
              label: 'Receiving',
              value: 'receiving',
            },
            {
              label: 'Storage',
              value: 'storage',
            },
            {
              label: 'Pick',
              value: 'pick',
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
          key: 'locationId',
          label: 'Location',
          type: 'lookup',
          valueType: 'guid',
          required: true,
          readonlyAfterCreate: true,
          lookup: {
            endpoint: '/locations',
            valueField: 'systemId',
            displayField: 'code',
            searchFields: ['code', 'name'],
          },
          displayFormat: '[code] — [name]',
        },
        {
          key: 'zoneId',
          label: 'Zone',
          type: 'lookup',
          valueType: 'guid',
          defaultValue: null,
          lookup: {
            endpoint: '/warehouseZones',
            valueField: 'systemId',
            displayField: 'code',
            searchFields: ['code', 'description'],
            dependsOn: [
              {
                field: 'locationId',
                valueFrom: 'locationId',
              },
            ],
          },
          displayFormat: '[code] — [description]',
        },
      ],
    },
  ],
};

// List page.
export const warehouseBinsListConfig: ListPageConfig & {
  dataSource: DataSourceConfig;
} = {
  pageId: 'warehouse-bins',
  pageType: 'card',
  title: 'Warehouse Bins',
  dataSource: {
    endpoint: '/warehouseBins',
    keyField: 'systemId',
    defaultSort: 'code asc',
  },
  identity: {
    primaryField: 'code',
    secondaryField: 'description',
  },
  module: 'Warehouse',
  menu: {
    module: 'Warehouse',
    group: 'Storage',
    icon: 'ts-icon ts-icon-warehouse-bins',
    moduleIcon: 'ts-icon ts-icon-warehouse-module',
    route: '/warehouse-bins',
  },
  dataSurface: {
    columns: listColumns(warehouseBinsHeaderConfig, [
      {
        field: 'locationId',
      },
      {
        field: 'code',
        width: '140px',
      },
      {
        field: 'zoneId',
        width: '140px',
      },
      {
        field: 'description',
        width: '280px',
      },
      {
        field: 'isActive',
        width: '140px',
      },
      {
        field: 'binRole',
        width: '140px',
      },
      {
        field: 'systemModifiedAt',
      },
    ]),
  },
  factBox: warehouseBinsFactBoxConfig,
};
