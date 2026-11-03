import {
  DataSourceConfig,
  HeaderConfig,
  ListPageConfig,
  listColumns,
} from '../../../platform/public-api';
import { warehouseZonesFactBoxConfig } from './warehouse-zones.factbox.config';

// Header form.
export const warehouseZonesHeaderConfig: HeaderConfig = {
  dialogTitle: 'Warehouse Zones',
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
            maxLength: 10,
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
      ],
    },
  ],
};

// List page.
export const warehouseZonesListConfig: ListPageConfig & {
  dataSource: DataSourceConfig;
} = {
  pageId: 'warehouse-zones',
  pageType: 'card',
  title: 'Warehouse Zones',
  dataSource: {
    endpoint: '/warehouseZones',
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
    icon: 'ts-icon ts-icon-warehouse-zones',
    moduleIcon: 'ts-icon ts-icon-warehouse-module',
    route: '/warehouse-zones',
  },
  dataSurface: {
    columns: listColumns(warehouseZonesHeaderConfig, [
      {
        field: 'locationId',
      },
      {
        field: 'code',
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
        field: 'systemModifiedAt',
      },
    ]),
  },
  factBox: warehouseZonesFactBoxConfig,
};
