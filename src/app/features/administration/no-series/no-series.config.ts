import { HeaderConfig, LineConfig, ListPageConfig, DataSourceConfig } from '../../../platform/public-api';

export const noSeriesListConfig: ListPageConfig & { dataSource: DataSourceConfig } = {
  factBox: { enabled: true, sections: [{ id: 'setup', title: 'Setup', fields: [{"id":"code","field":"code","label":"Code"},{"id":"description","field":"description","label":"Description"},{"id":"defaultNos","field":"defaultNos","label":"Default Nos"},{"id":"manualNos","field":"manualNos","label":"Manual Nos"},{"id":"dateOrder","field":"dateOrder","label":"Date Order"},{"id":"isActive","field":"isActive","label":"Is Active"}] }] },
  pageId: 'no-series',
  pageType: 'document',
  autoSave: true,
  title: 'No. Series',
  identity: { primaryField: 'code', secondaryField: 'description' },
  module: 'Administration',
  menu: { module: 'Administration', group: 'Setup', icon: 'ts-icon ts-icon-number-series', moduleIcon: 'ts-icon ts-icon-administration-module', route: '/no-series' },
  dataSource: {
    endpoint: '/numberSeries',
    keyField: 'systemId',
    documentNoField: 'code',
    defaultSort: 'code asc',
    pageSize: 25,
  },
  dataSurface: {
    idField: 'systemId',
    columns: [
      { field: 'code', label: 'Code', isPrimary: true, type: 'text' },
      { field: 'description', label: 'Description', type: 'text', width: '300px' },
      { field: 'defaultNos', label: 'Default Nos.', type: 'boolean' },
      { field: 'manualNos', label: 'Manual Nos.', type: 'boolean' },
      { field: 'dateOrder', label: 'Date Order', type: 'boolean' },
      { field: 'isActive', label: 'Active', type: 'boolean' },
    ],
  },
};

export const noSeriesHeaderConfig: HeaderConfig = {
  dialogTitle: 'No. Series',
  toolbarButtons: [],
  sections: [
    {
      id: 'general',
      title: 'General',
      fields: [
        { key: 'code', valueType: 'code', label: 'Code', required: true, validation: { maxLength: 20 } },
        {
          key: 'description',
          valueType: 'text',
          label: 'Description',
          required: true,
          validation: { maxLength: 100 },
          width: 'wide',
        },
        {
          key: 'defaultNos',
          label: 'Default Nos.',
          type: 'boolean',
          valueType: 'boolean',
          defaultValue: true,
        },
        {
          key: 'manualNos',
          label: 'Manual Nos.',
          type: 'boolean',
          valueType: 'boolean',
          defaultValue: false,
        },
        { key: 'dateOrder', label: 'Date Order', type: 'boolean', valueType: 'boolean', defaultValue: false },
        { key: 'isActive', label: 'Active', type: 'boolean', valueType: 'boolean', defaultValue: true },
      ],
    },
  ],
};

export const noSeriesLineConfig: LineConfig = {
  placement: { mode: 'end' },
  lineKeyField: 'lineNo',
  dataSource: {
    endpoint: '/numberSeries',
    keyField: 'systemId',
    lineNo: true,
    defaultSort: 'lineNo asc',
    pageSize: 100,
    // The saved header's systemId scopes every line request.
    navigation: {
      parentEndpoint: '/numberSeries',
      parentIdFields: ['systemId'],
      childCollection: 'lines',
    },
  },
  toolbarButtons: [],
  columns: [
    { id: 'lineNo', label: 'Line No.', readonly: true, valueType: 'integer' },
    { id: 'startingDate', label: 'Starting Date', valueType: 'date', required: true },
    { id: 'startingNo', label: 'Starting No.', valueType: 'code', required: true, validation: { maxLength: 20 } },
    { id: 'endingNo', label: 'Ending No.', valueType: 'code', validation: { maxLength: 20 } },
    { id: 'warningNo', label: 'Warning No.', valueType: 'code', validation: { maxLength: 20 } },
    { id: 'incrementBy', label: 'Increment By', valueType: 'integer', defaultValue: 1, required: true, validation: { min: 1, max: 2147483647 } },
    { id: 'lastNoUsed', label: 'Last No. Used', valueType: 'code', readonly: true },
    { id: 'lastDateUsed', label: 'Last Date Used', readonly: true, valueType: 'date' },
    { id: 'isOpen', label: 'Open', readonly: true, valueType: 'boolean' },
  ],
};
