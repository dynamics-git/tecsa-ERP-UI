import type { FactBoxConfig } from '../../../platform/public-api';

export const purchasesPayablesSetupFactBoxConfig: FactBoxConfig = {
  enabled: true,
  sections: [
    {
      id: 'setup',
      title: 'Setup',
      fields: [
        {
          id: 'vendorNos',
          field: 'vendorNos',
          label: 'Vendor No Series',
        },

        {
          id: 'orderNos',
          field: 'orderNos',
          label: 'Order No Series',
        },
        {
          id: 'postedReceiptNos',
          field: 'postedReceiptNos',
          label: 'Posted Receipt No Series',
        },
        {
          id: 'invoiceNos',
          field: 'invoiceNos',
          label: 'Invoice No Series',
        },
        {
          id: 'postedInvoiceNos',
          field: 'postedInvoiceNos',
          label: 'Posted Invoice No Series',
        },
        {
          id: 'extDocNoMandatory',
          field: 'extDocNoMandatory',
          label: 'Ext Doc No Mandatory',
        },
        {
          id: 'applnBetweenCurrencies',
          field: 'applnBetweenCurrencies',
          label: 'Application Between Currencies',
        },
      ],
    },
  ],
};
