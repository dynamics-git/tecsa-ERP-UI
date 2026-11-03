import {
  DataSourceConfig,
  HeaderConfig,
  ListPageConfig,
  listColumns,
} from '../../../platform/public-api';
import { vatPostingSetupFactBoxConfig } from './vat-posting-setup.factbox.config';

// Header form.
export const vatPostingSetupHeaderConfig: HeaderConfig = {
  dialogTitle: 'VAT Posting Setup',
  toolbarButtons: [],
  sections: [
    {
      id: 'general',
      title: 'General',
      fields: [
        {
          key: 'vatCalculationType',
          label: 'Vat Calculation Type',
          type: 'dropdown',
          defaultValue: 'normal',
          options: [
            {
              label: 'Normal',
              value: 'normal',
            },
            {
              label: 'Reverse charge',
              value: 'reverse_charge',
            },
            {
              label: 'Full',
              value: 'full',
            },
            {
              label: 'Sales tax',
              value: 'sales_tax',
            },
          ],
        },
        {
          key: 'vatPercent',
          label: 'Vat Percent',
          type: 'decimal',
          defaultValue: '0',
          validation: {
            min: 0,
            max: 100,
            precision: 9,
            scale: 6,
          },
        },
        {
          key: 'vatIdentifier',
          label: 'Vat Identifier',
          type: 'text',
          validation: {
            maxLength: 20,
          },
        },
        {
          key: 'description',
          label: 'Description',
          type: 'text',
          validation: {
            maxLength: 100,
          },
        },
        {
          key: 'adjustForPaymentDiscount',
          label: 'Adjust For Payment Discount',
          type: 'boolean',
          defaultValue: false,
        },
        {
          key: 'euService',
          label: 'Eu Service',
          type: 'boolean',
          defaultValue: false,
        },
        {
          key: 'taxCategory',
          label: 'Tax Category',
          type: 'text',
          validation: {
            maxLength: 10,
          },
        },
        {
          key: 'salesVatReportingCode',
          label: 'Sales VAT Reporting Code',
          type: 'text',
          validation: {
            maxLength: 20,
          },
        },
        {
          key: 'purchaseVatReportingCode',
          label: 'Purchase VAT Reporting Code',
          type: 'text',
          validation: {
            maxLength: 20,
          },
        },
        {
          key: 'allowNonDeductibleVat',
          label: 'Allow Non Deductible VAT',
          type: 'boolean',
          defaultValue: false,
        },
        {
          key: 'nonDeductibleVatPercent',
          label: 'Non Deductible VAT Percent',
          type: 'decimal',
          defaultValue: '0',
          validation: {
            min: 0,
            max: 100,
            precision: 7,
            scale: 4,
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
          key: 'vatBusinessPostingGroupId',
          label: 'Vat Business Posting Group',
          type: 'lookup',
          valueType: 'guid',
          required: true,
          readonlyAfterCreate: true,
          lookup: {
            endpoint: '/vatBusinessPostingGroups',
            valueField: 'systemId',
            displayField: 'code',
            searchFields: ['code', 'description'],
          },
          displayFormat: '[code] — [description]',
        },
        {
          key: 'vatProductPostingGroupId',
          label: 'Vat Product Posting Group',
          type: 'lookup',
          valueType: 'guid',
          required: true,
          readonlyAfterCreate: true,
          lookup: {
            endpoint: '/vatProductPostingGroups',
            valueField: 'systemId',
            displayField: 'code',
            searchFields: ['code', 'description'],
          },
          displayFormat: '[code] — [description]',
        },
        {
          key: 'salesVatAccountId',
          label: 'Sales VAT Account',
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
          key: 'purchaseVatAccountId',
          label: 'Purchase VAT Account',
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
          key: 'reverseChargeVatAccountId',
          label: 'Reverse Charge VAT Account',
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
          key: 'nonDeductiblePurchaseVatAccountId',
          label: 'Non Deductible Purchase VAT Account',
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
export const vatPostingSetupListConfig: ListPageConfig & {
  dataSource: DataSourceConfig;
} = {
  pageId: 'vat-posting-setup',
  pageType: 'card',
  title: 'VAT Posting Setup',
  dataSource: {
    endpoint: '/vatPostingSetup',
    keyField: 'systemId',
    defaultSort: 'vatBusinessPostingGroupId asc',
  },
  identity: {
    primaryField: '__display_vatBusinessPostingGroupId',
    secondaryField: 'description',
  },
  module: 'Finance',
  menu: {
    module: 'Finance',
    group: 'Tax Setup',
    icon: 'ts-icon ts-icon-vat-posting-setup',
    moduleIcon: 'ts-icon ts-icon-finance-module',
    route: '/vat-posting-setup',
  },
  dataSurface: {
    columns: listColumns(vatPostingSetupHeaderConfig, [
      {
        field: 'vatBusinessPostingGroupId',
      },
      {
        field: 'vatProductPostingGroupId',
        width: '140px',
      },
      {
        field: 'vatCalculationType',
        width: '140px',
      },
      {
        field: 'vatPercent',
        width: '140px',
      },
      {
        field: 'nonDeductibleVatPercent',
        width: '140px',
      },
      {
        field: 'purchaseVatAccountId',
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
  factBox: vatPostingSetupFactBoxConfig,
};
