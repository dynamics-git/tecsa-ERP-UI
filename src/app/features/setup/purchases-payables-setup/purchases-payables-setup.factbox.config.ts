import type { FactBoxConfig } from '../../../platform/public-api';

export const purchasesPayablesSetupFactBoxConfig: FactBoxConfig = {
  enabled: true,
  sections: [
    {
      id: 'setup',
      title: 'Setup',
      fields: [
        {
          id: 'vendorNoSeriesId',
          field: 'vendorNoSeriesId',
          label: 'Vendor No Series',
        },
        {
          id: 'requisitionNoSeriesId',
          field: 'requisitionNoSeriesId',
          label: 'Requisition No Series',
        },
        {
          id: 'orderNoSeriesId',
          field: 'orderNoSeriesId',
          label: 'Order No Series',
        },
        {
          id: 'postedReceiptNoSeriesId',
          field: 'postedReceiptNoSeriesId',
          label: 'Posted Receipt No Series',
        },
        {
          id: 'invoiceNoSeriesId',
          field: 'invoiceNoSeriesId',
          label: 'Invoice No Series',
        },
        {
          id: 'postedInvoiceNoSeriesId',
          field: 'postedInvoiceNoSeriesId',
          label: 'Posted Invoice No Series',
        },
        {
          id: 'extDocNoMandatory',
          field: 'extDocNoMandatory',
          label: 'Ext Doc No Mandatory',
        },
        {
          id: 'applicationBetweenCurrencies',
          field: 'applicationBetweenCurrencies',
          label: 'Application Between Currencies',
        },
      ],
    },
  ],
};
