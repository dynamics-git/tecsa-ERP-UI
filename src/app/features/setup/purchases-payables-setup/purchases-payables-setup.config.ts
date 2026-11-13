import { DataSourceConfig, HeaderConfig, ListPageConfig } from '../../../platform/public-api';
import { purchasesPayablesSetupFactBoxConfig } from './purchases-payables-setup.factbox.config';

// Header form.
export const purchasesPayablesSetupHeaderConfig: HeaderConfig = {
  dialogTitle: 'Purchases & Payables Setup',
  toolbarButtons: [],
  sections: [
    {
      id: 'numbering',
      title: 'Number Series',
      fields: [
        {
          key: 'vendorNos',
          label: 'Vendor Nos.',
          type: 'lookup',
          defaultValue: '',
          lookup: {
            endpoint: '/noSeries',
            valueField: 'code',
            displayField: 'code',
            searchFields: ['code', 'description'],
            recordRead: 'collection',
          },
          displayFormat: '[code] — [description]',
          validation: {
            maxLength: 20,
          },
          valueType: 'code',
        },

        {
          key: 'quoteNos',
          label: 'Quote Nos.',
          type: 'lookup',
          defaultValue: '',
          lookup: {
            endpoint: '/noSeries',
            valueField: 'code',
            displayField: 'code',
            searchFields: ['code', 'description'],
            recordRead: 'collection',
          },
          displayFormat: '[code] — [description]',
          validation: {
            maxLength: 20,
          },
          valueType: 'code',
        },
        {
          key: 'orderNos',
          label: 'Order Nos.',
          type: 'lookup',
          defaultValue: '',
          lookup: {
            endpoint: '/noSeries',
            valueField: 'code',
            displayField: 'code',
            searchFields: ['code', 'description'],
            recordRead: 'collection',
          },
          displayFormat: '[code] — [description]',
          validation: {
            maxLength: 20,
          },
          valueType: 'code',
        },
        {
          key: 'invoiceNos',
          label: 'Invoice Nos.',
          type: 'lookup',
          defaultValue: '',
          lookup: {
            endpoint: '/noSeries',
            valueField: 'code',
            displayField: 'code',
            searchFields: ['code', 'description'],
            recordRead: 'collection',
          },
          displayFormat: '[code] — [description]',
          validation: {
            maxLength: 20,
          },
          valueType: 'code',
        },
        {
          key: 'postedInvoiceNos',
          label: 'Posted Invoice Nos.',
          type: 'lookup',
          defaultValue: '',
          lookup: {
            endpoint: '/noSeries',
            valueField: 'code',
            displayField: 'code',
            searchFields: ['code', 'description'],
            recordRead: 'collection',
          },
          displayFormat: '[code] — [description]',
          validation: {
            maxLength: 20,
          },
          valueType: 'code',
        },
        {
          key: 'creditMemoNos',
          label: 'Credit Memo Nos.',
          type: 'lookup',
          defaultValue: '',
          lookup: {
            endpoint: '/noSeries',
            valueField: 'code',
            displayField: 'code',
            searchFields: ['code', 'description'],
            recordRead: 'collection',
          },
          displayFormat: '[code] — [description]',
          validation: {
            maxLength: 20,
          },
          valueType: 'code',
        },
        {
          key: 'postedCreditMemoNos',
          label: 'Posted Credit Memo Nos.',
          type: 'lookup',
          defaultValue: '',
          lookup: {
            endpoint: '/noSeries',
            valueField: 'code',
            displayField: 'code',
            searchFields: ['code', 'description'],
            recordRead: 'collection',
          },
          displayFormat: '[code] — [description]',
          validation: {
            maxLength: 20,
          },
          valueType: 'code',
        },
        {
          key: 'postedReceiptNos',
          label: 'Posted Receipt Nos.',
          type: 'lookup',
          defaultValue: '',
          lookup: {
            endpoint: '/noSeries',
            valueField: 'code',
            displayField: 'code',
            searchFields: ['code', 'description'],
            recordRead: 'collection',
          },
          displayFormat: '[code] — [description]',
          validation: {
            maxLength: 20,
          },
          valueType: 'code',
        },
        {
          key: 'blanketOrderNos',
          label: 'Blanket Order Nos.',
          type: 'lookup',
          defaultValue: '',
          lookup: {
            endpoint: '/noSeries',
            valueField: 'code',
            displayField: 'code',
            searchFields: ['code', 'description'],
            recordRead: 'collection',
          },
          displayFormat: '[code] — [description]',
          validation: {
            maxLength: 20,
          },
          valueType: 'code',
        },
        {
          key: 'returnOrderNos',
          label: 'Return Order Nos.',
          type: 'lookup',
          defaultValue: '',
          lookup: {
            endpoint: '/noSeries',
            valueField: 'code',
            displayField: 'code',
            searchFields: ['code', 'description'],
            recordRead: 'collection',
          },
          displayFormat: '[code] — [description]',
          validation: {
            maxLength: 20,
          },
          valueType: 'code',
        },
        {
          key: 'postedReturnShptNos',
          label: 'Posted Return Shipment Nos.',
          type: 'lookup',
          defaultValue: '',
          lookup: {
            endpoint: '/noSeries',
            valueField: 'code',
            displayField: 'code',
            searchFields: ['code', 'description'],
            recordRead: 'collection',
          },
          displayFormat: '[code] — [description]',
          validation: {
            maxLength: 20,
          },
          valueType: 'code',
        },
      ],
    },
    {
      id: 'general',
      title: 'General',
      fields: [
        {
          key: 'extDocNoMandatory',
          label: 'External Document No. Mandatory',
          type: 'boolean',
          defaultValue: false,
        },
        {
          key: 'applnBetweenCurrencies',
          label: 'Application Between Currencies',
          type: 'dropdown',
          defaultValue: 0,
          options: [
            {
              label: 'None',
              value: 0,
            },
            {
              label: 'EMU',
              value: 1,
            },
            {
              label: 'All',
              value: 2,
            },
          ],
          valueType: 'integer',
        },
      ],
    },
  ],
};

// List page.
export const purchasesPayablesSetupListConfig: ListPageConfig & {
  dataSource: DataSourceConfig;
} = {
  pageId: 'purchases-payables-setup',
  pageType: 'setup',
  title: 'Purchases & Payables Setup',
  dataSource: {
    endpoint: '/purchasesPayablesSetup',
    keyField: 'systemId',
    singleton: true,
    supportsCreate: false,
    supportsUpdate: true,
    supportsDelete: false,
  },
  module: 'Purchase',
  menu: {
    module: 'Purchase',
    group: 'Setup',
    icon: 'ts-icon ts-icon-purchases-payables-setup',
    moduleIcon: 'ts-icon ts-icon-purchase-module',
    route: '/purchases-payables-setup',
  },
  tools: {
    filter: false,
    advancedFilter: false,
    export: false,
    columns: false,
  },
  factBox: purchasesPayablesSetupFactBoxConfig,
};
