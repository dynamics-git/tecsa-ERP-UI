import { CommandConfig, DataSourceConfig, HeaderConfig, LineConfig, ListPageConfig } from '../../../platform/public-api';
import { numberSeriesField } from '../../setup/number-series-field';

const actionDefinitions: CommandConfig[] = [
  { label: 'Submit', actionKey: 'cmd:submit', permissionKey: 'purchase-requisition.submit', apiAction: { name: 'submit', states: { field: 'status', values: ['open'] } } },
  { label: 'Approve', actionKey: 'cmd:approve', permissionKey: 'purchase-requisition.approve', apiAction: { name: 'approve', states: { field: 'status', values: ['pending_approval'] } } },
  { label: 'Reject', actionKey: 'cmd:reject', permissionKey: 'purchase-requisition.reject', apiAction: { name: 'reject', states: { field: 'status', values: ['pending_approval'] }, inputFields: [{ key: 'comment', label: 'Reason', type: 'textarea', required: true, validation: { maxLength: 250 } }] } },
  { label: 'Reopen', actionKey: 'cmd:reopen', permissionKey: 'purchase-requisition.reopen', apiAction: { name: 'reopen', states: { field: 'status', values: ['rejected'] } } },
  { label: 'Cancel', actionKey: 'cmd:cancel', permissionKey: 'purchase-requisition.cancel', apiAction: { name: 'cancel', states: { field: 'status', values: ['open', 'rejected'] } } },
];
const actions = actionDefinitions.map((action, index) => ({ ...action, group: 'Process', order: 50 + index * 10 }));

export const purchaseRequisitionListConfig: ListPageConfig & { dataSource: DataSourceConfig } = {
  pageId: 'purchase-requisition', pageType: 'document', title: 'Purchase Requisition', module: 'Purchase',
  menu: { module: 'Purchase', group: 'Documents', icon: 'bi bi-file-earmark-text', route: '/purchase-requisition' },
  tools: { export: false, columns: false }, searchFields: ['number', 'purpose'],
  views: [{ id: 'all', label: 'All' }, { id: 'open', label: 'Open', filter: "status eq 'open'" }, { id: 'pending', label: 'Pending Approval', filter: "status eq 'pending_approval'" }, { id: 'approved', label: 'Approved', filter: "status eq 'approved'" }], activeViewId: 'all',
  dataSource: { endpoint: '/purchaseRequisitions', keyField: 'systemId', documentNoField: 'number', defaultSort: 'number desc', pageSize: 25,
    supportsCreate: true, supportsUpdate: true, supportsDelete: false,
    writableStates: { field: 'status', values: ['open'] }, newRecordDefaults: { status: 'open' },
    createFields: ['number', 'selectedNoSeriesId', 'requestDate', 'requiredDate', 'purpose', 'locationId'],
    updateFields: ['requestDate', 'requiredDate', 'purpose', 'locationId'],
  },
  dataSurface: { idField: 'systemId', columns: [
    { field: 'number', label: 'No.', isPrimary: true, type: 'text' },
    { field: 'requestDate', label: 'Request Date', type: 'date' },
    { field: 'requiredDate', label: 'Required Date', type: 'date' },
    { field: 'purpose', label: 'Purpose', width: '300px', type: 'text' },
    { field: 'status', label: 'Status', type: 'badge' },
    { field: 'lineCount', label: 'Lines', type: 'number', sortable: false },
    { field: 'estimatedTotal', label: 'Estimated Total', type: 'currency', sortable: false },
  ] },
};
export const purchaseRequisitionHeaderConfig: HeaderConfig = {
  dialogTitle: 'Purchase Requisition',
  toolbarButtons: [{ label: 'Save', actionKey: 'cmd:save', isPrimary: true, icon: 'bi bi-check-lg' }, ...actions],
  sections: [{ id: 'general', title: 'General', fields: [
    { key: 'number', label: 'No. (leave blank for automatic numbering)', readonlyAfterCreate: true, defaultValue: null, validation: { maxLength: 20 } },
    { ...numberSeriesField('selectedNoSeriesId', 'Number Series (optional)'), readonlyAfterCreate: true },
    { key: 'status', label: 'Status', readonly: true, defaultValue: 'open', factBox: true },
    { key: 'requestDate', label: 'Request Date', type: 'date', valueType: 'date', required: true, defaultValue: new Date().toLocaleDateString('en-CA') },
    { key: 'requiredDate', label: 'Required Date', type: 'date', valueType: 'date', defaultValue: null },
    { key: 'purpose', label: 'Purpose', type: 'textarea', width: 'wide', defaultValue: null, validation: { maxLength: 250 } },
    { key: 'locationId', label: 'Location', type: 'lookup', defaultValue: null, valueField: 'systemId', labelField: 'code', lookup: { endpoint: '/locations', valueField: 'systemId', displayField: 'code', searchFields: ['code', 'name'] } },
    { key: 'estimatedTotal', label: 'Estimated Total', readonly: true, factBox: true },
  ] }],
};
export const purchaseRequisitionLineConfig: LineConfig = {
  placement: { mode: 'end' }, toolbarButtons: [], lineKeyField: 'lineNo',
  dataSource: { endpoint: '/purchaseRequisitions', keyField: 'systemId', lineNo: true, defaultSort: 'lineNo asc', pageSize: 100,
    navigation: { parentEndpoint: '/purchaseRequisitions', parentIdFields: ['systemId'], childCollection: 'lines' },
    supportsCreate: true, supportsUpdate: true, supportsDelete: true,
    permissions: { create: 'modify', update: 'modify', delete: 'modify' },
    omitEmptyFields: ['description'],
    createFields: ['lineType', 'itemId', 'glAccountId', 'description', 'quantity', 'estimatedUnitCost', 'requiredDate'],
    updateFields: ['lineType', 'itemId', 'glAccountId', 'description', 'quantity', 'estimatedUnitCost', 'requiredDate'],
    requiredCreateFields: ['lineType', 'quantity'], meaningfulFields: ['itemId', 'glAccountId', 'description'],
  },
  columns: [
    { id: 'lineNo', label: 'Line No.', readonly: true, valueType: 'number' },
    { id: 'lineType', label: 'Type', cellType: 'dropdown', defaultValue: 'item', clearFieldsOnChange: ['itemId', 'glAccountId'], options: [{ label: 'Item', value: 'item' }, { label: 'G/L Account', value: 'gl_account' }] },
    { id: 'itemId', label: 'Item', cellType: 'dropdown', editableWhen: { field: 'lineType', values: ['item'] }, lookup: { endpoint: '/items', valueField: 'systemId', displayField: 'number', searchFields: ['number', 'description'] } },
    { id: 'glAccountId', label: 'G/L Account', cellType: 'dropdown', editableWhen: { field: 'lineType', values: ['gl_account'] }, lookup: { endpoint: '/glAccounts', valueField: 'systemId', displayField: 'number', searchFields: ['number', 'name'] } },
    { id: 'description', label: 'Description' },
    { id: 'quantity', label: 'Quantity', defaultValue: '1', align: 'end' },
    { id: 'estimatedUnitCost', label: 'Estimated Unit Cost', defaultValue: '0', align: 'end' },
    { id: 'estimatedAmount', label: 'Estimated Amount', readonly: true, align: 'end' },
    { id: 'requiredDate', label: 'Required Date', valueType: 'date' },
  ],
};
