import { HeaderConfig, LineConfig, ListPageConfig, DataSourceConfig } from '../../../platform/public-api';

export const noSeriesListConfig: ListPageConfig & { dataSource: DataSourceConfig } = {
  pageId: 'no-series', pageType: 'document', title: 'No. Series', module: 'Administration',
  menu: { module: 'Administration', group: 'Setup', icon: 'bi bi-list-ol', route: '/no-series' },
  tools: { export: false, columns: false }, searchFields: ['code', 'description'],
  dataSource: {
    endpoint: '/numberSeries', keyField: 'systemId', documentNoField: 'code', defaultSort: 'code asc', pageSize: 25,
    supportsCreate: true, supportsUpdate: true, supportsDelete: false,
    createFields: ['code', 'description', 'defaultNos', 'manualNos', 'dateOrder', 'isActive'],
    updateFields: ['code', 'description', 'defaultNos', 'manualNos', 'dateOrder', 'isActive'],
  },
  dataSurface: { idField: 'systemId', columns: [
    { field: 'code', label: 'Code', isPrimary: true, type: 'text' },
    { field: 'description', label: 'Description', type: 'text', width: '300px' },
    { field: 'defaultNos', label: 'Default Nos.', type: 'boolean' },
    { field: 'manualNos', label: 'Manual Nos.', type: 'boolean' },
    { field: 'dateOrder', label: 'Date Order', type: 'boolean' },
    { field: 'isActive', label: 'Active', type: 'boolean' },
  ] },
};
export const noSeriesHeaderConfig: HeaderConfig = {
  dialogTitle: 'No. Series', toolbarButtons: [{ label: 'Save', actionKey: 'cmd:save', isPrimary: true, icon: 'bi bi-check-lg' }],
  sections: [{ id: 'general', title: 'General', fields: [
    { key: 'code', label: 'Code', required: true, validation: { maxLength: 20 } },
    { key: 'description', label: 'Description', required: true, validation: { maxLength: 100 }, width: 'wide' },
    { key: 'defaultNos', label: 'Default Nos.', type: 'boolean', valueType: 'boolean', defaultValue: true },
    { key: 'manualNos', label: 'Manual Nos.', type: 'boolean', valueType: 'boolean', defaultValue: false },
    { key: 'dateOrder', label: 'Date Order', type: 'boolean', valueType: 'boolean', defaultValue: false },
    { key: 'isActive', label: 'Active', type: 'boolean', valueType: 'boolean', defaultValue: true },
  ] }],
};
export const noSeriesLineConfig: LineConfig = {
  placement: { mode: 'end' }, lineKeyField: 'lineNo', toolbarButtons: [],
  dataSource: {
    endpoint: '/numberSeries', keyField: 'systemId', lineNo: true, defaultSort: 'lineNo asc', pageSize: 100,
    navigation: { parentEndpoint: '/numberSeries', parentIdFields: ['systemId'], childCollection: 'lines' },
    supportsCreate: true, supportsUpdate: true, supportsDelete: false,
    createFields: ['startingDate', 'startingNo', 'endingNo', 'warningNo', 'incrementBy'],
    updateFields: ['startingDate', 'startingNo', 'endingNo', 'warningNo', 'incrementBy'],
    requiredCreateFields: ['startingDate', 'startingNo'], meaningfulFields: ['startingDate', 'startingNo'],
  },
  columns: [
    { id: 'lineNo', label: 'Line No.', readonly: true, valueType: 'number' },
    { id: 'startingDate', label: 'Starting Date', valueType: 'date' },
    { id: 'startingNo', label: 'Starting No.' },
    { id: 'endingNo', label: 'Ending No.' },
    { id: 'warningNo', label: 'Warning No.' },
    { id: 'incrementBy', label: 'Increment By', valueType: 'number', defaultValue: 1 },
    { id: 'lastNoUsed', label: 'Last No. Used', readonly: true },
    { id: 'lastDateUsed', label: 'Last Date Used', readonly: true, valueType: 'date' },
    { id: 'isOpen', label: 'Open', readonly: true, valueType: 'boolean' },
  ],
};
