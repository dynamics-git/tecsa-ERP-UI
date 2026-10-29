import type { ListFactBoxConfig } from '../../../platform/public-api';
/** One data-driven FactBox for PR List and Document; the document adds selected-line fields from LineConfig. */
export const purchaseRequisitionFactBoxConfig: ListFactBoxConfig = {
  enabled: true,
  label: 'Requisition information',
  overview: true,
  notes: true,
  attachments: true,
  defaultSectionId: 'overview',
  binding: {
    titleField: 'number',
    summaryField: 'estimatedTotal',
    summaryType: 'currency',
  },
  sections: [
    {
      id: 'requisition',
      title: 'Requisition',
      fields: [
        {
          id: 'number',
          label: 'No.',
          field: 'number',
        },
        {
          id: 'status',
          label: 'Status',
          field: 'status',
        },
        {
          id: 'request-date',
          label: 'Request date',
          field: 'requestDate',
          type: 'date',
        },
        {
          id: 'required-date',
          label: 'Required date',
          field: 'requiredDate',
          type: 'date',
        },
        {
          id: 'purpose',
          label: 'Purpose',
          field: 'purpose',
        },
      ],
    },
    {
      id: 'amounts',
      title: 'Amounts and progress',
      layout: 'metrics',
      fields: [
        {
          id: 'lines',
          label: 'Lines',
          field: 'lineCount',
          type: 'number',
        },
        {
          id: 'total',
          label: 'Estimated total',
          field: 'estimatedTotal',
          type: 'currency',
        },
        {
          id: 'orders',
          label: 'Purchase orders',
          field: 'purchaseOrderCount',
          type: 'number',
        },
        {
          id: 'conversion',
          label: 'Conversion status',
          field: 'conversionStatus',
        },
      ],
    },
    {
      id: 'audit',
      title: 'Record information',
      collapsed: true,
      fields: [
        {
          id: 'created',
          label: 'Created at',
          field: 'systemCreatedAt',
          type: 'datetime',
        },
        {
          id: 'modified',
          label: 'Modified at',
          field: 'systemModifiedAt',
          type: 'datetime',
        },
      ],
    },
  ],
};
