import { HeaderConfig, DataSourceConfig, ListPageConfig, listColumns } from '../../../platform/public-api';
export const reasonCodesHeaderConfig: HeaderConfig = {
  dialogTitle: 'Reason Codes',
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

export const reasonCodesListConfig: ListPageConfig & { dataSource: DataSourceConfig } = {
  pageId: 'reason-codes',
  pageType: 'card',
  autoSave: true,
  title: 'Reason Codes',
  module: 'Administration',
  identity: {
    primaryField: 'code',
    secondaryField: 'description',
  },
  menu: {
    module: 'Administration',
    group: 'Codes',
    icon: 'ts-icon ts-icon-reason-codes',
    route: '/reason-codes',
    moduleIcon: 'ts-icon ts-icon-administration-module',
  },
  dataSource: {
    endpoint: '/reasonCodes',
    keyField: 'systemId',
    defaultSort: 'code asc',
  },
  dataSurface: {
    idField: 'systemId',
    columns: listColumns(reasonCodesHeaderConfig, [
      'code',
      'description',
      { field: 'isActive', width: '140px' },
      'systemModifiedAt',
    ]),
  },
  factBox: { enabled: false },
};
