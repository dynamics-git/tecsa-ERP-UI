import type { FactBoxConfig } from '../../../platform/public-api';
/** Presentation only. Field precision, captions and lookups remain in the existing page contract. */

export const itemsFactBoxConfig: FactBoxConfig = {
  enabled: true,
  label: 'Item information',
  overview: true,
  notes: true,
  attachments: true,
  defaultSectionId: 'overview',
  sections: [
    {
      id: 'item-overview',
      title: 'Item overview',
      layout: 'metrics',
      fields: [
        {
          id: 'price',
          label: 'Unit price',
          field: 'unitPrice',
        },
        {
          id: 'cost',
          label: 'Unit cost',
          field: 'unitCost',
        },
      ],
    },
    {
      id: 'classification',
      title: 'Classification',
      fields: [
        {
          id: 'type',
          label: 'Item type',
          field: 'itemType',
        },
        {
          id: 'unit',
          label: 'Base unit of measure',
          field: 'baseUnitOfMeasureId',
        },
        {
          id: 'costing',
          label: 'Costing method',
          field: 'costingMethod',
        },
        {
          id: 'blocked',
          label: 'Blocked',
          field: 'blocked',
        },
      ],
    },
    {
      id: 'record-information',
      title: 'Record information',
      collapsed: true,
      fields: [
        {
          id: 'created-at',
          label: 'Created at',
          field: 'systemCreatedAt',
        },
        {
          id: 'created-by',
          label: 'Created by',
          field: 'systemCreatedBy',
        },
        {
          id: 'modified-at',
          label: 'Modified at',
          field: 'systemModifiedAt',
        },
        {
          id: 'modified-by',
          label: 'Modified by',
          field: 'systemModifiedBy',
        },
      ],
    },
  ],
};
