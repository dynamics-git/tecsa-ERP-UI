import type { FactBoxConfig } from '../../../platform/public-api';
export const permissionSetsFactBoxConfig: FactBoxConfig = {
  enabled: true,
  label: 'Permission Set information',
  overview: true,
  notes: false,
  attachments: false,
  defaultSectionId: 'overview',
  binding: {
    titleField: 'code',
    subtitleField: 'name',
  },
  sections: [
    {
      id: 'details',
      title: 'Details',
      fields: [
        {
          id: 'system',
          field: 'isSystem',
          label: 'System Owned',
          type: 'boolean',
        },
        {
          id: 'created',
          field: 'systemCreatedAt',
          label: 'Created at',
          type: 'datetime',
        },
        {
          id: 'modified',
          field: 'systemModifiedAt',
          label: 'Modified at',
          type: 'datetime',
        },
      ],
    },
  ],
};
