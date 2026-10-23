import { HeaderConfig, DataSourceConfig, ListPageConfig, listColumns } from '../../../platform/public-api';
export const vendorsHeaderConfig: HeaderConfig = {
  dialogTitle: 'Vendors',
  toolbarButtons: [
    {
      permissionKey: 'vendors-lines',
      label: 'Dimensions',
      actionKey: 'cmd:open-vendor-default-dimensions',
      icon: 'ts-icon ts-icon-item-default-dimensions',
      group: 'Related',
      order: 40,
      runModalPageId: 'vendor-default-dimensions',
      runModalTarget: 'entry',
    },
  ],
  sections: [
    {
      id: 'general',
      title: 'General',
      fields: [
        {
          key: 'number',
          label: 'Number',
          type: 'text',
          valueType: 'code',
          readonlyAfterCreate: true,
          validation: {
            maxLength: 20,
          },
        },
        {
          key: 'name',
          label: 'Name',
          type: 'text',
          required: true,
          validation: {
            maxLength: 100,
          },
        },
        {
          key: 'searchName',
          label: 'Search Name',
          type: 'text',
          validation: {
            maxLength: 100,
          },
        },
        {
          key: 'name2',
          label: 'Name2',
          type: 'text',
          validation: {
            maxLength: 50,
          },
        },
        {
          key: 'taxRegistrationNumber',
          label: 'Tax Registration Number',
          type: 'text',
          validation: {
            maxLength: 50,
          },
        },
        {
          key: 'ourAccountNo',
          label: 'Our Account No',
          type: 'text',
          validation: {
            maxLength: 20,
          },
        },
        {
          key: 'blocked',
          label: 'Blocked',
          type: 'select',
          valueType: 'text',
          defaultValue: 'none',
          options: [
            {
              value: 'none',
              label: 'None',
            },
            {
              value: 'payment',
              label: 'Payment',
            },
            {
              value: 'all',
              label: 'All',
            },
          ],
        },
      ],
    },
    {
      id: 'posting',
      title: 'Posting & Defaults',
      fields: [
        {
          key: 'paymentTermsId',
          label: 'Payment Terms',
          type: 'lookup',
          valueType: 'guid',
          defaultValue: null,
          lookup: {
            endpoint: '/paymentTerms',
            valueField: 'systemId',
            displayField: 'code',
            searchFields: ['code', 'description'],
          },
          displayFormat: '[code] — [description]',
        },
        {
          key: 'paymentMethodId',
          label: 'Payment Method',
          type: 'lookup',
          valueType: 'guid',
          defaultValue: null,
          lookup: {
            endpoint: '/paymentMethods',
            valueField: 'systemId',
            displayField: 'code',
            searchFields: ['code', 'description'],
          },
          displayFormat: '[code] — [description]',
        },
        {
          key: 'vendorPostingGroupId',
          label: 'Vendor Posting Group',
          type: 'lookup',
          valueType: 'guid',
          defaultValue: null,
          lookup: {
            endpoint: '/vendorPostingGroups',
            valueField: 'systemId',
            displayField: 'code',
            searchFields: ['code', 'description'],
          },
          displayFormat: '[code] — [description]',
        },
        {
          key: 'generalBusinessPostingGroupId',
          label: 'General Business Posting Group',
          type: 'lookup',
          valueType: 'guid',
          defaultValue: null,
          lookup: {
            endpoint: '/generalBusinessPostingGroups',
            valueField: 'systemId',
            displayField: 'code',
            searchFields: ['code', 'description'],
          },
          displayFormat: '[code] — [description]',
        },
        {
          key: 'vatBusinessPostingGroupId',
          label: 'Vat Business Posting Group',
          type: 'lookup',
          valueType: 'guid',
          defaultValue: null,
          lookup: {
            endpoint: '/vatBusinessPostingGroups',
            valueField: 'systemId',
            displayField: 'code',
            searchFields: ['code', 'description'],
          },
          displayFormat: '[code] — [description]',
        },
        {
          key: 'currencyId',
          label: 'Currency',
          type: 'lookup',
          valueType: 'guid',
          defaultValue: null,
          lookup: {
            endpoint: '/currencies',
            valueField: 'systemId',
            displayField: 'code',
            searchFields: ['code', 'description'],
          },
          displayFormat: '[code] — [description]',
        },
      ],
    },
    {
      id: 'contact',
      title: 'Address & Contact',
      fields: [
        {
          key: 'address',
          label: 'Address',
          type: 'text',
          validation: {
            maxLength: 100,
          },
        },
        {
          key: 'address2',
          label: 'Address2',
          type: 'text',
          validation: {
            maxLength: 50,
          },
        },
        {
          key: 'city',
          label: 'City',
          type: 'text',
          validation: {
            maxLength: 30,
          },
        },
        {
          key: 'state',
          label: 'State',
          type: 'text',
          validation: {
            maxLength: 50,
          },
        },
        {
          key: 'postalCode',
          label: 'Postal Code',
          type: 'text',
          validation: {
            maxLength: 20,
          },
        },
        {
          key: 'countryCode',
          label: 'Country Code',
          type: 'text',
          valueType: 'code',
          validation: {
            maxLength: 10,
          },
        },
        {
          key: 'contact',
          label: 'Contact',
          type: 'text',
          validation: {
            maxLength: 100,
          },
        },
        {
          key: 'phoneNumber',
          label: 'Phone Number',
          type: 'text',
          validation: {
            maxLength: 30,
          },
        },
        {
          key: 'email',
          label: 'Email',
          type: 'email',
          valueType: 'email',
          validation: {
            maxLength: 255,
          },
        },
        {
          key: 'website',
          label: 'Website',
          type: 'url',
          valueType: 'url',
          validation: {
            maxLength: 255,
          },
        },
      ],
    },
  ],
};

export const vendorsListConfig: ListPageConfig & { dataSource: DataSourceConfig } = {
  pageId: 'vendors',
  pageType: 'card',
  autoSave: true,
  title: 'Vendors',
  module: 'Purchase',
  identity: {
    primaryField: 'number',
    secondaryField: 'name',
  },
  menu: {
    module: 'Purchase',
    group: 'Masters',
    icon: 'ts-icon ts-icon-vendors',
    route: '/vendors',
    moduleIcon: 'ts-icon ts-icon-purchase-module',
  },
  dataSource: {
    endpoint: '/vendors',
    keyField: 'systemId',
    defaultSort: 'number asc',
    autoGenerateNumber: true,
    lazyCreateOnFirstInput: true,
    documentNoField: 'number',
    omitEmptyFields: ['number'],
  },
  dataSurface: {
    idField: 'systemId',
    columns: listColumns(vendorsHeaderConfig, [
      'number',
      'name',
      { field: 'contact', width: '140px' },
      { field: 'email', width: '240px' },
      { field: 'city', width: '140px' },
      { field: 'countryCode', width: '140px' },
      { field: 'paymentTermsId', width: '140px' },
      { field: 'currencyId', width: '140px' },
      { field: 'blocked', width: '140px' },
      'systemModifiedAt',
    ]),
  },
  factBox: { enabled: true },
};
