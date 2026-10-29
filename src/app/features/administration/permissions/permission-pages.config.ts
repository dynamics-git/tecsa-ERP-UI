import { DataSourceConfig, ListPageConfig } from '../../../platform/public-api';

export const permissionPagesListConfig: ListPageConfig & { dataSource: DataSourceConfig } = {
  pageId: 'permission-pages',
  permissionResource: 'permission_sets',
  pageType: 'list',
  title: 'Page Configuration',
  module: 'Administration',
  menu: {
    module: 'Administration', group: 'Security',
    route: '/permission-pages', icon: 'ts-icon ts-icon-settings',
    moduleIcon: 'ts-icon ts-icon-administration-module',
  },
  dataSource: { endpoint: '/permissionPages', supportsCreate: false, supportsDelete: false },
};
