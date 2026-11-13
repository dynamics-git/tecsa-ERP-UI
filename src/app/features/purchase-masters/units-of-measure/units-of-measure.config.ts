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
          readonlyAfterCreate: true,
        },
        {
          key: 'description',
          label: 'Description',
          type: 'text',
          validation: {
            maxLength: 50,
          },
        },
        {
          key: 'internationalStandardCode',
          label: 'International Standard Code',
          type: 'code',
          validation: {
            maxLength: 10,
          },
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
  dataSource: {
    endpoint: '/unitsOfMeasure',
    keyField: 'systemId',
    defaultSort: 'code asc',
    headerPKProp: 'code',
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
        field: 'systemModifiedAt',
      },
    ]),
  },
  factBox: unitsOfMeasureFactBoxConfig,
};
