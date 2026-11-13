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
          defaultValue: 0,
          options: [
            {
              label: 'Normal VAT',
              value: 0,
            },
            {
              label: 'Reverse Charge VAT',
              value: 1,
            },
            {
              label: 'Full VAT',
              value: 2,
            },
            {
              label: 'Sales Tax',
              value: 3,
            },
          ],
          valueType: 'integer',
        },
        {
          key: 'vatPercent',
          label: 'Vat Percent',
          type: 'decimal',
          defaultValue: '0',
          validation: {
            min: 0,
            max: 100,
            precision: 38,
            scale: 20,
          },
        },
        {
          key: 'vatIdentifier',
          label: 'Vat Identifier',
          type: 'code',
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
          type: 'code',
          validation: {
            maxLength: 10,
          },
        },
        {
          key: 'saleVatReportingCode',
          label: 'Sales VAT Reporting Code',
          type: 'code',
          validation: {
            maxLength: 20,
          },
        },
        {
          key: 'purchVatReportingCode',
          label: 'Purchase VAT Reporting Code',
          type: 'code',
          validation: {
            maxLength: 20,
          },
        },
        {
          key: 'allowNonDeductibleVat',
          label: 'Allow Non Deductible VAT',
          type: 'select',
          defaultValue: 0,
          valueType: 'integer',
          options: [
            {
              label: 'Do Not Allow',
              value: 0,
            },
            {
              label: 'Allow',
              value: 1,
            },
          ],
        },
        {
          key: 'nonDeductibleVatPercent',
          label: 'Non Deductible VAT Percent',
          type: 'decimal',
          defaultValue: '0',
          validation: {
            min: 0,
            max: 100,
            precision: 38,
            scale: 20,
          },
        },
      ],
    },
    {
      id: 'posting',
      title: 'Posting & Defaults',
      fields: [
        {
          key: 'vatBusPostingGroup',
          label: 'Vat Business Posting Group',
          type: 'lookup',
          valueType: 'code',
          readonlyAfterCreate: true,
          lookup: {
            endpoint: '/vatBusinessPostingGroups',
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
          key: 'vatProdPostingGroup',
          label: 'Vat Product Posting Group',
          type: 'lookup',
          valueType: 'code',
          readonlyAfterCreate: true,
          lookup: {
            endpoint: '/vatProductPostingGroups',
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
          key: 'salesVatAccount',
          label: 'Sales VAT Account',
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
          key: 'purchaseVatAccount',
          label: 'Purchase VAT Account',
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
          key: 'reverseChrgVatAcc',
          label: 'Reverse Charge VAT Account',
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
          key: 'nonDedPurchaseVatAccount',
          label: 'Non Deductible Purchase VAT Account',
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
export const vatPostingSetupListConfig: ListPageConfig & {
  dataSource: DataSourceConfig;
} = {
  pageId: 'vat-posting-setup',
  pageType: 'card',
  title: 'VAT Posting Setup',
  dataSource: {
    endpoint: '/vatPostingSetup',
    keyField: 'systemId',
    defaultSort: 'vatBusPostingGroup asc',
  },
  identity: {
    primaryField: '__display_vatBusPostingGroup',
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
        field: 'vatBusPostingGroup',
      },
      {
        field: 'vatProdPostingGroup',
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
        field: 'purchaseVatAccount',
        width: '140px',
      },

      {
        field: 'systemModifiedAt',
      },
    ]),
  },
  factBox: vatPostingSetupFactBoxConfig,
};
