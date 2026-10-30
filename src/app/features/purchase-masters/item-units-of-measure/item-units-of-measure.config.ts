import {
  DataSourceConfig,
  HeaderConfig,
  LineConfig,
  ListPageConfig,
} from '../../../platform/public-api';
import { itemUnitsOfMeasureFactBoxConfig } from './item-units-of-measure.factbox.config';
const itemUnitsOfMeasureDataSource: DataSourceConfig = {
  endpoint: '/items',
  keyField: 'systemId',
  navigation: {
    parentEndpoint: '/items',
    parentIdFields: ['systemId'],
    childCollection: 'unitsOfMeasure',
  },
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
          systemId: 'unitOfMeasureId',
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
  autoSave: true,
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
      id: 'unitOfMeasureId',
      label: 'Unit Of Measure',
      type: 'lookup',
      valueType: 'guid',
      required: true,
      readonlyAfterCreate: true,
      lookup: {
        endpoint: '/unitsOfMeasure',
        valueField: 'systemId',
        displayField: 'code',
        searchFields: ['code', 'description'],
      },
      displayFormat: '[code] — [description]',
    },
    {
      id: 'qtyPerUnitOfMeasure',
      label: 'Qty Per Unit Of Measure',
      type: 'decimal',
      defaultValue: '1',
      required: true,
      validation: {
        precision: 20,
        scale: 6,
        min: '0.000001',
      },
    },
  ],
};
