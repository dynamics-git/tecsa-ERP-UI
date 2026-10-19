import { DataSourceConfig, HeaderConfig, ListPageConfig } from '../../../platform/public-api';
import { numberSeriesField } from '../number-series-field';

const series = [
  ['customerNoSeriesId', 'Customer Nos.'], ['quoteNoSeriesId', 'Quote Nos.'], ['orderNoSeriesId', 'Order Nos.'],
  ['invoiceNoSeriesId', 'Invoice Nos.'], ['postedInvoiceNoSeriesId', 'Posted Invoice Nos.'], ['creditMemoNoSeriesId', 'Credit Memo Nos.'],
  ['postedCreditMemoNoSeriesId', 'Posted Credit Memo Nos.'], ['postedShipmentNoSeriesId', 'Posted Shipment Nos.'],
  ['blanketOrderNoSeriesId', 'Blanket Order Nos.'], ['returnOrderNoSeriesId', 'Return Order Nos.'], ['postedReturnReceiptNoSeriesId', 'Posted Return Receipt Nos.'],
];
export const salesReceivablesSetupListConfig: ListPageConfig & { dataSource: DataSourceConfig } = {
  pageId: 'sales-receivables-setup', pageType: 'setup', title: 'Sales & Receivables Setup', module: 'Sales',
  menu: { module: 'Sales', group: 'Setup', icon: 'bi bi-gear', route: '/sales-receivables-setup' },
  tools: { filter: false, advancedFilter: false, export: false, columns: false },
  dataSource: { endpoint: '/salesReceivablesSetup', singleton: true, keyField: 'systemId',
    supportsCreate: false, supportsUpdate: true, supportsDelete: false,
    updateFields: [...series.map(([key]) => key), 'extDocNoMandatory', 'applicationBetweenCurrencies'],
  },
};
export const salesReceivablesSetupHeaderConfig: HeaderConfig = {
  dialogTitle: 'Sales & Receivables Setup', toolbarButtons: [{ label: 'Save', actionKey: 'cmd:save', isPrimary: true, icon: 'bi bi-check-lg' }],
  sections: [
    { id: 'numbering', title: 'Number Series', fields: series.map(([key, label]) => numberSeriesField(key, label)) },
    { id: 'general', title: 'General', fields: [
      { key: 'extDocNoMandatory', label: 'External Document No. Mandatory', type: 'boolean', valueType: 'boolean', defaultValue: false },
      { key: 'applicationBetweenCurrencies', label: 'Application Between Currencies', type: 'select', defaultValue: 'none', options: [{ label: 'None', value: 'none' }, { label: 'All', value: 'all' }] },
    ] },
  ],
};
