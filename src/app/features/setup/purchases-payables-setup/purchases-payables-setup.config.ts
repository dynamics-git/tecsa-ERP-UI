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
          valueType: 'code',
          lookup: {
            endpoint: '/numberSeries',
            valueField: 'code',
            recordRead: 'collection',
            displayField: 'code',
            searchFields: ['code', 'description'],
          },
          displayFormat: '[code] — [description]',
        },
        {
          key: 'requisitionNos',
          label: 'Requisition Nos.',
          type: 'lookup',
          valueType: 'code',
          lookup: {
            endpoint: '/numberSeries',
            valueField: 'code',
            recordRead: 'collection',
            displayField: 'code',
            searchFields: ['code', 'description'],
          },
          displayFormat: '[code] — [description]',
        },
        {
          key: 'quoteNos',
          label: 'Quote Nos.',
          type: 'lookup',
          valueType: 'code',
          lookup: {
            endpoint: '/numberSeries',
            valueField: 'code',
            recordRead: 'collection',
            displayField: 'code',
            searchFields: ['code', 'description'],
          },
          displayFormat: '[code] — [description]',
        },
        {
          key: 'orderNos',
          label: 'Order Nos.',
          type: 'lookup',
          valueType: 'code',
          lookup: {
            endpoint: '/numberSeries',
            valueField: 'code',
            recordRead: 'collection',
            displayField: 'code',
            searchFields: ['code', 'description'],
          },
          displayFormat: '[code] — [description]',
        },
        {
          key: 'invoiceNos',
          label: 'Invoice Nos.',
          type: 'lookup',
          valueType: 'code',
          lookup: {
            endpoint: '/numberSeries',
            valueField: 'code',
            recordRead: 'collection',
            displayField: 'code',
            searchFields: ['code', 'description'],
          },
          displayFormat: '[code] — [description]',
        },
        {
          key: 'postedInvoiceNos',
          label: 'Posted Invoice Nos.',
          type: 'lookup',
          valueType: 'code',
          lookup: {
            endpoint: '/numberSeries',
            valueField: 'code',
            recordRead: 'collection',
            displayField: 'code',
            searchFields: ['code', 'description'],
          },
          displayFormat: '[code] — [description]',
        },
        {
          key: 'creditMemoNos',
          label: 'Credit Memo Nos.',
          type: 'lookup',
          valueType: 'code',
          lookup: {
            endpoint: '/numberSeries',
            valueField: 'code',
            recordRead: 'collection',
            displayField: 'code',
            searchFields: ['code', 'description'],
          },
          displayFormat: '[code] — [description]',
        },
        {
          key: 'postedCreditMemoNos',
          label: 'Posted Credit Memo Nos.',
          type: 'lookup',
          valueType: 'code',
          lookup: {
            endpoint: '/numberSeries',
            valueField: 'code',
            recordRead: 'collection',
            displayField: 'code',
            searchFields: ['code', 'description'],
          },
          displayFormat: '[code] — [description]',
        },
        {
          key: 'postedReceiptNos',
          label: 'Posted Receipt Nos.',
          type: 'lookup',
          valueType: 'code',
          lookup: {
            endpoint: '/numberSeries',
            valueField: 'code',
            recordRead: 'collection',
            displayField: 'code',
            searchFields: ['code', 'description'],
          },
          displayFormat: '[code] — [description]',
        },
        {
          key: 'blanketOrderNos',
          label: 'Blanket Order Nos.',
          type: 'lookup',
          valueType: 'code',
          lookup: {
            endpoint: '/numberSeries',
            valueField: 'code',
            recordRead: 'collection',
            displayField: 'code',
            searchFields: ['code', 'description'],
          },
          displayFormat: '[code] — [description]',
        },
        {
          key: 'returnOrderNos',
          label: 'Return Order Nos.',
          type: 'lookup',
          valueType: 'code',
          lookup: {
            endpoint: '/numberSeries',
            valueField: 'code',
            recordRead: 'collection',
            displayField: 'code',
            searchFields: ['code', 'description'],
          },
          displayFormat: '[code] — [description]',
        },
        {
          key: 'postedReturnShptNos',
          label: 'Posted Return Shipment Nos.',
          type: 'lookup',
          valueType: 'code',
          lookup: {
            endpoint: '/numberSeries',
            valueField: 'code',
            recordRead: 'collection',
            displayField: 'code',
            searchFields: ['code', 'description'],
          },
          displayFormat: '[code] — [description]',
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
          key: 'applicationBetweenCurrencies',
          label: 'Application Between Currencies',
          type: 'dropdown',
          defaultValue: 'none',
          options: [
            {
              label: 'None',
              value: 'none',
            },
            {
              label: 'All',
              value: 'all',
            },
          ],
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
