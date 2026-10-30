import {
  DataSourceConfig,
  HeaderConfig,
  ListPageConfig,
  listColumns,
} from '../../../platform/public-api';
import { reasonCodesFactBoxConfig } from './reason-codes.factbox.config';

// Header form.
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

// List page.
export const reasonCodesListConfig: ListPageConfig & {
  dataSource: DataSourceConfig;
} = {
  pageId: 'reason-codes',
  pageType: 'card',
  title: 'Reason Codes',
  autoSave: true,
  dataSource: {
    endpoint: '/reasonCodes',
    keyField: 'systemId',
    defaultSort: 'code asc',
  },
  identity: {
    primaryField: 'code',
    secondaryField: 'description',
  },
  module: 'Administration',
  menu: {
    module: 'Administration',
    group: 'Codes',
    icon: 'ts-icon ts-icon-reason-codes',
    moduleIcon: 'ts-icon ts-icon-administration-module',
    route: '/reason-codes',
  },
  dataSurface: {
    columns: listColumns(reasonCodesHeaderConfig, [
      {
        field: 'code',
      },
      {
        field: 'description',
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
  factBox: reasonCodesFactBoxConfig,
};
