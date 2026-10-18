import { DataSourceConfig, EntryHeaderConfig, LineConfig, ListPageConfig } from '../../../platform/public-api';

const boolOptions = [
  { label: 'Yes', value: true },
  { label: 'No', value: false },
];

/** Company-scoped Number Series. No client-side number allocation. */
export const numberSeriesHeaderConfig: EntryHeaderConfig = {
  dialogTitle: 'No. Series',
  toolbarButtons: [],
  sections: [
    {
      id: 'general',
      title: 'General',
      fields: [
        { key: 'code', label: 'Code', type: 'text', required: true,
          validation: { maxLength: 20 }, factPanel: { sectionId: 'series', sectionTitle: 'No. Series', order: 10 } },
        { key: 'description', label: 'Description', type: 'text', required: true,
          validation: { maxLength: 100 }, width: 'wide' },
        { key: 'defaultNos', label: 'Default Nos. (Automatic)', type: 'dropdown',
          valueType: 'boolean', options: boolOptions, defaultValue: true },
        { key: 'manualNos', label: 'Manual Nos. Allowed', type: 'dropdown',
          valueType: 'boolean', options: boolOptions, defaultValue: false },
        { key: 'dateOrder', label: 'Date Order', type: 'dropdown',
          valueType: 'boolean', options: boolOptions, defaultValue: false },
        { key: 'isActive', label: 'Active', type: 'dropdown',
          valueType: 'boolean', options: boolOptions, defaultValue: true },
      ],
    },
  ],
};

export const numberSeriesLineConfig: LineConfig = {
  placement: { mode: 'end' },
  toolbarButtons: [],
  lineKeyField: 'lineNo',
  editable: true,
  selectable: true,
  dataSource: {
    endpoint: '/numberSeries',
    transport: 'laravel',
    keyField: 'systemId',
    lineNo: true,
    supportsCreate: true,
    supportsUpdate: true,
    supportsDelete: false, // Backend does not provide a line DELETE route.
    navigation: { style: 'rest', parentEndpoint: '/numberSeries',
      childCollection: 'lines', parentIdFields: ['systemId'] },
    createFields: ['startingDate', 'startingNo', 'endingNo', 'warningNo', 'incrementBy'],
    updateFields: ['startingDate', 'startingNo', 'endingNo', 'warningNo', 'incrementBy'],
    requiredCreateFields: ['startingDate', 'startingNo'],
    positiveCreateFields: ['incrementBy'],
    createDefaults: { incrementBy: 1 },
  },
  columns: [
    { id: 'lineNo', field: 'lineNo', label: 'Line No.', readonly: true, valueType: 'number', width: '90px' },
    { id: 'startingDate', field: 'startingDate', label: 'Starting Date', valueType: 'date', width: '150px' },
    { id: 'startingNo', field: 'startingNo', label: 'Starting No.', width: '200px' },
    { id: 'endingNo', field: 'endingNo', label: 'Ending No. (optional)', width: '210px' },
    { id: 'warningNo', field: 'warningNo', label: 'Warning No. (optional)', width: '220px' },
    { id: 'incrementBy', field: 'incrementBy', label: 'Increment-by', valueType: 'number', width: '120px' },
    { id: 'lastNoUsed', field: 'lastNoUsed', label: 'Last No. Used', readonly: true, width: '165px' },
    { id: 'lastDateUsed', field: 'lastDateUsed', label: 'Last Date Used', readonly: true, valueType: 'date', width: '155px' },
    { id: 'isOpen', field: 'isOpen', label: 'Open', readonly: true, width: '80px' },
  ],
};

export const numberSeriesListConfig: ListPageConfig & { dataSource: DataSourceConfig } = {
  pageId: 'number-series',
  permissionResource: 'number_series',
  pageType: 'document',
  title: 'No. Series',
  module: 'Setup',
  viewSuffix: 'number-series',
  views: [{ id: 'all', label: 'All No. Series' }],
  activeViewId: 'all',
  tools: { refresh: true, filter: true, advancedFilter: true, columns: true },
  commandSelectionPolicy: { defaultMode: 'single' },
  filterConfig: { enabled: true, storageKey: 'number-series-list' },
  commands: [],
  dataSource: {
    endpoint: '/numberSeries',
    transport: 'laravel',
    keyField: 'systemId',
    documentNoField: 'code',
    lazyCreateOnFirstInput: true,
    pageSize: 25,
    maxPageSize: 100,
    supportsCreate: true,
    supportsUpdate: true,
    supportsDelete: false,
    createFields: ['code', 'description', 'defaultNos', 'manualNos', 'dateOrder', 'isActive'],
    updateFields: ['code', 'description', 'defaultNos', 'manualNos', 'dateOrder', 'isActive'],
  },
  dataSurface: {
    id: 'number-series-list',
    mode: 'table', idField: 'systemId',
    columns: [
      { field: 'code', label: 'Code', width: '170px', isPrimary: true },
      { field: 'description', label: 'Description', width: '310px' },
      { field: 'defaultNos', label: 'Automatic', width: '120px' },
      { field: 'manualNos', label: 'Manual', width: '120px' },
      { field: 'dateOrder', label: 'Date Order', width: '120px' },
      { field: 'isActive', label: 'Active', width: '120px' },
    ],
  },
};
