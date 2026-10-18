import { DataSourceConfig, EntryHeaderConfig, ListPageConfig } from '../../../platform/public-api';

/**
 * Customer master: one common Card/List runtime, no page-specific CRUD handlers.
 * Fields and permissions follow Laravel CustomerRequest/CustomerResource.
 */
const customerFields = [
  'name', 'name2', 'searchName', 'address', 'address2', 'city', 'state',
  'postalCode', 'countryCode', 'contact', 'phoneNumber', 'email', 'website',
  'taxRegistrationNumber', 'customerPostingGroupId', 'generalBusinessPostingGroupId',
  'vatBusinessPostingGroupId', 'paymentTermsId', 'paymentMethodId', 'currencyId',
  'creditLimit', 'pricesIncludingVat', 'blocked',
];

export const customerHeaderConfig: EntryHeaderConfig = {
  dialogTitle: 'Customer',
  toolbarButtons: [],
  sections: [
    {
      id: 'identity', title: 'General',
      fields: [
        { key: 'number', label: 'Customer No.', type: 'text', readonly: true,
          factPanel: { sectionId: 'identity', sectionTitle: 'Customer', order: 10 } },
        { key: 'name', label: 'Name', type: 'text', required: true, width: 'wide' },
        { key: 'name2', label: 'Name 2', type: 'text' },
        { key: 'searchName', label: 'Search Name', type: 'text' },
        { key: 'blocked', label: 'Blocked', type: 'dropdown',
          options: [
            { label: 'Not blocked', value: 'none' },
            { label: 'Shipment', value: 'ship' },
            { label: 'Invoice', value: 'invoice' },
            { label: 'All', value: 'all' },
          ],
          defaultValue: 'none', factPanel: { sectionId: 'identity', sectionTitle: 'Customer', order: 20 } },
      ],
    },
    {
      id: 'contact', title: 'Address & Contact',
      fields: [
        { key: 'address', label: 'Address', type: 'text', width: 'wide' },
        { key: 'address2', label: 'Address 2', type: 'text', width: 'wide' },
        { key: 'city', label: 'City', type: 'text' },
        { key: 'state', label: 'State', type: 'text' },
        { key: 'postalCode', label: 'Postal Code', type: 'text' },
        { key: 'countryCode', label: 'Country Code', type: 'text' },
        { key: 'contact', label: 'Contact Name', type: 'text' },
        { key: 'phoneNumber', label: 'Phone Number', type: 'text' },
        { key: 'email', label: 'Email', type: 'text' },
        { key: 'website', label: 'Website', type: 'text' },
      ],
    },
    {
      id: 'invoicing', title: 'Invoicing & Payment',
      fields: [
        { key: 'customerPostingGroupId', label: 'Customer Posting Group', type: 'dropdown',
          api: '/customerPostingGroups?perPage=100', valueField: 'systemId', labelField: 'code' },
        { key: 'generalBusinessPostingGroupId', label: 'General Business Posting Group', type: 'dropdown',
          api: '/generalBusinessPostingGroups?perPage=100', valueField: 'systemId', labelField: 'code' },
        { key: 'vatBusinessPostingGroupId', label: 'VAT Business Posting Group', type: 'dropdown',
          api: '/vatBusinessPostingGroups?perPage=100', valueField: 'systemId', labelField: 'code' },
        { key: 'paymentTermsId', label: 'Payment Terms', type: 'dropdown',
          api: '/paymentTerms?perPage=100', valueField: 'systemId', labelField: 'code' },
        { key: 'paymentMethodId', label: 'Payment Method', type: 'dropdown',
          api: '/paymentMethods?perPage=100', valueField: 'systemId', labelField: 'code' },
        { key: 'currencyId', label: 'Currency', type: 'dropdown',
          api: '/currencies?perPage=100', valueField: 'systemId', labelField: 'code' },
        { key: 'taxRegistrationNumber', label: 'Tax Registration No.', type: 'text' },
        { key: 'creditLimit', label: 'Credit Limit', type: 'number', valueType: 'number', defaultValue: 0 },
        { key: 'pricesIncludingVat', label: 'Prices Including VAT', type: 'boolean',
          valueType: 'boolean', defaultValue: false },
      ],
    },
  ],
};

export const customerListConfig: ListPageConfig & { dataSource: DataSourceConfig } = {
  pageId: 'customer',
  permissionResource: 'customers',
  pageType: 'card',
  title: 'Customers',
  module: 'Sales',
  viewSuffix: 'customers',
  views: [{ id: 'all', label: 'All Customers' }],
  activeViewId: 'all',
  tools: { refresh: true, filter: true, advancedFilter: true, columns: true },
  commandSelectionPolicy: { defaultMode: 'single' },
  filterConfig: { enabled: true, storageKey: 'customer-list' },
  commands: [],
  dataSource: {
    endpoint: '/customers',
    transport: 'laravel',
    keyField: 'systemId',
    documentNoField: 'number',
    autoGenerateNumber: true,
    lazyCreateOnFirstInput: true,
    pageSize: 25,
    maxPageSize: 100,
    supportsCreate: true,
    supportsUpdate: true,
    supportsDelete: false, // Backend has no DELETE /customers; retain referenced accounting masters.
    createFields: customerFields,
    updateFields: customerFields,
  },
  dataSurface: {
    id: 'customer-list', mode: 'table', idField: 'systemId',
    columns: [
      { field: 'number', label: 'No.', width: '130px', isPrimary: true,
        factPanel: { sectionId: 'customer', sectionTitle: 'Customer', order: 10 } },
      { field: 'name', label: 'Name', width: '290px',
        factPanel: { sectionId: 'customer', sectionTitle: 'Customer', order: 20 } },
      { field: 'city', label: 'City', width: '140px' },
      { field: 'contact', label: 'Contact', width: '180px' },
      { field: 'phoneNumber', label: 'Phone', width: '150px' },
      { field: 'email', label: 'Email', width: '240px' },
      { field: 'blocked', label: 'Blocked', width: '115px' },
      { field: 'creditLimit', label: 'Credit Limit', type: 'currency', width: '150px', align: 'end' },
    ],
  },
};
