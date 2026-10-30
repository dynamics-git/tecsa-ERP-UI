import type { FactBoxConfig } from '../../../platform/public-api';

export const noSeriesFactBoxConfig: FactBoxConfig = {
  enabled: true,
  sections: [
    {
      id: 'setup',
      title: 'Setup',
      fields: [
        {
          id: 'code',
          field: 'code',
          label: 'Code',
        },
        {
          id: 'description',
          field: 'description',
          label: 'Description',
        },
        {
          id: 'defaultNos',
          field: 'defaultNos',
          label: 'Default Nos',
        },
        {
          id: 'manualNos',
          field: 'manualNos',
          label: 'Manual Nos',
        },
        {
          id: 'dateOrder',
          field: 'dateOrder',
          label: 'Date Order',
        },
        {
          id: 'isActive',
          field: 'isActive',
          label: 'Is Active',
        },
      ],
    },
  ],
};
