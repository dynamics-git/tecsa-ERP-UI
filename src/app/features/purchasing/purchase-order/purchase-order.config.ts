import {
  DataSourceConfig,
  HeaderConfig,
  LineConfig,
  ListPageConfig,
  listColumns,
} from '../../../platform/public-api';
import { purchaseOrderFactBoxConfig } from './purchase-order.factbox.config';

// Ordinary CRUD only. Posting, release and approval commands are separate business work.
// No allocator is published for this source: enter No. before the first POST.
export const purchaseOrderHeaderConfig: HeaderConfig = {
  dialogTitle: 'Purchase Order',
  toolbarButtons: [],
  sections: [
    {
      id: 'general',
      title: 'General',
      fields: [
        {
          key: 'documentType',
          label: 'Document Type',
          type: 'integer',
          hidden: true,
          readonlyAfterCreate: true,
          defaultValue: 1,
        },
        {
          key: 'number',
          label: 'No.',
          type: 'code',
          required: true,
          readonlyAfterCreate: true,
          validation: {
            maxLength: 20,
          },
        },
        {
          key: 'buyFromVendorNo',
          label: 'Buy-from Vendor No.',
          type: 'lookup',
          valueType: 'code',
          lookup: {
            endpoint: '/vendors',
            valueField: 'number',
            displayField: 'number',
            recordRead: 'collection',
          },
          fill: {
            buyFromVendorName: 'name',
          },
        },
        {
          key: 'buyFromVendorName',
          label: 'Buy-from Vendor Name',
          type: 'text',
          validation: {
            maxLength: 100,
          },
        },
        {
          key: 'orderDate',
          label: 'Order Date',
          type: 'date',
        },
        {
          key: 'documentDate',
          label: 'Document Date',
          type: 'date',
        },
        {
          key: 'postingDate',
          label: 'Posting Date',
          type: 'date',
        },
        {
          key: 'expectedReceiptDate',
          label: 'Expected Receipt Date',
          type: 'date',
        },
        {
          key: 'vendorOrderNo',
          label: 'Vendor Order No.',
          type: 'code',
          validation: {
            maxLength: 35,
          },
        },
        {
          key: 'yourReference',
          label: 'Your Reference',
          type: 'text',
          validation: {
            maxLength: 35,
          },
        },
        {
          key: 'status',
          label: 'Status',
          type: 'select',
          valueType: 'integer',
          readonly: true,
          options: [
            {
              label: 'Open',
              value: 0,
            },
            {
              label: 'Released',
              value: 1,
            },
            {
              label: 'Pending Approval',
              value: 2,
            },
            {
              label: 'Pending Prepayment',
              value: 3,
            },
          ],
        },
      ],
    },
    {
      id: 'invoice',
      title: 'Invoice Details',
      fields: [
        {
          key: 'payToVendorNo',
          label: 'Pay-to Vendor No.',
          type: 'lookup',
          valueType: 'code',
          lookup: {
            endpoint: '/vendors',
            valueField: 'number',
            displayField: 'number',
            recordRead: 'collection',
          },
          fill: {
            payToName: 'name',
          },
        },
        {
          key: 'payToName',
          label: 'Pay-to Name',
          type: 'text',
          validation: {
            maxLength: 100,
          },
        },
        {
          key: 'currencyCode',
          label: 'Currency Code',
          type: 'lookup',
          valueType: 'code',
          lookup: {
            endpoint: '/currencies',
            valueField: 'code',
            displayField: 'code',
            recordRead: 'collection',
          },
        },
        {
          key: 'paymentTermsCode',
          label: 'Payment Terms Code',
          type: 'lookup',
          valueType: 'code',
          lookup: {
            endpoint: '/paymentTerms',
            valueField: 'code',
            displayField: 'code',
            recordRead: 'collection',
          },
        },
        {
          key: 'paymentMethodCode',
          label: 'Payment Method Code',
          type: 'lookup',
          valueType: 'code',
          lookup: {
            endpoint: '/paymentMethods',
            valueField: 'code',
            displayField: 'code',
            recordRead: 'collection',
          },
        },
        {
          key: 'vendorInvoiceNo',
          label: 'Vendor Invoice No.',
          type: 'code',
          validation: {
            maxLength: 35,
          },
        },
        {
          key: 'pricesIncludingVat',
          label: 'Prices Including VAT',
          type: 'boolean',
          defaultValue: false,
        },
      ],
    },
    {
      id: 'shipping',
      title: 'Shipping',
      fields: [
        {
          key: 'locationCode',
          label: 'Location Code',
          type: 'lookup',
          valueType: 'code',
          lookup: {
            endpoint: '/locations',
            valueField: 'code',
            displayField: 'code',
            recordRead: 'collection',
          },
        },
        {
          key: 'shipToName',
          label: 'Ship-to Name',
          type: 'text',
          validation: {
            maxLength: 100,
          },
        },
        {
          key: 'shipToAddress',
          label: 'Ship-to Address',
          type: 'text',
          validation: {
            maxLength: 100,
          },
        },
        {
          key: 'shipToCity',
          label: 'Ship-to City',
          type: 'text',
          validation: {
            maxLength: 30,
          },
        },
      ],
    },
  ],
};

export const purchaseOrderListConfig: ListPageConfig & {
  dataSource: DataSourceConfig;
} = {
  pageId: 'purchase-order',
  pageType: 'document',
  title: 'Purchase Order',
  dataSource: {
    endpoint: '/purchaseHeaders',
    keyField: 'systemId',
    headerPKProp: 'number',
    defaultSort: 'number desc',
    defaultFilter: 'documentType eq 1',
    newRecordDefaults: {
      documentType: 1,
    },
  },
  identity: {
    primaryField: 'number',
    secondaryField: 'buyFromVendorName',
  },
  module: 'Purchase',
  menu: {
    module: 'Purchase',
    group: 'Documents',
    route: '/purchase-order',
    icon: 'ts-icon ts-icon-purchase-order',
    moduleIcon: 'ts-icon ts-icon-purchase-module',
  },
  dataSurface: {
    columns: listColumns(purchaseOrderHeaderConfig, [
      { field: 'number' },
      { field: 'buyFromVendorNo' },
      { field: 'buyFromVendorName' },
      { field: 'orderDate' },
      { field: 'status' },
    ]),
  },
  factBox: purchaseOrderFactBoxConfig,
};

export const purchaseOrderLineConfig: LineConfig = {
  typeField: 'type',
  placement: {
    mode: 'after-section',
    afterSectionId: 'general',
  },
  dataSource: {
    endpoint: '/purchaseLines',
    keyField: 'systemId',
    headerPKProp: 'number',
    lineFKProp: 'documentNumber',
    parentFieldMap: {
      documentType: 'documentType',
    },
    defaultSort: 'lineNo asc',
    invalidates: ['/purchaseHeaders'],
  },
  columns: [
    {
      id: 'lineNo',
      label: 'Line No.',
      type: 'integer',
      readonly: true,
    },
    {
      id: 'type',
      label: 'Type',
      type: 'dropdown',
      valueType: 'integer',
      defaultValue: 2,
      options: [
        {
          label: ' ',
          value: 0,
        },
        {
          label: 'G/L Account',
          value: 1,
        },
        {
          label: 'Item',
          value: 2,
        },
        {
          label: 'Resource',
          value: 3,
        },
        {
          label: 'Fixed Asset',
          value: 4,
        },
        {
          label: 'Charge (Item)',
          value: 5,
        },
        {
          label: 'Allocation Account',
          value: 10,
        },
      ],
      clearFieldsOnChange: ['number', 'description', 'unitOfMeasureCode'],
    },
    {
      id: 'itemNumber',
      field: 'number',
      label: 'No.',
      type: 'lookup',
      valueType: 'code',
      editableWhen: {
        field: 'type',
        values: [2],
      },
      lookup: {
        endpoint: '/items',
        valueField: 'number',
        displayField: 'number',
        recordRead: 'collection',
        filter: 'blocked eq false',
      },
      fill: {
        description: 'description',
      },
      displayColumn: 'number',
    },
    {
      id: 'glAccountNumber',
      field: 'number',
      label: 'No.',
      type: 'lookup',
      valueType: 'code',
      editableWhen: {
        field: 'type',
        values: [1],
      },
      lookup: {
        endpoint: '/glAccounts',
        valueField: 'number',
        displayField: 'number',
        recordRead: 'collection',
        filter: 'accountType eq 0 and blocked eq false',
      },
      fill: {
        description: 'name',
      },
      displayColumn: 'number',
    },
    {
      id: 'itemChargeNumber',
      field: 'number',
      label: 'No.',
      type: 'lookup',
      valueType: 'code',
      editableWhen: {
        field: 'type',
        values: [5],
      },
      lookup: {
        endpoint: '/itemCharges',
        valueField: 'number',
        displayField: 'number',
        recordRead: 'collection',
      },
      fill: {
        description: 'description',
      },
      displayColumn: 'number',
    },
    {
      id: 'number',
      label: 'No.',
      type: 'code',
      editableWhen: {
        field: 'type',
        values: [0, 3, 4, 10],
      },
      displayColumn: 'number',
      validation: {
        maxLength: 20,
      },
    },
    {
      id: 'description',
      label: 'Description',
      type: 'text',
      validation: {
        maxLength: 100,
      },
    },
    {
      id: 'locationCode',
      label: 'Location Code',
      type: 'lookup',
      valueType: 'code',
      lookup: {
        endpoint: '/locations',
        valueField: 'code',
        displayField: 'code',
        recordRead: 'collection',
      },
    },
    {
      id: 'quantity',
      label: 'Quantity',
      type: 'decimal',
      defaultValue: '1',
      validation: {
        precision: 38,
        scale: 20,
      },
    },
    {
      id: 'unitOfMeasureCode',
      label: 'Unit of Measure Code',
      type: 'lookup',
      valueType: 'code',
      lookup: {
        endpoint: '/unitsOfMeasure',
        valueField: 'code',
        displayField: 'code',
        recordRead: 'collection',
      },
    },
    {
      id: 'directUnitCost',
      label: 'Direct Unit Cost',
      type: 'decimal',
      defaultValue: '0',
      validation: {
        precision: 38,
        scale: 20,
      },
    },
    {
      id: 'lineDiscountPercent',
      label: 'Line Discount %',
      type: 'decimal',
      defaultValue: '0',
      validation: {
        precision: 38,
        scale: 20,
        min: 0,
        max: 100,
      },
    },
    {
      id: 'expectedReceiptDate',
      label: 'Expected Receipt Date',
      type: 'date',
    },
  ],
};
