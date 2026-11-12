import type { FactBoxConfig } from '../../../platform/public-api';

export const itemsFactBoxConfig: FactBoxConfig = {
  enabled: true,
  label: 'Item information',
  overview: true,
  notes: true,
  attachments: true,
  defaultSectionId: 'overview',
  binding: { titleField: 'number', subtitleField: 'description' },
  sections: [
    {
      id: 'value',
      title: 'Price & Cost',
      layout: 'metrics',
      fields: [
        { id: 'price', label: 'Unit Price', field: 'unitPrice' },
        { id: 'cost', label: 'Unit Cost', field: 'unitCost' },
      ],
    },
    {
      id: 'classification',
      title: 'Classification',
      fields: [
        { id: 'type', label: 'Type', field: 'type' },
        { id: 'unit', label: 'Base Unit of Measure', field: 'baseUnitOfMeasure' },
        { id: 'category', label: 'Item Category Code', field: 'itemCategoryCode' },
        { id: 'costing', label: 'Costing Method', field: 'costingMethod' },
      ],
    },
    {
      id: 'restrictions',
      title: 'Restrictions',
      fields: [
        { id: 'blocked', label: 'Blocked', field: 'blocked' },
        { id: 'sales-blocked', label: 'Sales Blocked', field: 'salesBlocked' },
        { id: 'purchasing-blocked', label: 'Purchasing Blocked', field: 'purchasingBlocked' },
      ],
    },
    {
      id: 'record-information',
      title: 'Record Information',
      collapsed: true,
      fields: [
        { id: 'created', label: 'Created at', field: 'systemCreatedAt', type: 'datetime' },
        { id: 'modified', label: 'Modified at', field: 'systemModifiedAt', type: 'datetime' },
      ],
    },
  ],
};
