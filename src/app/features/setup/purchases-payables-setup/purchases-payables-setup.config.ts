import { DataSourceConfig, HeaderConfig, ListPageConfig } from '../../../platform/public-api';
import { numberSeriesField } from '../number-series-field';

const series = [
  ['vendorNoSeriesId', 'Vendor Nos.'], ['requisitionNoSeriesId', 'Requisition Nos.'], ['quoteNoSeriesId', 'Quote Nos.'],
  ['orderNoSeriesId', 'Order Nos.'], ['invoiceNoSeriesId', 'Invoice Nos.'], ['postedInvoiceNoSeriesId', 'Posted Invoice Nos.'],
  ['creditMemoNoSeriesId', 'Credit Memo Nos.'], ['postedCreditMemoNoSeriesId', 'Posted Credit Memo Nos.'],
  ['postedReceiptNoSeriesId', 'Posted Receipt Nos.'], ['blanketOrderNoSeriesId', 'Blanket Order Nos.'],
  ['returnOrderNoSeriesId', 'Return Order Nos.'], ['postedReturnShipmentNoSeriesId', 'Posted Return Shipment Nos.'],
];
export const purchasesPayablesSetupListConfig: ListPageConfig & { dataSource: DataSourceConfig } = {
  pageId: 'purchases-payables-setup', pageType: 'setup', title: 'Purchases & Payables Setup', module: 'Purchase',
  menu: { module: 'Purchase', group: 'Setup', icon: 'bi bi-gear', route: '/purchases-payables-setup' },
  tools: { filter: false, advancedFilter: false, export: false, columns: false },
  dataSource: { endpoint: '/purchasesPayablesSetup', singleton: true, keyField: 'systemId',
    supportsCreate: false, supportsUpdate: true, supportsDelete: false,
    updateFields: [...series.map(([key]) => key), 'extDocNoMandatory', 'applicationBetweenCurrencies'],
  },
};
export const purchasesPayablesSetupHeaderConfig: HeaderConfig = {
  dialogTitle: 'Purchases & Payables Setup', toolbarButtons: [{ label: 'Save', actionKey: 'cmd:save', isPrimary: true, icon: 'bi bi-check-lg' }],
  sections: [
    { id: 'numbering', title: 'Number Series', fields: series.map(([key, label]) => numberSeriesField(key, label)) },
    { id: 'general', title: 'General', fields: [
      { key: 'extDocNoMandatory', label: 'External Document No. Mandatory', type: 'boolean', valueType: 'boolean', defaultValue: false },
      { key: 'applicationBetweenCurrencies', label: 'Application Between Currencies', type: 'select', defaultValue: 'none', options: [{ label: 'None', value: 'none' }, { label: 'All', value: 'all' }] },
    ] },
  ],
};
