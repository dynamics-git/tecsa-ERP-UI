import {
  DataSourceConfig,
  HeaderConfig,
  ListPageConfig,
  listColumns,
} from '../../../platform/public-api';
import { unitsOfMeasureFactBoxConfig } from './units-of-measure.factbox.config';

// Header form.
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
          type: 'code',
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

// List page.
export const unitsOfMeasureListConfig: ListPageConfig & {
  dataSource: DataSourceConfig;
} = {
  pageId: 'units-of-measure',
  pageType: 'card',
  title: 'Units of Measure',
  autoSave: true,
  dataSource: {
    endpoint: '/unitsOfMeasure',
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
    icon: 'ts-icon ts-icon-units-of-measure',
    moduleIcon: 'ts-icon ts-icon-inventory-module',
    route: '/units-of-measure',
  },
  dataSurface: {
    columns: listColumns(unitsOfMeasureHeaderConfig, [
      {
        field: 'code',
      },
      {
        field: 'description',
      },
      {
        field: 'internationalStandardCode',
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
  factBox: unitsOfMeasureFactBoxConfig,
};
