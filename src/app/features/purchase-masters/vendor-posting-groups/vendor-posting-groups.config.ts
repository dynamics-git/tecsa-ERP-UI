import {
  DataSourceConfig,
  HeaderConfig,
  ListPageConfig,
  listColumns,
} from '../../../platform/public-api';
import { vendorPostingGroupsFactBoxConfig } from './vendor-posting-groups.factbox.config';

// Header form.
export const vendorPostingGroupsHeaderConfig: HeaderConfig = {
  dialogTitle: 'Vendor Posting Groups',
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
            maxLength: 20,
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
    {
      id: 'posting',
      title: 'Posting & Defaults',
      fields: [
        {
          key: 'payablesAccountId',
          label: 'Payables Account',
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
          key: 'serviceChargeAccountId',
          label: 'Service Charge Account',
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
          key: 'paymentDiscountDebitAccountId',
          label: 'Payment Discount Debit Account',
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
          key: 'paymentDiscountCreditAccountId',
          label: 'Payment Discount Credit Account',
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
          key: 'paymentToleranceDebitAccountId',
          label: 'Payment Tolerance Debit Account',
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
          key: 'paymentToleranceCreditAccountId',
          label: 'Payment Tolerance Credit Account',
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
          key: 'invoiceRoundingAccountId',
          label: 'Invoice Rounding Account',
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
          key: 'debitCurrencyApplicationRoundingAccountId',
          label: 'Debit Currency Application Rounding Account',
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
          key: 'creditCurrencyApplicationRoundingAccountId',
          label: 'Credit Currency Application Rounding Account',
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
          key: 'debitRoundingAccountId',
          label: 'Debit Rounding Account',
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
          key: 'creditRoundingAccountId',
          label: 'Credit Rounding Account',
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
export const vendorPostingGroupsListConfig: ListPageConfig & {
  dataSource: DataSourceConfig;
} = {
  pageId: 'vendor-posting-groups',
  pageType: 'card',
  title: 'Vendor Posting Groups',
  autoSave: true,
  dataSource: {
    endpoint: '/vendorPostingGroups',
    keyField: 'systemId',
    defaultSort: 'code asc',
  },
  identity: {
    primaryField: 'code',
    secondaryField: 'description',
  },
  module: 'Purchase',
  menu: {
    module: 'Purchase',
    group: 'Setup',
    icon: 'ts-icon ts-icon-vendor-posting-groups',
    moduleIcon: 'ts-icon ts-icon-purchase-module',
    route: '/vendor-posting-groups',
  },
  dataSurface: {
    columns: listColumns(vendorPostingGroupsHeaderConfig, [
      {
        field: 'code',
      },
      {
        field: 'description',
      },
      {
        field: 'payablesAccountId',
        width: '140px',
      },
      {
        field: 'paymentDiscountDebitAccountId',
        width: '140px',
      },
      {
        field: 'paymentDiscountCreditAccountId',
        width: '140px',
      },
      {
        field: 'invoiceRoundingAccountId',
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
  factBox: vendorPostingGroupsFactBoxConfig,
};
