import {
  CommandConfig,
  DataSourceConfig,
  FooterSectionConfig,
  HeaderConfig,
  LineConfig,
  ListPageConfig,
  listColumns,
} from '../../../platform/public-api';
import { purchaseOrderFactBoxConfig } from './purchase-order.factbox.config';

// Header form.
export const purchaseOrderHeaderConfig: HeaderConfig = {
  dialogTitle: 'Purchase Order',
  toolbarButtons: [
    // Real PO command from old app. UI/config reference only; business logic is not implemented yet.
    {
      label: 'Release',
      actionKey: 'cmd:release',
      group: 'Process',
      isPrimary: true,
      order: 10,
      icon: 'ts-icon ts-icon-refresh',
    },
    // Real PO command from old app. UI/config reference only; business logic is not implemented yet.
    {
      label: 'Re-Open',
      actionKey: 'cmd:reopen',
      group: 'Process',
      order: 20,
      icon: 'ts-icon ts-icon-logout',
    },
    {
      label: 'Pre payment',
      actionKey: 'cmd:prepayment',
      group: 'Process',
      isPrimary: true,
      order: 30,
      icon: 'ts-icon ts-icon-card',
    },
    // Real PO command from old app. UI/config reference only; business logic is not implemented yet.
    {
      label: 'Send Approval Request',
      actionKey: 'cmd:SendApprovalRequest',
      group: 'Approval',
      isPrimary: true,
      order: 40,
      icon: 'ts-icon ts-icon-send',
    },
    // Real PO command from old app. UI/config reference only; business logic is not implemented yet.
    {
      label: 'Cancel Approval Request',
      actionKey: 'cmd:CancelApprovalRequest',
      group: 'Approval',
      order: 50,
      icon: 'ts-icon ts-icon-close-circle',
    },
    // Real PO command from old app. UI/config reference only; business logic is not implemented yet.
    {
      label: 'GRN Review',
      actionKey: 'cmd:GRNReview',
      group: 'Review',
      order: 60,
      icon: 'ts-icon ts-icon-check-square',
    },
    // Real PO command from old app. UI/config reference only; business logic is not implemented yet.
    {
      label: 'Cancel GRN Review',
      actionKey: 'cmd:CancelGRNReview',
      group: 'Review',
      order: 70,
      icon: 'ts-icon ts-icon-close-square',
    },
    // Real PO command from old app. UI/config reference only; business logic is not implemented yet.
    {
      label: 'Invoice Review',
      actionKey: 'cmd:InvoiceReview',
      group: 'Review',
      order: 80,
      icon: 'ts-icon ts-icon-receipt',
    },
    // Real PO command from old app. UI/config reference only; business logic is not implemented yet.
    {
      label: 'Cancel Invoice Review',
      actionKey: 'cmd:CancelInvoiceReview',
      group: 'Review',
      order: 90,
      icon: 'ts-icon ts-icon-close-square',
    },
    // Real PO command from old app. UI/config reference only; business logic is not implemented yet.
    {
      label: 'Post',
      actionKey: 'cmd:Post',
      group: 'Process',
      isPrimary: true,
      order: 100,
      icon: 'ts-icon ts-icon-upload',
    },
    // Real PO command from old app. UI/config reference only; business logic is not implemented yet.
    {
      label: 'Convert to Variation Order',
      actionKey: 'cmd:ConverttoVariationOrder',
      group: 'Process',
      order: 110,
      icon: 'ts-icon ts-icon-exchange',
    },
    // Real PO command from old app. UI/config reference only; business logic is not implemented yet.
    {
      label: 'Manual PO Cancel',
      actionKey: 'cmd:manualPOCancel',
      group: 'More',
      order: 120,
      icon: 'ts-icon ts-icon-ban',
    },
    // Real PO command from old app. UI/config reference only; business logic is not implemented yet.
    {
      label: 'Submit Workflow',
      actionKey: 'cmd:SubmitWorkflow',
      group: 'Approval',
      order: 130,
      icon: 'ts-icon ts-icon-send',
    },
    // Real PO command from old app. UI/config reference only; business logic is not implemented yet.
    {
      label: 'Cancel Workflow',
      actionKey: 'cmd:CancelWorkflow',
      group: 'Approval',
      order: 140,
      icon: 'ts-icon ts-icon-close-circle',
    },
  ],
  sections: [
    {
      id: 'header-main',
      title: 'Primary Details',
      fields: [
        {
          key: 'number',
          label: 'No',
          type: 'text',
          readonly: true,
          factBox: {
            sectionId: 'document',
            sectionTitle: 'Document',
            order: 10,
            fallback: '-',
          },
        },
        {
          key: 'dueDate',
          label: 'Due Date',
          type: 'date',
          readonly: true,
        },
        {
          key: 'buyFromVendorNumber',
          label: 'Vendor No',
          type: 'dropdown',
          api: ['/vendorsAPI', '/vendors'],
          valueField: 'number',
          labelField: 'name',
          fill: {
            buyFromVendorName: 'name',
          },
        },
        {
          key: 'orderDate',
          label: 'Order Date',
          type: 'date',
          readonly: true,
          factBox: {
            sectionId: 'document',
            sectionTitle: 'Document',
            order: 30,
            fallback: '-',
          },
        },
        {
          key: 'buyFromVendorName',
          label: 'Vendor Name',
          type: 'text',
          readonly: true,
          width: 'wide',
          factBox: {
            sectionId: 'document',
            sectionTitle: 'Document',
            label: 'Vendor',
            order: 20,
            fallback: '-',
          },
        },
        {
          key: 'requestedReceiptDate',
          label: 'Requested Receipt Date',
          type: 'date',
          readonly: true,
        },
        {
          key: 'buyFromAddress',
          label: 'Address',
          type: 'text',
          readonly: true,
          width: 'wide',
        },
        {
          key: 'purchaserCode',
          label: 'Purchaser Code',
          type: 'dropdown',
          api: '/salespersonPurchasers',
          valueField: 'code',
          labelField: 'name',
        },
        {
          key: 'buyFromCountryOrRegionCode',
          label: 'Country',
          type: 'text',
          readonly: true,
        },
        {
          key: 'status',
          label: 'Status',
          type: 'text',
          defaultValue: 'Open',
          readonly: true,
          factBox: {
            sectionId: 'review',
            sectionTitle: 'Review',
            order: 10,
            fallback: 'Open',
          },
        },
        {
          key: 'buyFromPostCode',
          label: 'Post Code',
          type: 'text',
          readonly: true,
        },
        {
          key: 'documentDate',
          label: 'Document Date',
          type: 'date',
        },
        {
          key: 'buyFromCity',
          label: 'City',
          type: 'text',
          readonly: true,
        },
        {
          key: 'orderNumber',
          label: 'Order No',
          type: 'text',
          readonly: true,
        },
        {
          key: 'buyFromContactNo',
          label: 'Contact No',
          type: 'text',
          readonly: true,
        },
        {
          key: 'vendorOrderNumber',
          label: 'Vendor Order No',
          type: 'text',
        },
        {
          key: 'vendorInvoiceNumber',
          label: 'Vendor Invoice No',
          type: 'text',
        },
        {
          key: 'vendorShipmentNumber',
          label: 'Vendor Shipment No',
          type: 'text',
        },
        {
          key: 'quoteNumber',
          label: 'Quote No',
          type: 'text',
          readonly: true,
        },
      ],
    },
    {
      id: 'financial',
      title: 'Financial & Delivery Info',
      fields: [
        {
          key: 'shortcutDimension1Code',
          label: 'PROJECT',
          type: 'dropdown',
          api: [
            "/dimensionsValues?$filter=DimensionCode eq 'PROJECT'",
            '/shortcutDimension1Values',
            "/dimensionValues?$filter=DimensionCode eq 'PROJECT'",
          ],
          optionsSkipWhenSuperAdmin: true,
          valueField: 'code',
          labelField: 'name',
        },
        {
          key: 'shortcutDimension2Code',
          label: 'DEPARTMENT/COST CNTR',
          type: 'dropdown',
          api: [
            "/dimensionsValues?$filter=DimensionCode eq 'DEPARTMENT/COST CNTR'",
            '/shortcutDimension2Values',
            "/dimensionValues?$filter=DimensionCode eq 'DEPARTMENT'",
          ],
          optionsSkipWhenSuperAdmin: true,
          valueField: 'code',
          labelField: 'name',
        },
        {
          key: 'paymentTermsCode',
          label: 'Payment Terms Code',
          type: 'dropdown',
          api: '/paymentTerms',
          valueField: 'code',
          labelField: 'description',
        },
        {
          key: 'validityDate',
          label: 'Validity Date',
          type: 'date',
        },
        {
          key: 'deliveryDate',
          label: 'Delivery Date',
          type: 'date',
        },
        {
          key: 'yourReference',
          label: 'Your Reference',
          type: 'text',
        },
        {
          key: 'paymentReference',
          label: 'Payment Reference',
          type: 'text',
        },
        {
          key: 'currencyCode',
          label: 'Currency',
          type: 'dropdown',
          readonly: true,
          api: ['/currencyCodes', '/currencies'],
          valueField: 'code',
          labelField: 'description',
        },
        {
          key: 'accessCenter',
          label: 'Access center',
          type: 'dropdown',
          api: ['/accessCenters', '/AccessCenters'],
          optionsSkipWhenSuperAdmin: true,
          valueField: 'code',
          labelField: 'name',
        },
        {
          key: 'prepayment',
          label: 'Pre payment %',
          type: 'number',
        },
      ],
    },
    {
      id: 'remarks',
      title: 'Remarks',
      fields: [
        {
          key: 'remark',
          label: 'Remark',
          type: 'textarea',
          width: 'wide',
        },
        {
          key: 'postingDate',
          label: 'Posting Date',
          type: 'date',
          factBox: {
            sectionId: 'document',
            sectionTitle: 'Document',
            order: 40,
            fallback: '-',
          },
        },
      ],
    },
  ],
};
export const purchaseOrderListCommandsConfig: CommandConfig[] = [
  // Demo list toolbar actions only. Business logic can be added by handling these action keys.
  {
    id: 'po-review',
    label: 'Review',
    actionKey: 'cmd:po-review',
    group: 'process',
    icon: 'ts-icon ts-icon-check-square',
  },
  {
    id: 'po-send',
    label: 'Send',
    actionKey: 'cmd:po-send',
    group: 'process',
    icon: 'ts-icon ts-icon-send',
  },
  {
    id: 'po-print',
    label: 'Print',
    actionKey: 'cmd:po-print',
    group: 'documents',
    icon: 'ts-icon ts-icon-printer',
  },
  {
    id: 'po-export-file',
    label: 'Export File',
    actionKey: 'cmd:po-export-file',
    group: 'documents',
    icon: 'ts-icon ts-icon-download',
  },
  {
    id: 'po-more-action',
    label: 'More Action',
    actionKey: 'cmd:po-more-action',
    group: 'more',
    icon: 'ts-icon ts-icon-more',
  },
];

// List page.
export const purchaseOrderListConfig: ListPageConfig & {
  dataSource: DataSourceConfig;
} = {
  pageId: 'purchase-order',
  pageType: 'document',
  title: 'Purchase Order',
  dataSource: {
    endpoint: '/purchaseOrderHeaders',
    keyField: 'systemId',
    headerPKProp: 'number',
    defaultSort: 'number',
    pageSize: 20,
    supportsCreate: false,
    supportsUpdate: false,
    supportsDelete: false,
    contractProfileKey: 'purchaseOrderHeaders',
    autoGenerateNumber: true,
    lazyCreateOnFirstInput: true,
  },
  module: 'Purchase',
  dataSurface: {
    columns: listColumns(purchaseOrderHeaderConfig, [
      {
        field: 'number',
        width: '84px',
        isPrimary: true,
        factBox: {
          sectionId: 'details',
          sectionTitle: 'Details',
          order: 10,
          fallback: '-',
        },
      },
      {
        field: 'buyFromVendorName',
        label: 'Buy-from Vendor Name',
        width: '268px',
        subtitleField: 'buyFromVendorNumber',
        factBox: {
          sectionId: 'details',
          sectionTitle: 'Details',
          order: 20,
          fallback: '-',
        },
      },
      {
        field: 'vendorStatus',
        label: 'Vendor Status',
        type: 'text',
        width: '190px',
        factBox: {
          sectionId: 'details',
          sectionTitle: 'Details',
          order: 25,
          fallback: '-',
        },
      },
      {
        field: 'orderDate',
        width: '132px',
        factBox: {
          sectionId: 'details',
          sectionTitle: 'Details',
          order: 30,
          fallback: '-',
        },
      },
      {
        field: 'postingDate',
        width: '132px',
        factBox: {
          sectionId: 'details',
          sectionTitle: 'Details',
          order: 40,
          fallback: '-',
        },
      },
      {
        field: 'status',
        type: 'badge',
        width: '132px',
        factBox: {
          sectionId: 'details',
          sectionTitle: 'Details',
          order: 50,
          fallback: '-',
        },
      },
      {
        field: 'paymentTermsCode',
        label: 'Payment Terms',
        type: 'text',
        width: '118px',
        factBox: {
          sectionId: 'details',
          sectionTitle: 'Details',
          order: 60,
          fallback: '-',
        },
      },
      {
        field: 'prepayment',
        label: 'Prepayment %',
        width: '126px',
        align: 'end',
        factBox: {
          sectionId: 'amounts',
          sectionTitle: 'Amounts',
          order: 5,
          fallback: '0',
        },
      },
      {
        field: 'currencyCode',
        type: 'text',
        hidden: true,
      },
      {
        field: 'amount',
        label: 'Amount',
        type: 'currency',
        width: '146px',
        align: 'end',
        factBox: {
          sectionId: 'amounts',
          sectionTitle: 'Amounts',
          order: 15,
          fallback: '0',
        },
      },
      {
        field: 'amountIncludingVAT',
        label: 'Amount Including VAT',
        type: 'currency',
        width: '164px',
        align: 'end',
        factBox: {
          sectionId: 'amounts',
          sectionTitle: 'Amounts',
          order: 20,
          fallback: '0',
        },
      },
      {
        field: 'grnReviewStatus',
        label: 'GRN Review',
        type: 'text',
        width: '124px',
        factBox: {
          sectionId: 'review',
          sectionTitle: 'Review',
          order: 10,
          fallback: '-',
        },
      },
      {
        field: 'invoiceReviewStatus',
        label: 'Invoice Review',
        type: 'text',
        width: '132px',
        factBox: {
          sectionId: 'review',
          sectionTitle: 'Review',
          order: 20,
          fallback: '-',
        },
      },
      {
        field: 'manualPoCancel',
        label: 'Manual PO Cancel',
        type: 'boolean',
        hidden: true,
        factBox: {
          sectionId: 'review',
          sectionTitle: 'Review',
          order: 30,
          fallback: 'false',
        },
      },
      {
        field: 'variationOrder',
        label: 'Variation Order',
        type: 'boolean',
        width: '132px',
        factBox: {
          sectionId: 'review',
          sectionTitle: 'Review',
          order: 40,
          fallback: 'false',
        },
      },
      {
        field: 'systemModifiedAt',
        label: 'Modified',
        type: 'date',
        hidden: true,
      },
      {
        field: 'createdBy',
        label: 'Created By',
        type: 'text',
        hidden: true,
        factBox: {
          sectionId: 'system',
          sectionTitle: 'System',
          order: 20,
        },
      },
    ]),
  },
  views: [
    {
      id: 'all',
      label: 'All',
    },
    {
      id: 'open',
      label: 'Open',
      filter: "status eq 'Open'",
    },
    {
      id: 'posted',
      label: 'Posted',
      filter: "status eq 'Posted'",
    },
    {
      id: 'exception',
      label: 'Exception',
      filter: "status eq 'Exception'",
    },
  ],
  activeViewId: 'all',
  filterConfig: {
    enabled: true,
    storageKey: 'purchase-order-list',
  },
  commands: purchaseOrderListCommandsConfig,
  commandSelectionPolicy: {
    defaultMode: 'single',
  },
  factBox: purchaseOrderFactBoxConfig,
  company: 'Cronus International Ltd.',
  viewSuffix: 'purchase orders',
};

// Document lines.
export const purchaseOrderLineConfig: LineConfig = {
  placement: {
    mode: 'after-section',
    afterSectionId: 'header-main',
  },
  dataSource: {
    endpoint: '/purchaseOrderLines',
    keyField: 'systemId',
    headerPKProp: 'number',
    lineFKProp: 'documentNo',
    parentFixedFields: {
      documentType: 'Order',
    },
    defaultSort: 'lineNo',
    supportsCreate: false,
    supportsUpdate: false,
    supportsDelete: false,
    createFields: ['documentType', 'documentNo', 'lineNo', 'type', 'no', 'quantity'],
    updateBlockedFields: ['systemId', 'id', 'documentNo', 'lineNo'],
  },
  toolbarButtons: [
    {
      label: 'Line',
      actionKey: 'cmd:line-new',
      group: 'Process',
      isPrimary: true,
      order: 10,
      icon: 'ts-icon ts-icon-plus',
    },
    {
      label: 'Insert',
      actionKey: 'cmd:line-insert',
      group: 'Process',
      order: 20,
    },
    {
      label: 'Delete',
      actionKey: 'cmd:line-delete',
      group: 'Process',
      order: 25,
      icon: 'ts-icon ts-icon-trash',
    },
    {
      label: 'Attachments',
      actionKey: 'dialog:attachments',
      group: 'More',
      order: 30,
      icon: 'ts-icon ts-icon-clip',
    },
  ],
  columns: [
    {
      id: 'type',
      label: 'Type',
      type: 'dropdown',
      options: [
        {
          label: 'G/L Account',
          value: 'G/L Account',
          api: '/glAccounts',
        },
        {
          label: 'Item',
          value: 'Item',
          api: '/Items',
        },
        {
          label: 'Fixed Asset',
          value: 'Fixed Asset',
          api: '/fixedAssets',
        },
        {
          label: 'Comment',
          value: ' ',
        },
      ],
      field: 'type',
    },
    {
      id: 'no',
      label: 'No',
      type: 'dropdown',
      field: 'no',
      valueField: ['no', 'number', 'code'],
      labelField: ['description', 'name'],
      fill: {
        description: 'description',
        unitOfMeasure: ['baseUnitOfMeasure', 'unitOfMeasureCode'],
        directUnitCost: ['directUnitCost', 'unitCost', 'unitPrice'],
      },
    },
    {
      id: 'description',
      label: 'Description',
      type: 'text',
      field: 'description',
      factBox: {
        sectionId: 'line',
        sectionTitle: 'Line',
        order: 10,
        fallback: '-',
      },
    },
    {
      id: 'unitOfMeasure',
      label: 'Unit Of Measure',
      type: 'dropdown',
      field: 'unitOfMeasure',
      api: '/unitOfMeasures',
      valueField: 'code',
      labelField: 'description',
    },
    {
      id: 'locationCode',
      label: 'Location',
      type: 'dropdown',
      field: 'locationCode',
      api: '/locations',
      valueField: 'code',
      labelField: 'name',
    },
    {
      id: 'quantity',
      label: 'Quantity',
      type: 'number',
      field: 'quantity',
      align: 'end',
      factBox: {
        sectionId: 'line',
        sectionTitle: 'Line',
        order: 20,
        fallback: '0',
      },
    },
    {
      id: 'directUnitCost',
      label: 'Original Cost/Unit',
      type: 'number',
      field: 'directUnitCost',
      align: 'end',
      factBox: {
        sectionId: 'line',
        sectionTitle: 'Line',
        order: 30,
        fallback: '0',
      },
    },
    {
      id: 'lineAmount',
      label: 'PO Amount',
      type: 'number',
      readonly: true,
      field: 'lineAmount',
      align: 'end',
      factBox: {
        sectionId: 'line',
        sectionTitle: 'Line',
        order: 40,
        fallback: '0',
      },
    },
    {
      id: 'amountToInvoice',
      label: 'Amount To Invoice',
      type: 'number',
      readonly: true,
      field: 'amountToInvoice',
      align: 'end',
      factBox: {
        sectionId: 'line',
        sectionTitle: 'Line',
        order: 50,
        fallback: '0',
      },
    },
    {
      id: 'amountInvoiced',
      label: 'Amount Invoiced',
      type: 'number',
      readonly: true,
      field: 'amountInvoiced',
      align: 'end',
      factBox: {
        sectionId: 'line',
        sectionTitle: 'Line',
        order: 60,
        fallback: '0',
      },
    },
    {
      id: 'Attachment',
      label: '',
      cellType: 'icon',
      buttonIcon: 'ts-icon ts-icon-clip',
      buttonTitle: 'Line attachment',
      actionKey: 'dialog:attachments',
    },
  ],
  calculation: [
    {
      target: 'lineAmount',
      formula: 'quantity * directUnitCost',
    },
    {
      target: 'amountToInvoice',
      formula: 'lineAmount',
    },
  ],
  totalsCalculation: {
    defaults: {
      subtotal: '0.00',
      sst: '0.00',
      total: '0.00',
      difference: '0.00',
    },
    format: {
      type: 'currency',
      currencyCodeHeaderField: 'currencyCode',
    },
    totals: {
      subtotal: {
        formula: 'sum(lineAmount)',
      },
      sst: {
        kind: 'default',
      },
      total: {
        formula: 'sum(lineAmount)',
      },
      difference: {
        formula: 'sum(lineAmount) - sum(amountInvoiced)',
      },
    },
  },
  footerSections: [
    {
      id: 'document-totals',
      rows: [
        {
          id: 'amount-excl-sst',
          label: 'Amount Excl. SST',
          source: 'total',
          totalKey: 'subtotal',
          order: 10,
        },
        {
          id: 'sst',
          label: 'SST',
          source: 'total',
          totalKey: 'sst',
          order: 20,
        },
        {
          id: 'total-incl-sst',
          label: 'Total Incl. SST',
          source: 'total',
          totalKey: 'total',
          emphasis: true,
          order: 30,
        },
      ],
    },
  ] satisfies FooterSectionConfig[],
};
