import {
  DataSourceConfig,
  HeaderConfig,
  ListPageConfig,
  listColumns,
} from '../../../platform/public-api';
import { dimensionsFactBoxConfig } from './dimensions.factbox.config';

// Header form.
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
          type: 'code',
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

// List page.
export const dimensionsListConfig: ListPageConfig & {
  dataSource: DataSourceConfig;
} = {
  pageId: 'dimensions',
  pageType: 'card',
  title: 'Dimensions',
  autoSave: true,
  dataSource: {
    endpoint: '/dimensions',
    keyField: 'systemId',
    defaultSort: 'code asc',
  },
  identity: {
    primaryField: 'code',
    secondaryField: 'name',
  },
  module: 'Finance',
  menu: {
    module: 'Finance',
    group: 'Dimensions',
    icon: 'ts-icon ts-icon-dimensions',
    moduleIcon: 'ts-icon ts-icon-finance-module',
    route: '/dimensions',
  },
  dataSurface: {
    columns: listColumns(dimensionsHeaderConfig, [
      {
        field: 'code',
      },
      {
        field: 'name',
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
  factBox: dimensionsFactBoxConfig,
};
