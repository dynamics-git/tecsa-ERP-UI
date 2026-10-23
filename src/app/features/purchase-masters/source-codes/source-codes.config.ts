import { HeaderConfig, DataSourceConfig, ListPageConfig, listColumns } from '../../../platform/public-api';
export const sourceCodesHeaderConfig: HeaderConfig = {
  dialogTitle: 'Source Codes',
  toolbarButtons: [
    {
      permissionKey: 'source-codes-lines',
      label: 'Dimension Priorities',
      actionKey: 'cmd:open-default-dimension-priorities',
      icon: 'ts-icon ts-icon-source-codes',
      group: 'Related',
      order: 40,
      runModalPageId: 'default-dimension-priorities',
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
  ],
};

export const sourceCodesListConfig: ListPageConfig & { dataSource: DataSourceConfig } = {
  pageId: 'source-codes',
  pageType: 'card',
  autoSave: true,
  title: 'Source Codes',
  module: 'Administration',
  identity: {
    primaryField: 'code',
    secondaryField: 'description',
  },
  menu: {
    module: 'Administration',
    group: 'Codes',
    icon: 'ts-icon ts-icon-source-codes',
    route: '/source-codes',
    moduleIcon: 'ts-icon ts-icon-administration-module',
  },
  dataSource: {
    endpoint: '/sourceCodes',
    keyField: 'systemId',
    defaultSort: 'code asc',
  },
  dataSurface: {
    idField: 'systemId',
    columns: listColumns(sourceCodesHeaderConfig, [
      'code',
      'description',
      { field: 'isActive', width: '140px' },
      'systemModifiedAt',
    ]),
  },
  factBox: { enabled: true },
};
