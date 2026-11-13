import {
  DataSourceConfig,
  HeaderConfig,
  LineConfig,
  ListPageConfig,
} from '../../../platform/public-api';
import { itemUnitsOfMeasureFactBoxConfig } from './item-units-of-measure.factbox.config';
const itemUnitsOfMeasureDataSource: DataSourceConfig = {
  keyField: 'systemId',
  endpoint: '/itemUnitsOfMeasure',
  headerPKProp: 'number',
  lineFKProp: 'itemNo',
  defaultSort: 'code asc',
  pageSize: 20,
};

// Header form.
export const itemUnitsOfMeasureHeaderConfig: HeaderConfig = {
  dialogTitle: 'Item Units of Measure',
  toolbarButtons: [
    {
      permissionKey: 'units-of-measure',
      label: 'Unit of Measure',
      actionKey: 'cmd:open-related-master',
      icon: 'ts-icon ts-icon-units-of-measure',
      group: 'Related',
      runModalPageId: 'units-of-measure',
      runModalTarget: 'entry',
      requireSelection: true,
      runModalRecord: {
        source: 'activeLine',
        fields: {
          code: 'code',
        },
      },
    },
  ],
  sections: [],
};

// List page.
export const itemUnitsOfMeasureListConfig: ListPageConfig & {
  dataSource: DataSourceConfig;
} = {
  pageId: 'item-units-of-measure',
  pageType: 'worksheet',
  title: 'Item Units of Measure',
  dataSource: itemUnitsOfMeasureDataSource,
  identity: {
    primaryField: 'number',
    secondaryField: 'description',
  },
  module: 'Inventory',
  permissionPageId: 'items-lines',
  tools: {
    search: false,
    filter: false,
    columns: false,
    export: false,
  },
  factBox: itemUnitsOfMeasureFactBoxConfig,
};

// Document lines.
export const itemUnitsOfMeasureLineConfig: LineConfig = {
  placement: {
    mode: 'end',
  },
  dataSource: itemUnitsOfMeasureDataSource,
  permissionPageId: 'items-lines',
  toolbarButtons: [],
  columns: [
    {
      id: 'code',
      label: 'Unit Of Measure',
      type: 'lookup',
      valueType: 'code',
      required: true,
      readonlyAfterCreate: true,
      lookup: {
        endpoint: '/unitsOfMeasure',
        valueField: 'code',
        displayField: 'code',
        searchFields: ['code', 'description'],
        recordRead: 'collection',
      },
      displayFormat: '[code] — [description]',
      validation: {
        maxLength: 10,
      },
      defaultValue: '',
    },
    {
      id: 'qtyPerUnitOfMeasure',
      label: 'Qty Per Unit Of Measure',
      type: 'decimal',
      defaultValue: '1',
      validation: {
        precision: 38,
        scale: 20,
        min: '0.000001',
      },
    },
  ],
};
