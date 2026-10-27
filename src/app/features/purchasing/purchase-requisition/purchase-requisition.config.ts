import {
  CommandConfig,
  DataSourceConfig,
  HeaderConfig,
  LineConfig,
  ListPageConfig,
  listColumns,
} from '../../../platform/public-api';
import { purchaseRequisitionFactBoxConfig } from './purchase-requisition.factbox.config';

// Process commands call server workflow actions. Permissions and document status decide availability.
const actionDefinitions: CommandConfig[] = [
  {
    label: 'Submit',
    actionKey: 'cmd:submit',
    permissionKey: 'purchase-requisition.submit',
    apiAction: { name: 'submit', states: { field: 'status', values: ['open'] } },
  },
  {
    label: 'Approve',
    actionKey: 'cmd:approve',
    permissionKey: 'purchase-requisition.approve',
    apiAction: { name: 'approve', states: { field: 'status', values: ['pending_approval'] } },
  },
  {
    label: 'Reject',
    actionKey: 'cmd:reject',
    permissionKey: 'purchase-requisition.reject',
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
    permissionKey: 'purchase-requisition.reopen',
    apiAction: { name: 'reopen', states: { field: 'status', values: ['rejected'] } },
  },
  {
    label: 'Cancel',
    actionKey: 'cmd:cancel',
    permissionKey: 'purchase-requisition.cancel',
    apiAction: { name: 'cancel', states: { field: 'status', values: ['open', 'rejected'] } },
  },
];
const actions = actionDefinitions.map((action, index) => ({
  ...action,
  group: 'Process',
  order: 50 + index * 10,
}));

// Header: users enter request details. Identity is locked after creation; workflow fields are server-owned.
export const purchaseRequisitionHeaderConfig: HeaderConfig = {
  dialogTitle: 'Purchase Requisition',
  toolbarButtons: [
    ...actions,
  ],
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
          defaultValue: null,
          validation: { maxLength: 20 },
        },
        {
          key: 'selectedNoSeriesId',
          label: 'Number Series (optional)',
          type: 'lookup',
          valueType: 'text',
          defaultValue: null,
          valueField: 'systemId',
          labelField: 'code',
          displayFormat: '[code] — [description]',
          lookup: {
            endpoint: '/numberSeries',
            valueField: 'systemId',
            displayField: 'code',
            searchFields: ['code', 'description'],
          },
          readonlyAfterCreate: true,
        },
        { key: 'status', label: 'Status', readonly: true, defaultValue: 'open', factBox: true },
        {
          key: 'requestDate',
          label: 'Request Date',
          type: 'date',
          valueType: 'date',
          required: true,
          defaultValue: new Date().toLocaleDateString('en-CA'),
        },
        {
          key: 'requiredDate',
          label: 'Required Date',
          type: 'date',
          valueType: 'date',
          defaultValue: null,
        },
        {
          key: 'purpose',
          valueType: 'text',
          label: 'Purpose',
          type: 'textarea',
          width: 'wide',
          defaultValue: null,
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
          defaultValue: null,
          valueField: 'systemId',
          labelField: 'code',
          lookup: {
            endpoint: '/locations',
            valueField: 'systemId',
            displayField: 'code',
            searchFields: ['code', 'name'],
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
  autoSave: true,
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
    keyField: 'systemId',
    documentNoField: 'number',
    autoGenerateNumber: true,
    lazyCreateOnFirstInput: true,
    omitEmptyFields: ['number'],
    defaultSort: 'number desc',
    pageSize: 25,
    supportsDelete: false, // Header API supports cancellation, not deletion.
    writableStates: { field: 'status', values: ['open'] },
    newRecordDefaults: { status: 'open' },
  },
  dataSurface: {
    idField: 'systemId',
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
/** PR line presentation: defaults and lookups assist entry without requiring values.
 * Users can edit Quantity, UOM conversion, UOM, Location, Description and Cost.
 * Only record identity, calculated amount and conversion progress remain read-only.
 * API validation is separate from these UI settings.
 */
export const purchaseRequisitionLineConfig: LineConfig = {
  typeField: 'lineType',
  placement: { mode: 'after-section', afterSectionId: 'general' },
  toolbarButtons: [],
  lineKeyField: 'lineNo',
  dataSource: {
    endpoint: '/purchaseRequisitions',
    keyField: 'systemId',
    lineNo: true,
    defaultSort: 'lineNo asc',
    pageSize: 100,
    navigation: {
      parentEndpoint: '/purchaseRequisitions',
      parentIdFields: ['systemId'],
      childCollection: 'lines',
    },
    permissions: { create: 'modify', update: 'modify', delete: 'modify' },
    omitEmptyFields: ['description'],
    // Keep calculated amounts and PO progress out of update payloads.
    updateBlockedFields: ['estimatedAmount', 'convertedQuantity', 'remainingQuantity'],
    meaningfulFields: ['itemId', 'glAccountId', 'description'],
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
      editableWhen: { field: 'lineType', values: ['item'] },
      label: 'No.',
      displayColumn: 'number',
      defaultValue: null,

      cellType: 'dropdown',

      lookup: {
        endpoint: '/items',
        filter: 'blocked eq false',
        valueField: 'systemId',
        displayField: 'number',
        searchFields: ['number', 'description'],
      },
    },
    {
      // Selects the G/L binding in that same column.
      id: 'glAccountId',
      editableWhen: { field: 'lineType', values: ['gl_account'] },
      label: 'No.',
      displayColumn: 'number',
      defaultValue: null,

      cellType: 'dropdown',

      lookup: {
        endpoint: '/glAccounts',
        filter: "accountType eq 'posting' and blocked eq false",
        valueField: 'systemId',
        displayField: 'number',
        searchFields: ['number', 'name'],
      },
    },
    // Editable text (100 characters). The server supplies a description when omitted.
    { id: 'description', label: 'Description', valueType: 'text', validation: { maxLength: 100 }, factBox: { sectionId: 'selected-line', sectionTitle: 'Selected line', order: 10 } },
    {
      id: 'unitOfMeasureId', label: 'Unit of Measure', cellType: 'dropdown', defaultValue: null,

      lookup: { endpoint: '/unitsOfMeasure', valueField: 'systemId', displayField: 'code', searchFields: ['code', 'description'] },
    },
    // Conversion from the selected item UOM (e.g. BOX = 10 base units), not requested quantity.
    // Editable line value; the selected UOM can still supply its default.
    { id: 'qtyPerUnitOfMeasure', label: 'Qty. per Unit of Measure', valueType: 'decimal', align: 'end' },
    {
      // Optional location lookup, available on either line type.
      // Select a location master record; free text is not a valid location ID.
      id: 'locationId', label: 'Location', cellType: 'dropdown', defaultValue: null,

      lookup: { endpoint: '/locations', valueField: 'systemId', displayField: 'code', searchFields: ['code', 'name'] },
    },
    {
      // Editable requested quantity. Starts at 1; no PR-specific required or pattern rule.
      // Decimal editing uses the shared numeric control.
      id: 'quantity',
      label: 'Quantity',
      factBox: { sectionId: 'selected-line', sectionTitle: 'Selected line', order: 20 },
      valueType: 'decimal',

      defaultValue: '1',
      align: 'end',
    },
    {
      // Editable estimate, initially 0; no PR-specific pattern restriction.
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
    defaults: { subtotal: '0.00', sst: '0.00', total: '0.00', difference: '0.00' },
    totals: { total: { formula: 'sum(estimatedAmount)' } },
    format: { type: 'number' },
  },
  footerSections: [
    {
      id: 'document-totals',
      rows: [
        { id: 'subtotal', label: 'Subtotal', source: 'total', totalKey: 'total', order: 10 },
        // PR has no confirmed SST amounts yet; placeholders must not imply zero tax.
        { id: 'sst', label: 'SST', source: 'literal', value: '—', order: 20 },
        { id: 'total-incl-sst', label: 'Total Incl. SST', source: 'literal', value: '—', emphasis: true, order: 30 },
      ],
    },
  ],};
