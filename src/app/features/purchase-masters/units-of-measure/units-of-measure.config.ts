import { HeaderConfig, DataSourceConfig, ListPageConfig, listColumns } from '../../../platform/public-api';
export const unitsOfMeasureHeaderConfig: HeaderConfig = {
  dialogTitle: 'Units of Measure',
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
          key: 'description',
          label: 'Description',
          type: 'text',
          required: true,
          validation: {
            maxLength: 50,
          },
        },
        {
          key: 'internationalStandardCode',
          label: 'International Standard Code',
          type: 'text',
          validation: {
            maxLength: 10,
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
  ],
};

export const unitsOfMeasureListConfig: ListPageConfig & { dataSource: DataSourceConfig } = {
  pageId: 'units-of-measure',
  pageType: 'card',
  autoSave: true,
  title: 'Units of Measure',
  module: 'Inventory',
  identity: {
    primaryField: 'code',
    secondaryField: 'description',
  },
  menu: {
    module: 'Inventory',
    group: 'Items',
    icon: 'ts-icon ts-icon-units-of-measure',
    route: '/units-of-measure',
    moduleIcon: 'ts-icon ts-icon-inventory-module',
  },
  dataSource: {
    endpoint: '/unitsOfMeasure',
    keyField: 'systemId',
    defaultSort: 'code asc',
  },
  dataSurface: {
    idField: 'systemId',
    columns: listColumns(unitsOfMeasureHeaderConfig, [
      'code',
      'description',
      { field: 'internationalStandardCode', width: '140px' },
      { field: 'isActive', width: '140px' },
      'systemModifiedAt',
    ]),
  },
  factBox: { enabled: false },
};
