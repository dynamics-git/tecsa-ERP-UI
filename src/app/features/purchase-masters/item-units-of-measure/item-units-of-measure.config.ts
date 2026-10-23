import { DataSourceConfig, HeaderConfig, ListPageConfig, LineConfig } from '../../../platform/public-api';
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

export const itemUnitsOfMeasureListConfig: ListPageConfig & {
  dataSource: DataSourceConfig;
} = {
  pageId: 'item-units-of-measure',
  pageType: 'worksheet',
  autoSave: true,
  title: 'Item Units of Measure',
  module: 'Inventory',
  permissionPageId: 'items-lines',
  identity: {
    primaryField: 'number',
    secondaryField: 'description',
  },
  dataSource: itemUnitsOfMeasureDataSource,
  tools: {
    search: false,
    filter: false,
    columns: false,
    export: false,
  },
  factBox: {
    enabled: true,
  },
};
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
export const itemUnitsOfMeasureLineConfig: LineConfig = {
  permissionPageId: 'items-lines',
  placement: {
    mode: 'end',
  },
  lineKeyField: 'systemId',
  dataSource: itemUnitsOfMeasureDataSource,
  toolbarButtons: [],
  columns: [
    {
      id: 'unitOfMeasureId',
      label: 'Unit Of Measure',
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
      cellType: 'dropdown',
    },
    {
      id: 'qtyPerUnitOfMeasure',
      label: 'Qty Per Unit Of Measure',
      valueType: 'decimal',
      required: true,
      defaultValue: '1',
      validation: {
        precision: 20,
        scale: 6,
        min: '0.000001',
      },
    },
  ],
};
