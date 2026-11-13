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
          validation: {
            maxLength: 100,
          },
        },

        {
          key: 'binTypeCode',
          label: 'Bin Type Code',
          type: 'lookup',
          valueType: 'code',
          defaultValue: '',
          validation: {
            maxLength: 10,
          },
          lookup: {
            endpoint: '/warehouseBinTypes',
            valueField: 'code',
            displayField: 'code',
            recordRead: 'collection',
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
        {
          key: 'zoneCode',
          label: 'Zone',
          type: 'lookup',
          valueType: 'code',
          defaultValue: '',
          lookup: {
            endpoint: '/warehouseZones',
            valueField: 'code',
            displayField: 'code',
            searchFields: ['code', 'description'],
            dependsOn: [
              {
                field: 'locationCode',
                valueFrom: 'locationCode',
                in: 'filter',
              },
            ],
            recordRead: 'collection',
          },
          displayFormat: '[code] — [description]',
          validation: {
            maxLength: 10,
          },
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
        field: 'locationCode',
      },
      {
        field: 'code',
        width: '140px',
      },
      {
        field: 'zoneCode',
        width: '140px',
      },
      {
        field: 'description',
        width: '280px',
      },

      {
        field: 'binTypeCode',
        width: '140px',
      },
      {
        field: 'systemModifiedAt',
      },
    ]),
  },
  factBox: warehouseBinsFactBoxConfig,
};
