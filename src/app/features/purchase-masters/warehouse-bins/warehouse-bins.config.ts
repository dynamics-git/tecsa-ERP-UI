import { HeaderConfig, DataSourceConfig, ListPageConfig, listColumns } from '../../../platform/public-api';
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
          type: 'text',
          valueType: 'code',
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
          type: 'select',
          valueType: 'text',
          defaultValue: 'storage',
          options: [
            {
              value: 'receiving',
              label: 'Receiving',
            },
            {
              value: 'storage',
              label: 'Storage',
            },
            {
              value: 'pick',
              label: 'Pick',
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

export const warehouseBinsListConfig: ListPageConfig & { dataSource: DataSourceConfig } = {
  pageId: 'warehouse-bins',
  pageType: 'card',
  autoSave: true,
  title: 'Warehouse Bins',
  module: 'Warehouse',
  identity: {
    primaryField: 'code',
    secondaryField: 'description',
  },
  menu: {
    module: 'Warehouse',
    group: 'Storage',
    icon: 'ts-icon ts-icon-warehouse-bins',
    route: '/warehouse-bins',
    moduleIcon: 'ts-icon ts-icon-warehouse-module',
  },
  dataSource: {
    endpoint: '/warehouseBins',
    keyField: 'systemId',
    defaultSort: 'code asc',
  },
  dataSurface: {
    idField: 'systemId',
    columns: listColumns(warehouseBinsHeaderConfig, [
      'locationId',
      { field: 'code', width: '140px' },
      { field: 'zoneId', width: '140px' },
      { field: 'description', width: '280px' },
      { field: 'isActive', width: '140px' },
      { field: 'binRole', width: '140px' },
      'systemModifiedAt',
    ]),
  },
  factBox: { enabled: true },
};
