import type {
  CommandConfig,
  HeaderConfig,
  LineConfig,
  ListPageConfig,
  DataSourceConfig,
} from '../../../platform/public-api';

/**
 * Live Laravel PR -> PO contract.
 * Preserve purchase-order.config.ts as the legacy UI reference; do not use its
 * old field names/endpoints as live API declarations.
 * PO creation is exclusively through approved PR conversion, not POST /purchaseOrders.
 */
const workflowActions: CommandConfig[] = [
  {
    label: 'Release',
    actionKey: 'cmd:release',
    isPrimary: true,
    group: 'Process',
    order: 40,
    icon: 'ts-icon ts-icon-check-square',
    apiAction: { name: 'release', states: { field: 'status', values: ['open'] } },
  },
  {
    label: 'Reopen',
    actionKey: 'cmd:reopen',
    group: 'Process',
    order: 50,
    icon: 'ts-icon ts-icon-refresh',
    apiAction: { name: 'reopen', states: { field: 'status', values: ['released'] } },
  },
  {
    label: 'Cancel',
    actionKey: 'cmd:cancel',
    group: 'Process',
    order: 60,
    tone: 'danger',
    apiAction: {
      name: 'cancel',
      states: { field: 'status', values: ['open', 'released'] },
      inputFields: [{
        key: 'comment',
        label: 'Cancellation reason (optional)',
        type: 'textarea',
        validation: { maxLength: 250 },
      }],
    },
  },
];

export const purchaseOrderHeaderConfig: HeaderConfig = {
  dialogTitle: 'Purchase Order',
  toolbarButtons: [
    // Standard New/Delete/Refresh come from the shared document action assembler.
    // Unsupported operations remain visible but disabled by dataSource capabilities.
    ...workflowActions,
  ],
  sections: [
    {
      id: 'general',
      title: 'General',
      fields: [
        { key: 'number', label: 'No.', readonly: true, factBox: true },
        { key: 'status', label: 'Status', readonly: true, factBox: true },
        { key: 'vendorNo', label: 'Vendor No.', readonly: true },
        { key: 'vendorName', label: 'Vendor Name', readonly: true, factBox: true },
        { key: 'orderDate', label: 'Order Date', type: 'date', readonly: true },
        {
          key: 'externalDocumentNo',
          label: 'Vendor Document No.',
          validation: { maxLength: 35 },
          factBox: true,
        },
        { key: 'sourceRequisitionNumber', label: 'Source Requisition', readonly: true },
      ],
    },
    {
      id: 'totals',
      title: 'Order Summary',
      fields: [
        { key: 'lineCount', label: 'Lines', valueType: 'integer', readonly: true },
        { key: 'amountTotal', label: 'Total Amount', valueType: 'decimal', readonly: true, factBox: true },
        { key: 'receiptStatus', label: 'Receipt Status', readonly: true },
        { key: 'postedReceiptCount', label: 'Posted Receipts', valueType: 'integer', readonly: true },
        { key: 'statusChangedAt', label: 'Last Status Change', type: 'datetime', readonly: true },
      ],
    },
  ],
};

export const purchaseOrderLineConfig: LineConfig = {
  placement: { mode: 'after-section', afterSectionId: 'general' },
  dataSource: {
    endpoint: '/purchaseOrders',
    keyField: 'systemId',
    navigation: {
      parentEndpoint: '/purchaseOrders',
      parentIdFields: ['systemId'],
      childCollection: 'lines',
    },
    defaultSort: 'lineNo asc',
    pageSize: 100,
    supportsCreate: false,
    supportsUpdate: true,
    supportsDelete: false,
    permissions: { update: 'modify' },
    updateFields: ['quantity', 'directUnitCost', 'description', 'requiredDate'],
  },
  // Shared line assembler provides Line / Delete Line / Refresh Lines.
  // Unsupported create/delete remain disabled according to dataSource capabilities.
  toolbarButtons: [],
  columns: [
    { id: 'lineNo', label: 'Line No.', readonly: true, valueType: 'integer' },
    { id: 'lineType', label: 'Type', readonly: true },
    { id: 'itemNo', label: 'Item No.', readonly: true },
    { id: 'glAccountNo', label: 'G/L Account', readonly: true },
    { id: 'description', label: 'Description', validation: { maxLength: 100 } },
    {
      id: 'quantity', label: 'Quantity', valueType: 'decimal', align: 'end',
      validation: { pattern: '^[0-9]{1,14}(?:[.][0-9]{1,6})?$' },
      factBox: true,
    },
    {
      id: 'directUnitCost', label: 'Direct Unit Cost', valueType: 'decimal', align: 'end',
      validation: { pattern: '^[0-9]{1,14}(?:[.][0-9]{1,6})?$' },
    },
    { id: 'lineAmount', label: 'Line Amount', valueType: 'decimal', readonly: true, align: 'end', factBox: true },
    { id: 'quantityReceived', label: 'Received', valueType: 'decimal', readonly: true, align: 'end' },
    { id: 'outstandingQuantity', label: 'Outstanding', valueType: 'decimal', readonly: true, align: 'end' },
    { id: 'unitOfMeasureCode', label: 'UOM', readonly: true },
    { id: 'requiredDate', label: 'Required Date', valueType: 'date' },
    { id: 'sourceRequisitionLineNo', label: 'PR Line No.', readonly: true, valueType: 'integer' },
  ],
};

export const purchaseOrderListConfig: ListPageConfig & { dataSource: DataSourceConfig } = {
  pageId: 'purchase-order',
  pageType: 'document',
  title: 'Purchase Orders',
  module: 'Purchase',
  menu: {
    module: 'Purchase',
    group: 'Documents',
    icon: 'ts-icon ts-icon-file',
    route: '/purchase-order',
  },
  identity: { primaryField: 'number', secondaryField: 'vendorName' },
  searchFields: ['number', 'vendorNo', 'vendorName', 'externalDocumentNo'],
  filterConfig: { enabled: true, storageKey: 'purchase-order-list' },
  tools: {
    search: true, filter: true, advancedFilter: true, savedViews: true,
    density: true, grouping: true, export: true, columns: true, refresh: true,
  },
  factBox: { enabled: true },
  // Do not suppress shared New/Delete; backend capabilities disable unsupported actions.
  views: [
    { id: 'all', label: 'All' },
    { id: 'open', label: 'Open', filter: "status eq 'open'" },
    { id: 'released', label: 'Released', filter: "status eq 'released'" },
    { id: 'cancelled', label: 'Cancelled', filter: "status eq 'cancelled'" },
  ],
  activeViewId: 'all',
  dataSource: {
    endpoint: '/purchaseOrders',
    keyField: 'systemId',
    documentNoField: 'number',
    defaultSort: 'orderDate desc',
    pageSize: 25,
    supportsCreate: false,
    supportsUpdate: true,
    supportsDelete: false,
    writableStates: { field: 'status', values: ['open'] },
    updateFields: ['externalDocumentNo'],
  },
  dataSurface: {
    idField: 'systemId',
    selectable: true, multiSelect: true, sortable: true, resizable: true, infiniteScroll: true,
    columns: [
      { field: 'number', label: 'No.', type: 'text', isPrimary: true },
      { field: 'vendorNo', label: 'Vendor No.', type: 'text' },
      { field: 'vendorName', label: 'Vendor Name', type: 'text', width: '220px' },
      { field: 'orderDate', label: 'Order Date', type: 'date' },
      { field: 'externalDocumentNo', label: 'Vendor Document No.', type: 'text' },
      {
        field: 'status', label: 'Status', type: 'badge',
        filter: { type: 'select', operator: 'eq', options: [
          { value: 'open', label: 'Open' },
          { value: 'released', label: 'Released' },
          { value: 'cancelled', label: 'Cancelled' },
        ] },
      },
      { field: 'lineCount', label: 'Lines', type: 'number', sortable: false, filterable: false },
      { field: 'amountTotal', label: 'Total Amount', type: 'currency', sortable: false, filterable: false },
      { field: 'receiptStatus', label: 'Receipt Status', type: 'text', sortable: false, filterable: false },
      { field: 'sourceRequisitionNumber', label: 'Source PR', type: 'text', sortable: false, filterable: false },
    ],
  },
};
