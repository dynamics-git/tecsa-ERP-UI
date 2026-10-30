import {
  DataSourceConfig,
  HeaderConfig,
  ListPageConfig,
  listColumns,
} from '../../../platform/public-api';
import { notificationRulesFactBoxConfig } from './notification-rules.factbox.config';

// Header form.
export const notificationRulesHeaderConfig: HeaderConfig = {
  dialogTitle: 'Notification Setup',
  toolbarButtons: [
    {
      label: 'Save',
      actionKey: 'cmd:save',
      isPrimary: true,
      order: 5,
    },
  ],
  sections: [
    {
      id: 'general',
      title: 'General',
      fields: [
        {
          key: 'code',
          label: 'Code',
          type: 'code',
          required: true,
          readonlyAfterCreate: true,
        },
        {
          key: 'name',
          label: 'Name',
          type: 'text',
          required: true,
        },
        {
          key: 'enabled',
          label: 'Enabled',
          type: 'boolean',
          defaultValue: true,
        },
        {
          key: 'eventKey',
          label: 'Event',
          type: 'lookup',
          required: true,
          lookup: {
            endpoint: '/notificationEvents',
            valueField: 'code',
            displayField: 'name',
            searchFields: ['code', 'name'],
          },
          valueField: 'code',
          labelField: 'name',
        },
        {
          key: 'channel',
          label: 'Channel',
          type: 'dropdown',
          defaultValue: 'in_app',
          options: [
            {
              label: 'In-app',
              value: 'in_app',
            },
          ],
        },
      ],
    },
    {
      id: 'recipients',
      title: 'Recipients',
      fields: [
        {
          key: 'recipientMode',
          label: 'Send to',
          type: 'dropdown',
          defaultValue: 'event',
          options: [
            {
              label: 'Recipients supplied by the event',
              value: 'event',
            },
            {
              label: 'Specific user',
              value: 'user',
            },
            {
              label: 'Users with a permission set',
              value: 'permission_set',
            },
          ],
        },
        {
          key: 'recipientUserId',
          label: 'User',
          type: 'lookup',
          defaultValue: null,
          requiredWhen: {
            field: 'recipientMode',
            values: ['user'],
          },
          hiddenWhen: {
            field: 'recipientMode',
            values: ['user'],
            negate: true,
          },
          lookup: {
            endpoint: '/notificationRecipients',
            valueField: 'systemId',
            displayField: 'name',
            searchFields: ['name', 'userName'],
          },
          valueField: 'systemId',
          labelField: 'name',
        },
        {
          key: 'recipientPermissionSetId',
          label: 'Permission set',
          type: 'lookup',
          defaultValue: null,
          requiredWhen: {
            field: 'recipientMode',
            values: ['permission_set'],
          },
          hiddenWhen: {
            field: 'recipientMode',
            values: ['permission_set'],
            negate: true,
          },
          lookup: {
            endpoint: '/notificationPermissionSets',
            valueField: 'systemId',
            displayField: 'code',
            searchFields: ['code', 'name'],
          },
          valueField: 'systemId',
          labelField: 'code',
        },
      ],
    },
    {
      id: 'message',
      title: 'Message template',
      fields: [
        {
          key: 'titleTemplate',
          label: 'Title',
          type: 'text',
          defaultValue: '{{actorName}} mentioned you',
          required: true,
        },
        {
          key: 'messageTemplate',
          label: 'Message',
          type: 'textarea',
          defaultValue: 'Open {{recordLabel}} to view the note.',
          required: true,
          width: 'wide',
          placeholder:
            'Use registered event tokens, for example {{actorName}} and {{recordLabel}}.',
        },
      ],
    },
  ],
};

// List page.
export const notificationRulesListConfig: ListPageConfig & {
  dataSource: DataSourceConfig;
} = {
  pageId: 'notification-rules',
  pageType: 'card',
  title: 'Notification Setup',
  autoSave: false,
  dataSource: {
    endpoint: '/notificationRules',
    keyField: 'systemId',
    headerPKProp: 'code',
    defaultSort: 'code asc',
    supportsDelete: false,
    lazyCreateOnFirstInput: true,
    requiredCreateFields: ['code', 'name', 'eventKey'],
    newRecordDefaults: {
      enabled: true,
      channel: 'in_app',
      recipientMode: 'event',
      titleTemplate: '{{actorName}} mentioned you',
      messageTemplate: 'Open {{recordLabel}} to view the note.',
    },
  },
  identity: {
    primaryField: 'code',
    secondaryField: 'name',
  },
  module: 'Administration',
  menu: {
    module: 'Administration',
    group: 'Collaboration',
    icon: 'ts-icon ts-icon-bell',
    moduleIcon: 'ts-icon ts-icon-administration-module',
    route: '/notification-rules',
  },
  dataSurface: {
    columns: listColumns(notificationRulesHeaderConfig, [
      {
        field: 'code',
      },
      {
        field: 'name',
      },
      {
        field: 'eventKey',
      },
      {
        field: 'enabled',
      },
      {
        field: 'channel',
      },
      {
        field: 'recipientMode',
      },
    ]),
  },
  factBox: notificationRulesFactBoxConfig,
};
