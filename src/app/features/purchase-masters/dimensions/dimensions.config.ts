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
      runModalRecord: {
        source: 'header',
        fields: {
          code: 'code',
        },
      },
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
          readonlyAfterCreate: true,
        },
        {
          key: 'name',
          label: 'Name',
          type: 'text',
          validation: {
            maxLength: 30,
          },
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
  dataSource: {
    endpoint: '/dimensions',
    keyField: 'systemId',
    defaultSort: 'code asc',
    headerPKProp: 'code',
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
        field: 'systemModifiedAt',
      },
    ]),
  },
  factBox: dimensionsFactBoxConfig,
};
