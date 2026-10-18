import { DataSourceConfig, EntryHeaderConfig, LineConfig, ListPageConfig } from '../../../platform/public-api';

/**
 * Direct Purchase Requisition header/lines contract. Neither Customer nor PR uses
 * the removed legacy Purchase Order configuration.
 */
export const purchaseRequisitionHeaderConfig: EntryHeaderConfig = {
  dialogTitle: 'Purchase Requisition',
  toolbarButtons: [],
  sections: [
    {
      id: 'general', title: 'General',
      fields: [
        { key: 'number', label: 'PR No.', type: 'text', readonly: true,
          factPanel: { sectionId: 'pr', sectionTitle: 'Requisition', order: 10 } },
        { key: 'status', label: 'Status', type: 'text', readonly: true, defaultValue: 'open',
          factPanel: { sectionId: 'pr', sectionTitle: 'Requisition', order: 20 } },
        { key: 'requestDate', label: 'Request Date', type: 'date', valueType: 'date' },
        { key: 'requiredDate', label: 'Required Date', type: 'date', valueType: 'date' },
        { key: 'purpose', label: 'Purpose', type: 'textarea', valueType: 'text', width: 'wide' },
        { key: 'requestedByUserId', label: 'Requested By', type: 'text', readonly: true },
        { key: 'locationId', label: 'Location', type: 'dropdown',
          api: '/locations?perPage=100', valueField: 'systemId', labelField: 'code' },
      ],
    },
    {
      id: 'summary', title: 'Requisition Summary',
      fields: [
        { key: 'lineCount', label: 'Lines', type: 'number', readonly: true },
        { key: 'estimatedTotal', label: 'Estimated Total', type: 'text', readonly: true },
        { key: 'conversionStatus', label: 'Conversion Status', type: 'text', readonly: true },
      ],
    },
  ],
};

export const purchaseRequisitionLineConfig: LineConfig = {
  placement: { mode: 'end' },
  toolbarButtons: [],
  lineKeyField: 'lineNo',
  editable: true,
  selectable: true,
  dataSource: {
    endpoint: '/purchaseRequisitions',
    transport: 'laravel',
    keyField: 'systemId',
    lineNo: true, // Laravel assigns line numbers. Never synthesize a business line number.
    supportsCreate: true,
    supportsUpdate: true,
    supportsDelete: true,
    navigation: {
      style: 'rest', parentEndpoint: '/purchaseRequisitions',
      childCollection: 'lines', parentIdFields: ['systemId'],
    },
    createFields: ['lineType', 'itemId', 'glAccountId', 'description', 'quantity',
      'estimatedUnitCost', 'unitOfMeasureId', 'locationId', 'requiredDate'],
    updateFields: ['lineType', 'itemId', 'glAccountId', 'description', 'quantity',
      'estimatedUnitCost', 'unitOfMeasureId', 'locationId', 'requiredDate'],
    requiredCreateFields: ['lineType', 'quantity'],
    oneOfCreateFields: ['itemId', 'glAccountId'],
    positiveCreateFields: ['quantity'],
  },
  columns: [
    { id: 'lineNo', field: 'lineNo', label: 'Line', readonly: true, width: '72px',
      valueType: 'number' },
    { id: 'lineType', field: 'lineType', label: 'Type', cellType: 'dropdown', width: '130px',
      options: [
        { label: 'Item', value: 'item', api: '/items?perPage=100' },
        { label: 'G/L Account', value: 'gl_account', api: '/glAccounts?perPage=100' },
      ] },
    { id: 'itemId', field: 'itemId', label: 'Item', cellType: 'dropdown', width: '155px',
      api: '/items?perPage=100', valueField: 'systemId', labelField: 'number' },
    { id: 'glAccountId', field: 'glAccountId', label: 'G/L Account', cellType: 'dropdown',
      width: '155px', api: '/glAccounts?perPage=100', valueField: 'systemId', labelField: 'number' },
    { id: 'description', field: 'description', label: 'Description', width: '250px' },
    { id: 'quantity', field: 'quantity', label: 'Quantity', valueType: 'number', width: '108px' },
    { id: 'estimatedUnitCost', field: 'estimatedUnitCost', label: 'Estimated Unit Cost',
      valueType: 'number', width: '160px' },
    { id: 'estimatedAmount', field: 'estimatedAmount', label: 'Estimated Amount',
      readonly: true, width: '165px' },
    { id: 'requiredDate', field: 'requiredDate', label: 'Required Date',
      valueType: 'date', width: '135px' },
  ],
};

export const purchaseRequisitionListConfig: ListPageConfig & { dataSource: DataSourceConfig } = {
  pageId: 'purchase-requisition',
  pageType: 'document',
  title: 'Purchase Requisitions',
  module: 'Purchase',
  viewSuffix: 'requisitions',
  views: [
    { id: 'all', label: 'All' },
    { id: 'open', label: 'Open', filter: "status eq 'open'" },
    { id: 'approved', label: 'Approved', filter: "status eq 'approved'" },
  ],
  activeViewId: 'all',
  tools: { refresh: true, filter: true, advancedFilter: true, columns: true },
  filterConfig: { enabled: true, storageKey: 'purchase-requisition-list' },
  commandSelectionPolicy: { defaultMode: 'single' },
  commands: [],
  dataSource: {
    endpoint: '/purchaseRequisitions',
    transport: 'laravel',
    keyField: 'systemId',
    documentNoField: 'number',
    autoGenerateNumber: true,
    lazyCreateOnFirstInput: true,
    pageSize: 25,
    maxPageSize: 200,
    filterFields: ['status'],
    supportsCreate: true, supportsUpdate: true, supportsDelete: false,
    createFields: ['requestDate', 'requiredDate', 'purpose', 'locationId'],
    updateFields: ['requestDate', 'requiredDate', 'purpose', 'locationId'],
  },
  dataSurface: {
    id: 'purchase-requisition-list', mode: 'table', idField: 'systemId',
    columns: [
      { field: 'number', label: 'PR No.', width: '140px', isPrimary: true,
        factPanel: { sectionId: 'pr', sectionTitle: 'Requisition', order: 10 } },
      { field: 'requestDate', label: 'Request Date', type: 'date', width: '150px' },
      { field: 'requiredDate', label: 'Required Date', type: 'date', width: '150px' },
      { field: 'purpose', label: 'Purpose', width: '300px' },
      { field: 'status', label: 'Status', type: 'badge', width: '140px',
        factPanel: { sectionId: 'pr', sectionTitle: 'Requisition', order: 20 } },
      { field: 'lineCount', label: 'Lines', type: 'number', width: '90px' },
      { field: 'estimatedTotal', label: 'Estimated Total', type: 'currency', width: '160px',
        align: 'end' },
    ],
  },
};
