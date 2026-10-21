import { HeaderConfig, LineConfig } from '../../../platform/public-api';

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
    supportsDelete: false,
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
