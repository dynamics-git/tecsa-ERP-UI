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
          key: 'locationCode',
          label: 'Location',
          type: 'lookup',
          valueType: 'code',
          required: true,
          readonlyAfterCreate: true,
          lookup: {
            endpoint: '/locations',
            valueField: 'code',
            displayField: 'code',
            searchFields: ['code', 'name'],
            recordRead: 'collection',
          },
          displayFormat: '[code] — [name]',
          validation: {
            maxLength: 10,
          },
          defaultValue: '',
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
        field: 'locationCode',
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
        field: 'systemModifiedAt',
      },
    ]),
  },
  factBox: warehouseZonesFactBoxConfig,
};
