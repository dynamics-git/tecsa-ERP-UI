import { HeaderConfig, DataSourceConfig, ListPageConfig, listColumns } from '../../../platform/public-api';
export const locationsHeaderConfig: HeaderConfig = {
  dialogTitle: 'Locations',
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
          validation: {
            maxLength: 10,
          },
        },
        {
          key: 'name',
          label: 'Name',
          type: 'text',
          required: true,
          validation: {
            maxLength: 100,
          },
        },
        {
          key: 'name2',
          label: 'Name2',
          type: 'text',
          validation: {
            maxLength: 50,
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
      id: 'contact',
      title: 'Address & Contact',
      fields: [
        {
          key: 'address',
          label: 'Address',
          type: 'text',
          validation: {
            maxLength: 100,
          },
        },
        {
          key: 'address2',
          label: 'Address2',
          type: 'text',
          validation: {
            maxLength: 50,
          },
        },
        {
          key: 'city',
          label: 'City',
          type: 'text',
          validation: {
            maxLength: 30,
          },
        },
        {
          key: 'state',
          label: 'State',
          type: 'text',
          validation: {
            maxLength: 50,
          },
        },
        {
          key: 'postalCode',
          label: 'Postal Code',
          type: 'text',
          validation: {
            maxLength: 20,
          },
        },
        {
          key: 'countryCode',
          label: 'Country Code',
          type: 'text',
          valueType: 'code',
          validation: {
            maxLength: 10,
          },
        },
      ],
    },
  ],
};

export const locationsListConfig: ListPageConfig & { dataSource: DataSourceConfig } = {
  pageId: 'locations',
  pageType: 'card',
  autoSave: true,
  title: 'Locations',
  module: 'Warehouse',
  identity: {
    primaryField: 'code',
    secondaryField: 'name',
  },
  menu: {
    module: 'Warehouse',
    group: 'Locations',
    icon: 'ts-icon ts-icon-locations',
    route: '/locations',
    moduleIcon: 'ts-icon ts-icon-warehouse-module',
  },
  dataSource: {
    endpoint: '/locations',
    keyField: 'systemId',
    defaultSort: 'code asc',
  },
  dataSurface: {
    idField: 'systemId',
    columns: listColumns(locationsHeaderConfig, [
      'code',
      'name',
      { field: 'city', width: '140px' },
      { field: 'state', width: '140px' },
      { field: 'countryCode', width: '140px' },
      { field: 'isActive', width: '140px' },
      'systemModifiedAt',
    ]),
  },
  factBox: { enabled: false },
};
