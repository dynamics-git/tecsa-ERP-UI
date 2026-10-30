import type { FactBoxConfig } from '../../../platform/public-api';
export const usersFactBoxConfig: FactBoxConfig = {
  enabled: true,
  label: 'User information',
  overview: true,
  notes: true,
  attachments: true,
  defaultSectionId: 'overview',
  binding: {
    titleField: 'userName',
    subtitleField: 'name',
  },
  sections: [
    {
      id: 'details',
      title: 'Details',
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
