import { HeaderConfig, DataSourceConfig, ListPageConfig, listColumns } from '../../../platform/public-api';
export const dimensionsHeaderConfig: HeaderConfig = {
  dialogTitle: 'Dimensions',
  toolbarButtons: [
    {
      permissionKey: 'dimensions-lines',
      label: 'Dimension Values',
      actionKey: 'cmd:open-dimension-values',
      icon: 'ts-icon ts-icon-dimensions',
      group: 'Related',
      order: 40,
      runModalPageId: 'dimension-values',
      runModalTarget: 'entry',
    },
  ],
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
            maxLength: 20,
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
          key: 'isActive',
          label: 'Is Active',
          type: 'boolean',
          defaultValue: true,
        },
      ],
    },
  ],
};

export const dimensionsListConfig: ListPageConfig & { dataSource: DataSourceConfig } = {
  pageId: 'dimensions',
  pageType: 'card',
  autoSave: true,
  title: 'Dimensions',
  module: 'Finance',
  identity: {
    primaryField: 'code',
    secondaryField: 'name',
  },
  menu: {
    module: 'Finance',
    group: 'Dimensions',
    icon: 'ts-icon ts-icon-dimensions',
    route: '/dimensions',
    moduleIcon: 'ts-icon ts-icon-finance-module',
  },
  dataSource: {
    endpoint: '/dimensions',
    keyField: 'systemId',
    defaultSort: 'code asc',
  },
  dataSurface: {
    idField: 'systemId',
    columns: listColumns(dimensionsHeaderConfig, [
      'code',
      'name',
      { field: 'isActive', width: '140px' },
      'systemModifiedAt',
    ]),
  },
  factBox: { enabled: true },
};
