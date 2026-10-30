import {
  DataSourceConfig,
  HeaderConfig,
  ListPageConfig,
  listColumns,
} from '../../../platform/public-api';
import { accountingPeriodsFactBoxConfig } from './accounting-periods.factbox.config';

// Header form.
export const accountingPeriodsHeaderConfig: HeaderConfig = {
  dialogTitle: 'Accounting Periods',
  toolbarButtons: [],
  sections: [
    {
      id: 'general',
      title: 'General',
      fields: [
        {
          key: 'startingDate',
          label: 'Starting Date',
          type: 'date',
          required: true,
        },
        {
          key: 'name',
          label: 'Name',
          type: 'text',
          required: true,
          validation: {
            maxLength: 50,
          },
        },
        {
          key: 'newFiscalYear',
          label: 'New Fiscal Year',
          type: 'boolean',
          defaultValue: false,
        },
      ],
    },
  ],
};

// List page.
export const accountingPeriodsListConfig: ListPageConfig & {
  dataSource: DataSourceConfig;
} = {
  pageId: 'accounting-periods',
  pageType: 'card',
  title: 'Accounting Periods',
  autoSave: true,
  dataSource: {
    endpoint: '/accountingPeriods',
    keyField: 'systemId',
    defaultSort: 'startingDate asc',
  },
  identity: {
    primaryField: 'startingDate',
    secondaryField: 'name',
  },
  module: 'Finance',
  menu: {
    module: 'Finance',
    group: 'General Ledger',
    icon: 'ts-icon ts-icon-accounting-periods',
    moduleIcon: 'ts-icon ts-icon-finance-module',
    route: '/accounting-periods',
  },
  dataSurface: {
    columns: listColumns(accountingPeriodsHeaderConfig, [
      {
        field: 'startingDate',
      },
      {
        field: 'name',
      },
      {
        field: 'newFiscalYear',
        width: '140px',
      },
      {
        field: 'closed',
        label: 'Closed',
        type: 'boolean',
        width: '140px',
      },
      {
        field: 'dateLocked',
        label: 'Date Locked',
        type: 'boolean',
        width: '140px',
      },
      {
        field: 'systemModifiedAt',
      },
    ]),
  },
  factBox: accountingPeriodsFactBoxConfig,
};
