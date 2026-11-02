import {
  DataSourceConfig,
  HeaderConfig,
  LineConfig,
  ListPageConfig,
} from '../../../platform/public-api';

export const companiesDataSource: DataSourceConfig = {
  endpoint: '/companies',
  // The existing company API requires both before the first POST.
  requiredCreateFields: ['code', 'name'],
};

export const companiesHeaderConfig: HeaderConfig = {
  dialogTitle: 'Companies',
  toolbarButtons: [],
  sections: [],
};

export const companiesListConfig: ListPageConfig & { dataSource: DataSourceConfig } = {
  pageId: 'companies',
  pageType: 'worksheet',
  title: 'Companies',
  module: 'Administration',
  menu: {
    module: 'Administration',
    group: 'Company',
    icon: 'ts-icon ts-icon-building',
    route: '/companies',
  },
  identity: { primaryField: 'code', secondaryField: 'name' },
  dataSource: companiesDataSource,
  factBox: { enabled: false },
};

export const companiesLineConfig: LineConfig = {
  placement: { mode: 'end' },
  dataSource: companiesDataSource,
  toolbarButtons: [
    {
      actionKey: 'cmd:copy-company',
      label: 'Copy company',
      requireSelection: true,
      selectionMode: 'single',
      isPrimary: true,
    },
  ],
  columns: [
    {
      id: 'code',
      label: 'Code',
      valueType: 'code',
      required: true,
      readonlyAfterCreate: true,
      width: '180px',
    },
    { id: 'name', label: 'Name', required: true, width: '320px' },
    { id: 'displayName', label: 'Display name', width: '320px' },
    { id: 'isActive', label: 'Active', type: 'boolean', defaultValue: true, width: '120px' },
  ],
};
