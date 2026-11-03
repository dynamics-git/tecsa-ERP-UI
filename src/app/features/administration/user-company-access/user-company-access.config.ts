import {
  DataSourceConfig,
  HeaderConfig,
  LineConfig,
  ListPageConfig,
} from '../../../platform/public-api';
import { userCompanyAccessFactBoxConfig } from './user-company-access.factbox.config';

const userCompanyAccessDataSource: DataSourceConfig = {
  endpoint: '/companyUsers',
  keyField: 'systemId',
  headerPKProp: 'userName',
  lineFKProp: 'userName',
  pageSize: 50,
};

// Header form.
export const userCompanyAccessHeaderConfig: HeaderConfig = {
  dialogTitle: 'Company Access',
  toolbarButtons: [],
  sections: [],
};

// Related worksheet. The existing membership table owns login company access.
export const userCompanyAccessListConfig: ListPageConfig & {
  dataSource: DataSourceConfig;
} = {
  pageId: 'user-company-access',
  pageType: 'worksheet',
  title: 'Company Access',
  dataSource: userCompanyAccessDataSource,
  identity: {
    primaryField: 'userName',
    secondaryField: 'name',
  },
  module: 'Administration',
  tools: {
    search: false,
    filter: false,
    columns: false,
    export: false,
  },
  factBox: userCompanyAccessFactBoxConfig,
};

// Document lines.
export const userCompanyAccessLineConfig: LineConfig = {
  placement: {
    mode: 'end',
  },
  dataSource: userCompanyAccessDataSource,
  columns: [
    {
      id: 'companyCode',
      label: 'Company',
      type: 'lookup',
      required: true,
      readonlyAfterCreate: true,
      lookup: {
        endpoint: '/permissionCompanies',
        valueField: 'code',
        displayField: 'name',
        recordRead: 'collection',
      },
      width: '300px',
    },
    {
      id: 'isDefault',
      label: 'Default Company',
      type: 'boolean',
      defaultValue: false,
      width: '150px',
    },
    {
      id: 'isActive',
      label: 'Active',
      type: 'boolean',
      defaultValue: true,
      width: '100px',
    },
  ],
};
