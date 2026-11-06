import type { FactBoxConfig } from '../../../platform/public-api';

// Reuse shared automatic Header/List details and configured selected-line fields.
// Captions and value formatting come from the same resolved fields/columns.
export const purchaseRequisitionFactBoxConfig: FactBoxConfig = {
  enabled: true,
  label: 'Requisition information',
  overview: true,
  notes: true,
  attachments: true,
  binding: { titleField: 'number' },
};
