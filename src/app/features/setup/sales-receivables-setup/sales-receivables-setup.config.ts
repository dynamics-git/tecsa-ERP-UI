import { DataSourceConfig, HeaderConfig, ListPageConfig } from '../../../platform/public-api';
import { salesReceivablesSetupFactBoxConfig } from './sales-receivables-setup.factbox.config';

// Header form.
export const salesReceivablesSetupHeaderConfig: HeaderConfig = {
  dialogTitle: 'Sales & Receivables Setup',
  toolbarButtons: [],
  sections: [
    {
      id: 'numbering',
      title: 'Number Series',
      fields: [
        {
          key: 'customerNos',
          label: 'Customer Nos.',
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
          key: 'postedShipmentNos',
          label: 'Posted Shipment Nos.',
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
          key: 'postedReturnReceiptNos',
          label: 'Posted Return Receipt Nos.',
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
export const salesReceivablesSetupListConfig: ListPageConfig & {
  dataSource: DataSourceConfig;
} = {
  pageId: 'sales-receivables-setup',
  pageType: 'setup',
  title: 'Sales & Receivables Setup',
  dataSource: {
    endpoint: '/salesReceivablesSetup',
    keyField: 'systemId',
    singleton: true,
    supportsCreate: false,
    supportsUpdate: true,
    supportsDelete: false,
  },
  module: 'Sales',
  menu: {
    module: 'Sales',
    group: 'Setup',
    icon: 'ts-icon ts-icon-sales-module',
    moduleIcon: 'ts-icon ts-icon-sales-module',
    route: '/sales-receivables-setup',
  },
  tools: {
    filter: false,
    advancedFilter: false,
    export: false,
    columns: false,
  },
  factBox: salesReceivablesSetupFactBoxConfig,
};
