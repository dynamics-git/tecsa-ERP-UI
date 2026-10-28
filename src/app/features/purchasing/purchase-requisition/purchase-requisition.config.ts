import {
  CommandConfig,
  DataSourceConfig,
  HeaderConfig,
  LineConfig,
  ListPageConfig,
  listColumns,
} from '../../../platform/public-api';
import { purchaseRequisitionFactBoxConfig } from './purchase-requisition.factbox.config';

// PR workflow actions. Standard New, Refresh and line commands come from Core.
const actionDefinitions: CommandConfig[] = [
  {
    label: 'Submit',
    actionKey: 'cmd:submit',
    apiAction: { name: 'submit', states: { field: 'status', values: ['open'] } },
  },
  {
    label: 'Approve',
    actionKey: 'cmd:approve',
    apiAction: { name: 'approve', states: { field: 'status', values: ['pending_approval'] } },
  },
  {
    label: 'Reject',
    actionKey: 'cmd:reject',
    apiAction: {
      name: 'reject',
      states: { field: 'status', values: ['pending_approval'] },
      inputFields: [
        {
          key: 'comment',
          label: 'Reason',
          type: 'textarea',
          required: true,
          validation: { maxLength: 250 },
        },
      ],
    },
  },
  {
    label: 'Reopen',
    actionKey: 'cmd:reopen',
    apiAction: { name: 'reopen', states: { field: 'status', values: ['rejected'] } },
  },
  {
    label: 'Cancel',
    actionKey: 'cmd:cancel',
    apiAction: { name: 'cancel', states: { field: 'status', values: ['open', 'rejected'] } },
  },
];
const actions = actionDefinitions.map((action, index) => ({
  ...action,
  group: 'Process',
  order: 50 + index * 10,
}));

// Header: fields and presentation. Core reads nullable defaults and lookup search
// from API metadata; declare defaults here only when the page needs a specific value.
export const purchaseRequisitionHeaderConfig: HeaderConfig = {
  dialogTitle: 'Purchase Requisition',
  toolbarButtons: actions,
  sections: [
    {
      id: 'general',
      title: 'General',
      fields: [
        {
          key: 'number',
          valueType: 'code',
          label: 'No.',
          readonlyAfterCreate: true,
          validation: { maxLength: 20 },
        },
        {
          key: 'selectedNoSeriesId',
          label: 'Number Series (optional)',
          type: 'lookup',
          valueType: 'text',
          labelField: 'code',
          displayFormat: '[code] — [description]',
          lookup: {
            endpoint: '/numberSeries',
            displayField: 'code',
          },
          readonlyAfterCreate: true,
        },
        { key: 'status', label: 'Status', readonly: true, defaultValue: 'open', factBox: true },
        {
          key: 'requestDate',
          label: 'Request Date',
          type: 'date',
          required: true,
          defaultValue: new Date().toLocaleDateString('en-CA'),
        },
        {
          key: 'requiredDate',
          label: 'Required Date',
          type: 'date',
        },
        {
          key: 'purpose',
          valueType: 'text',
          label: 'Purpose',
          type: 'textarea',
          width: 'wide',
          validation: { maxLength: 250 },
        },
      ],
    },
    {
      id: 'request-details',
      title: 'Request Details',
      fields: [
        {
          key: 'locationId',
          label: 'Location',
          type: 'lookup',
          labelField: 'code',
          lookup: {
            endpoint: '/locations',
            displayField: 'code',
          },
        },
      ],
    },
    {
      id: 'processing',
      title: 'Processing',
      fields: [
        { key: 'conversionStatus', label: 'Conversion Status', type: 'select', readonly: true, options: [
          { value: 'not_converted', label: 'Not Converted' },
          { value: 'partially_converted', label: 'Partially Converted' },
          { value: 'fully_converted', label: 'Fully Converted' },
        ] },
        { key: 'purchaseOrderCount', label: 'Purchase Orders', valueType: 'integer', readonly: true },
        { key: 'statusChangedAt', label: 'Status Changed At', type: 'datetime', readonly: true },
      ],
    },
  ],
};
// List/document shell: shared autosave and FactBox renderers consume this configuration.
export const purchaseRequisitionListConfig: ListPageConfig & { dataSource: DataSourceConfig } = {
  factBox: purchaseRequisitionFactBoxConfig,
  pageId: 'purchase-requisition',
  pageType: 'document',
  title: 'Purchase Requisition',
  identity: { primaryField: 'number' },
  module: 'Purchase',
  menu: {
    module: 'Purchase',
    group: 'Documents',
    icon: 'ts-icon ts-icon-file',
    route: '/purchase-requisition',
  },
  views: [
    { id: 'all', label: 'All' },
    { id: 'open', label: 'Open', filter: "status eq 'open'" },
    { id: 'pending', label: 'Pending Approval', filter: "status eq 'pending_approval'" },
    { id: 'approved', label: 'Approved', filter: "status eq 'approved'" },
  ],
  activeViewId: 'all',
  dataSource: {
    endpoint: '/purchaseRequisitions',
    documentNoField: 'number',
    autoGenerateNumber: true,
    omitEmptyFields: ['number'],
    defaultSort: 'number desc',
    pageSize: 25,
    supportsDelete: false, // Header API supports cancellation, not deletion.
    writableStates: { field: 'status', values: ['open'] },
  },
  dataSurface: {
    columns: listColumns(purchaseRequisitionHeaderConfig, [
      { field: 'number', width: '128px' },
      { field: 'requestDate', width: '118px' },
      { field: 'requiredDate', width: '118px' },
      { field: 'purpose', width: '300px' },
      {
        field: 'status',
        label: 'Status',
        type: 'badge',
        filter: {
          type: 'select',
          operator: 'eq',
          options: [
            { value: 'open', label: 'Open' },
            { value: 'pending_approval', label: 'Pending Approval' },
            { value: 'approved', label: 'Approved' },
            { value: 'rejected', label: 'Rejected' },
            { value: 'cancelled', label: 'Cancelled' },
          ],
        },
      },
      { field: 'lineCount', label: 'Lines', type: 'number', sortable: false, filterable: false },
      {
        field: 'estimatedTotal',
        label: 'Estimated Total',
        type: 'currency',
        sortable: false,
        filterable: false,
      },
    ]),
  },
};
// Lines: explicit parent binding, Type → No. choices, and PR calculations.
// Core derives write fields from the editable columns and owns per-field autosave.
export const purchaseRequisitionLineConfig: LineConfig = {
  typeField: 'lineType',
  placement: { mode: 'after-section', afterSectionId: 'general' },
  lineKeyField: 'lineNo',
  dataSource: {
    endpoint: '/purchaseRequisitions',
    defaultSort: 'lineNo asc',
    pageSize: 100,
    navigation: {
      parentEndpoint: '/purchaseRequisitions',
      parentIdFields: ['systemId'],
      childCollection: 'lines',
    },
    permissions: { create: 'modify', update: 'modify', delete: 'modify' },
    omitEmptyFields: ['description'],
    // POST prerequisites are separate from required markers during field entry.
    requiredCreateFields: ['lineType', 'quantity'],
  },
  columns: [
    { id: 'lineNo', label: 'Line No.', readonly: true, valueType: 'integer' },
    {
      id: 'lineType',
      label: 'Type',
      valueType: 'text',
      cellType: 'dropdown',
      defaultValue: 'item',
      // Switching Item/G/L clears references that no longer apply.
      clearFieldsOnChange: ['itemId', 'glAccountId', 'unitOfMeasureId', 'locationId'],
      options: [
        { label: 'Item', value: 'item' },
        { label: 'G/L Account', value: 'gl_account' },
      ],
    },
    {
      // Selects the Items binding in the shared No. column; does not require a value.
      id: 'itemId',
      fill: { description: 'description' },
      editableWhen: { field: 'lineType', values: ['item'] },
      label: 'No.',
      displayColumn: 'number',
      lookup: {
        endpoint: '/items',
        filter: 'blocked eq false',
        displayField: 'number',
      },
    },
    {
      // Selects the G/L binding in that same column.
      id: 'glAccountId',
      fill: { description: 'name' },
      editableWhen: { field: 'lineType', values: ['gl_account'] },
      label: 'No.',
      displayColumn: 'number',
      lookup: {
        endpoint: '/glAccounts',
        filter: "accountType eq 'posting' and blocked eq false",
        displayField: 'number',
      },
    },
    // Editable text (100 characters). The server supplies a description when omitted.
    { id: 'description', label: 'Description', valueType: 'text', validation: { maxLength: 100 }, factBox: { sectionId: 'selected-line', sectionTitle: 'Selected line', order: 10 } },
    {
      id: 'unitOfMeasureId', label: 'Unit of Measure',
      editableWhen: { field: 'lineType', values: ['item'] },
      lookup: { endpoint: '/unitsOfMeasure', displayField: 'code' },
    },
    // Conversion from the selected item UOM (e.g. BOX = 10 base units), not requested quantity.
    // The existing API calculates this factor and prohibits direct writes.
    { id: 'qtyPerUnitOfMeasure', label: 'Qty. per Unit of Measure', valueType: 'decimal', readonly: true, align: 'end' },
    {
      // Location applies to Item lines; untouched values can default from the header.
      // Select a location master record; free text is not a valid location ID.
      id: 'locationId', label: 'Location',
      editableWhen: { field: 'lineType', values: ['item'] },
      lookup: { endpoint: '/locations', displayField: 'code' },
    },
    {
      id: 'quantity',
      label: 'Quantity',
      factBox: { sectionId: 'selected-line', sectionTitle: 'Selected line', order: 20 },
      valueType: 'decimal',
      defaultValue: '1',
      align: 'end',
    },
    {
      id: 'estimatedUnitCost',
      label: 'Estimated Unit Cost',
      valueType: 'decimal',
      defaultValue: '0',
      align: 'end',
    },
    {
      // Preview = quantity × estimated unit cost; the server calculates the saved amount.
      id: 'estimatedAmount',
      label: 'Estimated Amount',
      factBox: { sectionId: 'selected-line', sectionTitle: 'Selected line', order: 30 },
      valueType: 'decimal',
      readonly: true,
      align: 'end',
    },
    { id: 'requiredDate', label: 'Required Date', valueType: 'date' },
    // Purchase-order progress is calculated by the server, never entered manually.
    { id: 'convertedQuantity', label: 'Converted Quantity', valueType: 'decimal', readonly: true, align: 'end' },
    { id: 'remainingQuantity', label: 'Remaining Quantity', valueType: 'decimal', readonly: true, align: 'end' },
  ],
  calculation: [
    { target: 'estimatedAmount', formula: 'quantity * estimatedUnitCost', precision: 6 },
  ],
  totalsCalculation: {
    // PR has no SST calculation; Core supplies zero SST and two-decimal display.
    totals: {
      subtotal: { formula: 'sum(estimatedAmount)' },
      total: { formula: 'totals.subtotal + totals.sst' },
    },
  },
  footerSections: [
    {
      id: 'document-totals',
      rows: [
        { id: 'subtotal', label: 'Subtotal', source: 'total', totalKey: 'subtotal', order: 10 },
        { id: 'sst', label: 'SST', source: 'total', totalKey: 'sst', order: 20 },
        { id: 'total-incl-sst', label: 'Total Incl. SST', source: 'total', totalKey: 'total', emphasis: true, order: 30 },
      ],
    },
  ],
};
