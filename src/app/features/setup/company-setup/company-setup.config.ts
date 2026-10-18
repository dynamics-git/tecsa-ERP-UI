import { EntryHeaderConfig, FieldConfig } from '../../../platform/public-api';

/** The setup is one singleton row per selected company; never a fake list. */
export interface CompanySetupDefinition {
  pageId: string;
  title: string;
  resource: string;
  endpoint: string;
  header: EntryHeaderConfig;
  editableFields: string[];
}

const seriesField = (key: string, label: string): FieldConfig => ({
  key, label, type: 'dropdown', allowClear: true,
  api: '/numberSeries?perPage=100',
  valueField: 'systemId',
  displayFormat: '[code] - [description]',
});

const nonSeriesFields: FieldConfig[] = [
  {
    key: 'extDocNoMandatory', label: 'External Document No. Mandatory',
    type: 'dropdown', valueType: 'boolean', defaultValue: false,
    options: [{ label: 'Yes', value: true }, { label: 'No', value: false }],
  },
  {
    key: 'applicationBetweenCurrencies', label: 'Application Between Currencies',
    type: 'dropdown', defaultValue: 'none',
    options: [{ label: 'None', value: 'none' }, { label: 'All', value: 'all' }],
  },
];

function singleton(
  pageId: string, title: string, resource: string, endpoint: string,
  fields: Array<[string, string]>,
): CompanySetupDefinition {
  const sections = [
    { id: 'numbering', title: 'Number Series', fields: fields.map(([key, label]) => seriesField(key, label)) },
    { id: 'general', title: 'General', fields: nonSeriesFields },
  ];
  return {
    pageId, title, resource, endpoint,
    editableFields: [...fields.map(([key]) => key), ...nonSeriesFields.map(field => field.key)],
    header: { dialogTitle: title, toolbarButtons: [], sections },
  };
}

export const salesReceivablesSetup = singleton(
  'sales-receivables-setup', 'Sales & Receivables Setup',
  'sales_receivables_setup', '/salesReceivablesSetup', [
    ['customerNoSeriesId', 'Customer Nos.'],
    ['quoteNoSeriesId', 'Quote Nos.'],
    ['orderNoSeriesId', 'Order Nos.'],
    ['invoiceNoSeriesId', 'Invoice Nos.'],
    ['postedInvoiceNoSeriesId', 'Posted Invoice Nos.'],
    ['creditMemoNoSeriesId', 'Credit Memo Nos.'],
    ['postedCreditMemoNoSeriesId', 'Posted Credit Memo Nos.'],
    ['postedShipmentNoSeriesId', 'Posted Shipment Nos.'],
    ['blanketOrderNoSeriesId', 'Blanket Order Nos.'],
    ['returnOrderNoSeriesId', 'Return Order Nos.'],
    ['postedReturnReceiptNoSeriesId', 'Posted Return Receipt Nos.'],
  ],
);

export const purchasesPayablesSetup = singleton(
  'purchases-payables-setup', 'Purchases & Payables Setup',
  'purchases_payables_setup', '/purchasesPayablesSetup', [
    ['vendorNoSeriesId', 'Vendor Nos.'],
    ['requisitionNoSeriesId', 'Requisition Nos.'],
    ['quoteNoSeriesId', 'Quote Nos.'],
    ['orderNoSeriesId', 'Order Nos.'],
    ['invoiceNoSeriesId', 'Invoice Nos.'],
    ['postedInvoiceNoSeriesId', 'Posted Invoice Nos.'],
    ['creditMemoNoSeriesId', 'Credit Memo Nos.'],
    ['postedCreditMemoNoSeriesId', 'Posted Credit Memo Nos.'],
    ['postedReceiptNoSeriesId', 'Posted Receipt Nos.'],
    ['blanketOrderNoSeriesId', 'Blanket Order Nos.'],
    ['returnOrderNoSeriesId', 'Return Order Nos.'],
    ['postedReturnShipmentNoSeriesId', 'Posted Return Shipment Nos.'],
  ],
);
