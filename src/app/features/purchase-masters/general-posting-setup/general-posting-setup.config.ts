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
      id: 'general',
      title: 'General',
      fields: [
        {
          key: 'isActive',
          label: 'Is Active',
          type: 'boolean',
          defaultValue: true,
        },
      ],
    },
    {
      id: 'posting',
      title: 'Posting & Defaults',
      fields: [
        {
          key: 'generalBusinessPostingGroupId',
          label: 'General Business Posting Group',
          type: 'lookup',
          valueType: 'guid',
          required: true,
          readonlyAfterCreate: true,
          lookup: {
            endpoint: '/generalBusinessPostingGroups',
            valueField: 'systemId',
            displayField: 'code',
            searchFields: ['code', 'description'],
          },
          displayFormat: '[code] — [description]',
        },
        {
          key: 'generalProductPostingGroupId',
          label: 'General Product Posting Group',
          type: 'lookup',
          valueType: 'guid',
          required: true,
          readonlyAfterCreate: true,
          lookup: {
            endpoint: '/generalProductPostingGroups',
            valueField: 'systemId',
            displayField: 'code',
            searchFields: ['code', 'description'],
          },
          displayFormat: '[code] — [description]',
        },
        {
          key: 'salesAccountId',
          label: 'Sales Account',
          type: 'lookup',
          valueType: 'guid',
          defaultValue: null,
          lookup: {
            endpoint: '/glAccounts',
            valueField: 'systemId',
            displayField: 'number',
            searchFields: ['number', 'name'],
          },
          displayFormat: '[number] — [name]',
        },
        {
          key: 'salesCreditMemoAccountId',
          label: 'Sales Credit Memo Account',
          type: 'lookup',
          valueType: 'guid',
          defaultValue: null,
          lookup: {
            endpoint: '/glAccounts',
            valueField: 'systemId',
            displayField: 'number',
            searchFields: ['number', 'name'],
          },
          displayFormat: '[number] — [name]',
        },
        {
          key: 'salesLineDiscountAccountId',
          label: 'Sales Line Discount Account',
          type: 'lookup',
          valueType: 'guid',
          defaultValue: null,
          lookup: {
            endpoint: '/glAccounts',
            valueField: 'systemId',
            displayField: 'number',
            searchFields: ['number', 'name'],
          },
          displayFormat: '[number] — [name]',
        },
        {
          key: 'salesInvoiceDiscountAccountId',
          label: 'Sales Invoice Discount Account',
          type: 'lookup',
          valueType: 'guid',
          defaultValue: null,
          lookup: {
            endpoint: '/glAccounts',
            valueField: 'systemId',
            displayField: 'number',
            searchFields: ['number', 'name'],
          },
          displayFormat: '[number] — [name]',
        },
        {
          key: 'salesPaymentDiscountDebitAccountId',
          label: 'Sales Payment Discount Debit Account',
          type: 'lookup',
          valueType: 'guid',
          defaultValue: null,
          lookup: {
            endpoint: '/glAccounts',
            valueField: 'systemId',
            displayField: 'number',
            searchFields: ['number', 'name'],
          },
          displayFormat: '[number] — [name]',
        },
        {
          key: 'purchaseAccountId',
          label: 'Purchase Account',
          type: 'lookup',
          valueType: 'guid',
          defaultValue: null,
          lookup: {
            endpoint: '/glAccounts',
            valueField: 'systemId',
            displayField: 'number',
            searchFields: ['number', 'name'],
          },
          displayFormat: '[number] — [name]',
        },
        {
          key: 'purchaseCreditMemoAccountId',
          label: 'Purchase Credit Memo Account',
          type: 'lookup',
          valueType: 'guid',
          defaultValue: null,
          lookup: {
            endpoint: '/glAccounts',
            valueField: 'systemId',
            displayField: 'number',
            searchFields: ['number', 'name'],
          },
          displayFormat: '[number] — [name]',
        },
        {
          key: 'purchaseLineDiscountAccountId',
          label: 'Purchase Line Discount Account',
          type: 'lookup',
          valueType: 'guid',
          defaultValue: null,
          lookup: {
            endpoint: '/glAccounts',
            valueField: 'systemId',
            displayField: 'number',
            searchFields: ['number', 'name'],
          },
          displayFormat: '[number] — [name]',
        },
        {
          key: 'purchaseInvoiceDiscountAccountId',
          label: 'Purchase Invoice Discount Account',
          type: 'lookup',
          valueType: 'guid',
          defaultValue: null,
          lookup: {
            endpoint: '/glAccounts',
            valueField: 'systemId',
            displayField: 'number',
            searchFields: ['number', 'name'],
          },
          displayFormat: '[number] — [name]',
        },
        {
          key: 'purchasePaymentDiscountCreditAccountId',
          label: 'Purchase Payment Discount Credit Account',
          type: 'lookup',
          valueType: 'guid',
          defaultValue: null,
          lookup: {
            endpoint: '/glAccounts',
            valueField: 'systemId',
            displayField: 'number',
            searchFields: ['number', 'name'],
          },
          displayFormat: '[number] — [name]',
        },
        {
          key: 'cogsAccountId',
          label: 'Cogs Account',
          type: 'lookup',
          valueType: 'guid',
          defaultValue: null,
          lookup: {
            endpoint: '/glAccounts',
            valueField: 'systemId',
            displayField: 'number',
            searchFields: ['number', 'name'],
          },
          displayFormat: '[number] — [name]',
        },
        {
          key: 'inventoryAdjustmentAccountId',
          label: 'Inventory Adjustment Account',
          type: 'lookup',
          valueType: 'guid',
          defaultValue: null,
          lookup: {
            endpoint: '/glAccounts',
            valueField: 'systemId',
            displayField: 'number',
            searchFields: ['number', 'name'],
          },
          displayFormat: '[number] — [name]',
        },
        {
          key: 'directCostAppliedAccountId',
          label: 'Direct Cost Applied Account',
          type: 'lookup',
          valueType: 'guid',
          defaultValue: null,
          lookup: {
            endpoint: '/glAccounts',
            valueField: 'systemId',
            displayField: 'number',
            searchFields: ['number', 'name'],
          },
          displayFormat: '[number] — [name]',
        },
        {
          key: 'overheadAppliedAccountId',
          label: 'Overhead Applied Account',
          type: 'lookup',
          valueType: 'guid',
          defaultValue: null,
          lookup: {
            endpoint: '/glAccounts',
            valueField: 'systemId',
            displayField: 'number',
            searchFields: ['number', 'name'],
          },
          displayFormat: '[number] — [name]',
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
  autoSave: true,
  dataSource: {
    endpoint: '/generalPostingSetup',
    keyField: 'systemId',
    defaultSort: 'generalBusinessPostingGroupId asc',
  },
  identity: {
    primaryField: '__display_generalBusinessPostingGroupId',
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
        field: 'generalBusinessPostingGroupId',
      },
      {
        field: 'generalProductPostingGroupId',
        width: '140px',
      },
      {
        field: 'purchaseAccountId',
        width: '140px',
      },
      {
        field: 'purchaseCreditMemoAccountId',
        width: '140px',
      },
      {
        field: 'cogsAccountId',
        width: '140px',
      },
      {
        field: 'directCostAppliedAccountId',
        width: '140px',
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
  factBox: generalPostingSetupFactBoxConfig,
};
