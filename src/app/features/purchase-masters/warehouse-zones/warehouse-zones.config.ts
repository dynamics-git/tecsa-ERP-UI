import { HeaderConfig, DataSourceConfig, ListPageConfig, listColumns } from '../../../platform/public-api';
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
          type: 'text',
          valueType: 'code',
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

export const warehouseZonesListConfig: ListPageConfig & { dataSource: DataSourceConfig } = {
  pageId: 'warehouse-zones',
  pageType: 'card',
  autoSave: true,
  title: 'Warehouse Zones',
  module: 'Warehouse',
  identity: {
    primaryField: 'code',
    secondaryField: 'description',
  },
  menu: {
    module: 'Warehouse',
    group: 'Storage',
    icon: 'ts-icon ts-icon-warehouse-zones',
    route: '/warehouse-zones',
    moduleIcon: 'ts-icon ts-icon-warehouse-module',
  },
  dataSource: {
    endpoint: '/warehouseZones',
    keyField: 'systemId',
    defaultSort: 'code asc',
  },
  dataSurface: {
    idField: 'systemId',
    columns: listColumns(warehouseZonesHeaderConfig, [
      'locationId',
      { field: 'code', width: '140px' },
      { field: 'description', width: '280px' },
      { field: 'isActive', width: '140px' },
      'systemModifiedAt',
    ]),
  },
  factBox: { enabled: true },
};
