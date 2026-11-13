import {
  DataSourceConfig,
  HeaderConfig,
  ListPageConfig,
  listColumns,
} from '../../../platform/public-api';
import { generalPostingSetupFactBoxConfig } from './general-posting-setup.factbox.config';

// Header form.
export const generalPostingSetupHeaderConfig: HeaderConfig = {
  dialogTitle: 'General Posting Setup',
  toolbarButtons: [],
  sections: [
    {
      id: 'posting',
      title: 'Posting & Defaults',
      fields: [
        {
          key: 'genBusPostingGroup',
          label: 'General Business Posting Group',
          type: 'lookup',
          valueType: 'code',
          readonlyAfterCreate: true,
          lookup: {
            endpoint: '/generalBusinessPostingGroups',
            valueField: 'code',
            displayField: 'code',
            searchFields: ['code', 'description'],
            recordRead: 'collection',
          },
          displayFormat: '[code] — [description]',
          validation: {
            maxLength: 20,
          },
          defaultValue: '',
        },
        {
          key: 'genProdPostingGroup',
          label: 'General Product Posting Group',
          type: 'lookup',
          valueType: 'code',
          readonlyAfterCreate: true,
          lookup: {
            endpoint: '/generalProductPostingGroups',
            valueField: 'code',
            displayField: 'code',
            searchFields: ['code', 'description'],
            recordRead: 'collection',
          },
          displayFormat: '[code] — [description]',
          validation: {
            maxLength: 20,
          },
          defaultValue: '',
        },
        {
          key: 'salesAccount',
          label: 'Sales Account',
          type: 'lookup',
          valueType: 'code',
          defaultValue: '',
          lookup: {
            endpoint: '/glAccounts',
            valueField: 'number',
            displayField: 'number',
            searchFields: ['number', 'name'],
            recordRead: 'collection',
          },
          displayFormat: '[number] — [name]',
          validation: {
            maxLength: 20,
          },
        },
        {
          key: 'salesCreditMemoAccount',
          label: 'Sales Credit Memo Account',
          type: 'lookup',
          valueType: 'code',
          defaultValue: '',
          lookup: {
            endpoint: '/glAccounts',
            valueField: 'number',
            displayField: 'number',
            searchFields: ['number', 'name'],
            recordRead: 'collection',
          },
          displayFormat: '[number] — [name]',
          validation: {
            maxLength: 20,
          },
        },
        {
          key: 'salesLineDiscAccount',
          label: 'Sales Line Discount Account',
          type: 'lookup',
          valueType: 'code',
          defaultValue: '',
          lookup: {
            endpoint: '/glAccounts',
            valueField: 'number',
            displayField: 'number',
            searchFields: ['number', 'name'],
            recordRead: 'collection',
          },
          displayFormat: '[number] — [name]',
          validation: {
            maxLength: 20,
          },
        },
        {
          key: 'salesInvDiscAccount',
          label: 'Sales Invoice Discount Account',
          type: 'lookup',
          valueType: 'code',
          defaultValue: '',
          lookup: {
            endpoint: '/glAccounts',
            valueField: 'number',
            displayField: 'number',
            searchFields: ['number', 'name'],
            recordRead: 'collection',
          },
          displayFormat: '[number] — [name]',
          validation: {
            maxLength: 20,
          },
        },
        {
          key: 'salesPmtDiscDebitAcc',
          label: 'Sales Payment Discount Debit Account',
          type: 'lookup',
          valueType: 'code',
          defaultValue: '',
          lookup: {
            endpoint: '/glAccounts',
            valueField: 'number',
            displayField: 'number',
            searchFields: ['number', 'name'],
            recordRead: 'collection',
          },
          displayFormat: '[number] — [name]',
          validation: {
            maxLength: 20,
          },
        },
        {
          key: 'purchAccount',
          label: 'Purchase Account',
          type: 'lookup',
          valueType: 'code',
          defaultValue: '',
          lookup: {
            endpoint: '/glAccounts',
            valueField: 'number',
            displayField: 'number',
            searchFields: ['number', 'name'],
            recordRead: 'collection',
          },
          displayFormat: '[number] — [name]',
          validation: {
            maxLength: 20,
          },
        },
        {
          key: 'purchCreditMemoAccount',
          label: 'Purchase Credit Memo Account',
          type: 'lookup',
          valueType: 'code',
          defaultValue: '',
          lookup: {
            endpoint: '/glAccounts',
            valueField: 'number',
            displayField: 'number',
            searchFields: ['number', 'name'],
            recordRead: 'collection',
          },
          displayFormat: '[number] — [name]',
          validation: {
            maxLength: 20,
          },
        },
        {
          key: 'purchLineDiscAccount',
          label: 'Purchase Line Discount Account',
          type: 'lookup',
          valueType: 'code',
          defaultValue: '',
          lookup: {
            endpoint: '/glAccounts',
            valueField: 'number',
            displayField: 'number',
            searchFields: ['number', 'name'],
            recordRead: 'collection',
          },
          displayFormat: '[number] — [name]',
          validation: {
            maxLength: 20,
          },
        },
        {
          key: 'purchInvDiscAccount',
          label: 'Purchase Invoice Discount Account',
          type: 'lookup',
          valueType: 'code',
          defaultValue: '',
          lookup: {
            endpoint: '/glAccounts',
            valueField: 'number',
            displayField: 'number',
            searchFields: ['number', 'name'],
            recordRead: 'collection',
          },
          displayFormat: '[number] — [name]',
          validation: {
            maxLength: 20,
          },
        },
        {
          key: 'purchPmtDiscCreditAcc',
          label: 'Purchase Payment Discount Credit Account',
          type: 'lookup',
          valueType: 'code',
          defaultValue: '',
          lookup: {
            endpoint: '/glAccounts',
            valueField: 'number',
            displayField: 'number',
            searchFields: ['number', 'name'],
            recordRead: 'collection',
          },
          displayFormat: '[number] — [name]',
          validation: {
            maxLength: 20,
          },
        },
        {
          key: 'cogsAccount',
          label: 'Cogs Account',
          type: 'lookup',
          valueType: 'code',
          defaultValue: '',
          lookup: {
            endpoint: '/glAccounts',
            valueField: 'number',
            displayField: 'number',
            searchFields: ['number', 'name'],
            recordRead: 'collection',
          },
          displayFormat: '[number] — [name]',
          validation: {
            maxLength: 20,
          },
        },
        {
          key: 'inventoryAdjmtAccount',
          label: 'Inventory Adjustment Account',
          type: 'lookup',
          valueType: 'code',
          defaultValue: '',
          lookup: {
            endpoint: '/glAccounts',
            valueField: 'number',
            displayField: 'number',
            searchFields: ['number', 'name'],
            recordRead: 'collection',
          },
          displayFormat: '[number] — [name]',
          validation: {
            maxLength: 20,
          },
        },
        {
          key: 'directCostAppliedAccount',
          label: 'Direct Cost Applied Account',
          type: 'lookup',
          valueType: 'code',
          defaultValue: '',
          lookup: {
            endpoint: '/glAccounts',
            valueField: 'number',
            displayField: 'number',
            searchFields: ['number', 'name'],
            recordRead: 'collection',
          },
          displayFormat: '[number] — [name]',
          validation: {
            maxLength: 20,
          },
        },
        {
          key: 'overheadAppliedAccount',
          label: 'Overhead Applied Account',
          type: 'lookup',
          valueType: 'code',
          defaultValue: '',
          lookup: {
            endpoint: '/glAccounts',
            valueField: 'number',
            displayField: 'number',
            searchFields: ['number', 'name'],
            recordRead: 'collection',
          },
          displayFormat: '[number] — [name]',
          validation: {
            maxLength: 20,
          },
        },
      ],
    },
  ],
};

// List page.
export const generalPostingSetupListConfig: ListPageConfig & {
  dataSource: DataSourceConfig;
} = {
  pageId: 'general-posting-setup',
  pageType: 'card',
  title: 'General Posting Setup',
  dataSource: {
    endpoint: '/generalPostingSetup',
    keyField: 'systemId',
    defaultSort: 'genBusPostingGroup asc',
  },
  identity: {
    primaryField: '__display_genBusPostingGroup',
  },
  module: 'Finance',
  menu: {
    module: 'Finance',
    group: 'Posting Setup',
    icon: 'ts-icon ts-icon-general-posting-setup',
    moduleIcon: 'ts-icon ts-icon-finance-module',
    route: '/general-posting-setup',
  },
  dataSurface: {
    columns: listColumns(generalPostingSetupHeaderConfig, [
      {
        field: 'genBusPostingGroup',
      },
      {
        field: 'genProdPostingGroup',
        width: '140px',
      },
      {
        field: 'purchAccount',
        width: '140px',
      },
      {
        field: 'purchCreditMemoAccount',
        width: '140px',
      },
      {
        field: 'cogsAccount',
        width: '140px',
      },
      {
        field: 'directCostAppliedAccount',
        width: '140px',
      },

      {
        field: 'systemModifiedAt',
      },
    ]),
  },
  factBox: generalPostingSetupFactBoxConfig,
};
