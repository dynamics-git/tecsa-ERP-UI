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
          readonlyAfterCreate: true,
        },
        {
          key: 'description',
          label: 'Description',
          type: 'text',
          validation: {
            maxLength: 100,
          },
        },
      ],
    },
    {
      id: 'posting',
      title: 'Posting & Defaults',
      fields: [
        {
          key: 'payablesAccount',
          label: 'Payables Account',
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
          key: 'serviceChargeAcc',
          label: 'Service Charge Account',
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
          key: 'paymentDiscDebitAcc',
          label: 'Payment Discount Debit Account',
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
          key: 'paymentDiscCreditAcc',
          label: 'Payment Discount Credit Account',
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
          key: 'paymentToleranceDebitAcc',
          label: 'Payment Tolerance Debit Account',
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
          key: 'paymentToleranceCreditAcc',
          label: 'Payment Tolerance Credit Account',
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
          key: 'invoiceRoundingAccount',
          label: 'Invoice Rounding Account',
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
          key: 'debitCurrApplnRndgAcc',
          label: 'Debit Currency Application Rounding Account',
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
          key: 'creditCurrApplnRndgAcc',
          label: 'Credit Currency Application Rounding Account',
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
          key: 'debitRoundingAccount',
          label: 'Debit Rounding Account',
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
          key: 'creditRoundingAccount',
          label: 'Credit Rounding Account',
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
export const vendorPostingGroupsListConfig: ListPageConfig & {
  dataSource: DataSourceConfig;
} = {
  pageId: 'vendor-posting-groups',
  pageType: 'card',
  title: 'Vendor Posting Groups',
  dataSource: {
    endpoint: '/vendorPostingGroups',
    keyField: 'systemId',
    defaultSort: 'code asc',
    headerPKProp: 'code',
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
        field: 'payablesAccount',
        width: '140px',
      },
      {
        field: 'paymentDiscDebitAcc',
        width: '140px',
      },
      {
        field: 'paymentDiscCreditAcc',
        width: '140px',
      },
      {
        field: 'invoiceRoundingAccount',
        width: '140px',
      },

      {
        field: 'systemModifiedAt',
      },
    ]),
  },
  factBox: vendorPostingGroupsFactBoxConfig,
};
