import {
  DataSourceConfig,
  HeaderConfig,
  ListPageConfig,
  listColumns,
} from '../../../platform/public-api';
import { vendorsFactBoxConfig } from './vendors.factbox.config';

// Header form.
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
      runModalRecord: {
        source: 'header',
        fields: {
          number: 'number',
        },
      },
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
          type: 'code',
          readonlyAfterCreate: true,
          validation: {
            maxLength: 20,
          },
          required: true,
        },
        {
          key: 'name',
          label: 'Name',
          type: 'text',
          validation: {
            maxLength: 100,
          },
        },
        {
          key: 'searchName',
          label: 'Search Name',
          type: 'code',
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
          key: 'vatRegistrationNo',
          label: 'Tax Registration Number',
          type: 'text',
          validation: {
            maxLength: 20,
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
          type: 'dropdown',
          defaultValue: 0,
          options: [
            {
              label: ' ',
              value: 0,
            },
            {
              label: 'Payment',
              value: 1,
            },
            {
              label: 'All',
              value: 2,
            },
          ],
          valueType: 'integer',
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
          key: 'vendorPostingGroup',
          label: 'Vendor Posting Group',
          type: 'lookup',
          valueType: 'code',
          defaultValue: '',
          lookup: {
            endpoint: '/vendorPostingGroups',
            valueField: 'code',
            displayField: 'code',
            searchFields: ['code', 'description'],
            recordRead: 'collection',
          },
          displayFormat: '[code] — [description]',
          validation: {
            maxLength: 20,
          },
        },
        {
          key: 'genBusPostingGroup',
          label: 'General Business Posting Group',
          type: 'lookup',
          valueType: 'code',
          defaultValue: '',
          lookup: {
            endpoint: '/generalBusinessPostingGroups',
            valueField: 'code',
            displayField: 'code',
            searchFields: ['code', 'description'],
            recordRead: 'collection',
          },
          displayFormat: '[code] — [description]',
          validation: {
            maxLength: 20,
          },
        },
        {
          key: 'vatBusPostingGroup',
          label: 'Vat Business Posting Group',
          type: 'lookup',
          valueType: 'code',
          defaultValue: '',
          lookup: {
            endpoint: '/vatBusinessPostingGroups',
            valueField: 'code',
            displayField: 'code',
            searchFields: ['code', 'description'],
            recordRead: 'collection',
          },
          displayFormat: '[code] — [description]',
          validation: {
            maxLength: 20,
          },
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
          key: 'county',
          label: 'State',
          type: 'text',
          validation: {
            maxLength: 30,
          },
        },
        {
          key: 'postCode',
          label: 'Postal Code',
          type: 'code',
          validation: {
            maxLength: 20,
          },
        },
        {
          key: 'countryRegionCode',
          label: 'Country Code',
          type: 'code',
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
          key: 'phoneNo',
          label: 'Phone Number',
          type: 'text',
          validation: {
            maxLength: 30,
          },
        },
        {
          key: 'eMail',
          label: 'Email',
          type: 'email',
          validation: {
            maxLength: 80,
          },
        },
        {
          key: 'homePage',
          label: 'Website',
          type: 'url',
          validation: {
            maxLength: 255,
          },
        },
      ],
    },
  ],
};

// List page.
export const vendorsListConfig: ListPageConfig & {
  dataSource: DataSourceConfig;
} = {
  pageId: 'vendors',
  pageType: 'card',
  title: 'Vendors',
  dataSource: {
    endpoint: '/vendors',
    keyField: 'systemId',
    headerPKProp: 'number',
    defaultSort: 'number asc',
    autoGenerateNumber: true,
    lazyCreateOnFirstInput: true,
    omitEmptyFields: ['number'],
  },
  identity: {
    primaryField: 'number',
    secondaryField: 'name',
  },
  module: 'Purchase',
  menu: {
    module: 'Purchase',
    group: 'Masters',
    icon: 'ts-icon ts-icon-vendors',
    moduleIcon: 'ts-icon ts-icon-purchase-module',
    route: '/vendors',
  },
  dataSurface: {
    columns: listColumns(vendorsHeaderConfig, [
      {
        field: 'number',
      },
      {
        field: 'name',
      },
      {
        field: 'contact',
        width: '140px',
      },
      {
        field: 'eMail',
        width: '240px',
      },
      {
        field: 'city',
        width: '140px',
      },
      {
        field: 'countryRegionCode',
        width: '140px',
      },
      {
        field: 'paymentTermsId',
        width: '140px',
      },
      {
        field: 'currencyId',
        width: '140px',
      },
      {
        field: 'blocked',
        width: '140px',
      },
      {
        field: 'systemModifiedAt',
      },
    ]),
  },
  factBox: vendorsFactBoxConfig,
};
