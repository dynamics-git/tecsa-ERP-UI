import {
  DataSourceConfig,
  HeaderConfig,
  LineConfig,
  ListPageConfig,
  listColumns,
} from '../../../platform/public-api';
import { purchaseRequisitionFactBoxConfig } from './purchase-requisition.factbox.config';

// Header form.
export const purchaseRequisitionHeaderConfig: HeaderConfig = {
  dialogTitle: 'Purchase Requisition',
  toolbarButtons: [
    {
      label: 'Submit',
      actionKey: 'cmd:submit',
      group: 'Process',
      order: 50,
      apiAction: {
        name: 'submit',
        states: {
          field: 'status',
          values: ['open'],
        },
      },
    },
    {
      label: 'Approve',
      actionKey: 'cmd:approve',
      group: 'Process',
      order: 60,
      apiAction: {
        name: 'approve',
        states: {
          field: 'status',
          values: ['pending_approval'],
        },
      },
    },
    {
      label: 'Reject',
      actionKey: 'cmd:reject',
      group: 'Process',
      order: 70,
      apiAction: {
        name: 'reject',
        states: {
          field: 'status',
          values: ['pending_approval'],
        },
        inputFields: [
          {
            key: 'comment',
            label: 'Reason',
            type: 'textarea',
            required: true,
            validation: {
              maxLength: 250,
            },
          },
        ],
      },
    },
    {
      label: 'Reopen',
      actionKey: 'cmd:reopen',
      group: 'Process',
      order: 80,
      apiAction: {
        name: 'reopen',
        states: {
          field: 'status',
          values: ['rejected'],
        },
      },
    },
    {
      label: 'Cancel',
      actionKey: 'cmd:cancel',
      group: 'Process',
      order: 90,
      apiAction: {
        name: 'cancel',
        states: {
          field: 'status',
          values: ['open', 'rejected'],
        },
      },
    },
  ],
  sections: [
    {
      id: 'general',
      title: 'General',
      fields: [
        // Display the backend enum caption. Raw documentType remains in header data for line binding.
        {
          key: 'documentTypeLabel',
          label: 'Document Type',
          type: 'text',
          readonly: true,
        },
        {
          key: 'number',
          label: 'No.',
          type: 'code',
          readonlyAfterCreate: true,
          validation: {
            maxLength: 20,
          },
        },
        {
          key: 'selectedNoSeriesId',
          label: 'Number Series (optional)',
          type: 'lookup',
          readonlyAfterCreate: true,
          lookup: {
            endpoint: '/numberSeries',
            displayField: 'code',
          },
          labelField: 'code',
          displayFormat: '[code] — [description]',
        },
        {
          key: 'status',
          label: 'Status',
          type: 'text',
          defaultValue: 'open',
          readonly: true,
          factBox: true,
        },
        {
          key: 'requestDate',
          label: 'Request Date',
          type: 'date',
          defaultValue: () => new Date().toLocaleDateString('en-CA'),
          required: true,
        },
        {
          key: 'requiredDate',
          label: 'Required Date',
          type: 'date',
        },
        {
          key: 'purpose',
          label: 'Purpose',
          type: 'textarea',
          validation: {
            maxLength: 250,
          },
          width: 'wide',
        },
      ],
    },
    {
      id: 'request-details',
      title: 'Request Details',
      fields: [
        {
          key: 'locationId',
          label: 'Location',
          type: 'lookup',
          lookup: {
            endpoint: '/locations',
            displayField: 'code',
          },
          labelField: 'code',
        },
      ],
    },
    {
      id: 'processing',
      title: 'Processing',
      fields: [
        {
          key: 'conversionStatus',
          label: 'Conversion Status',
          type: 'dropdown',
          readonly: true,
          options: [
            {
              label: 'Not Converted',
              value: 'not_converted',
            },
            {
              label: 'Partially Converted',
              value: 'partially_converted',
            },
            {
              label: 'Fully Converted',
              value: 'fully_converted',
            },
          ],
        },
        {
          key: 'purchaseOrderCount',
          label: 'Purchase Orders',
          type: 'integer',
          readonly: true,
        },
        {
          key: 'statusChangedAt',
          label: 'Status Changed At',
          type: 'datetime',
          readonly: true,
        },
      ],
    },
  ],
};

// List page.
export const purchaseRequisitionListConfig: ListPageConfig & {
  dataSource: DataSourceConfig;
} = {
  pageId: 'purchase-requisition',
  pageType: 'document',
  title: 'Purchase Requisition',
  dataSource: {
    endpoint: '/purchaseRequisitions',
    keyField: 'systemId',
    headerPKProp: 'number',
    defaultSort: 'number desc',
    pageSize: 25,
    autoGenerateNumber: true,
    omitEmptyFields: ['number'],
    writableStates: {
      field: 'status',
      values: ['open'],
    },
  },
  identity: {
    primaryField: 'number',
  },
  module: 'Purchase',
  menu: {
    module: 'Purchase',
    group: 'Documents',
    icon: 'ts-icon ts-icon-file',
    route: '/purchase-requisition',
  },
  dataSurface: {
    columns: listColumns(purchaseRequisitionHeaderConfig, [
      {
        field: 'number',
        width: '128px',
      },
      {
        field: 'requestDate',
        width: '118px',
      },
      {
        field: 'requiredDate',
        width: '118px',
      },
      {
        field: 'purpose',
        width: '300px',
      },
      {
        field: 'status',
        type: 'badge',
        filter: {
          type: 'select',
          operator: 'eq',
          options: [
            {
              label: 'Open',
              value: 'open',
            },
            {
              label: 'Pending Approval',
              value: 'pending_approval',
            },
            {
              label: 'Approved',
              value: 'approved',
            },
            {
              label: 'Rejected',
              value: 'rejected',
            },
            {
              label: 'Cancelled',
              value: 'cancelled',
            },
          ],
        },
      },
      {
        field: 'lineCount',
        label: 'Lines',
        type: 'number',
        sortable: false,
        filterable: false,
      },
      {
        field: 'estimatedTotal',
        label: 'Estimated Total',
        type: 'currency',
        sortable: false,
        filterable: false,
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
      filter: "status eq 'open'",
    },
    {
      id: 'pending',
      label: 'Pending Approval',
      filter: "status eq 'pending_approval'",
    },
    {
      id: 'approved',
      label: 'Approved',
      filter: "status eq 'approved'",
    },
  ],
  activeViewId: 'all',
  factBox: purchaseRequisitionFactBoxConfig,
};

// Document lines.
export const purchaseRequisitionLineConfig: LineConfig = {
  typeField: 'lineType',
  placement: {
    mode: 'after-section',
    afterSectionId: 'general',
  },
  dataSource: {
    endpoint: '/purchaseRequisitionLines',
    keyField: 'systemId',
    headerPKProp: 'number',
    lineFKProp: 'documentNumber',
    // Line documentType comes from the header.
    parentFieldMap: {
      documentType: 'documentType',
    },
    defaultSort: 'lineNo asc',
    invalidates: ['/purchaseRequisitions'],
  },
  columns: [
    {
      id: 'lineNo',
      label: 'Line No.',
      type: 'integer',
      readonly: true,
    },
    {
      id: 'lineType',
      label: 'Type',
      type: 'dropdown',
      defaultValue: 'item',
      options: [
        {
          label: 'Item',
          value: 'item',
        },
        {
          label: 'G/L Account',
          value: 'gl_account',
        },
      ],
      // On a Type change, reset master, UOM and location selections for the new line context.
      clearFieldsOnChange: ['itemId', 'glAccountId', 'unitOfMeasureId', 'locationId'],
    },
    {
      // Selects the Items binding in the shared No. column; does not require a value.
      id: 'itemId',
      label: 'No.',
      type: 'lookup',
      editableWhen: {
        field: 'lineType',
        values: ['item'],
      },
      lookup: {
        endpoint: '/items',
        filter: 'blocked eq false',
        displayField: 'number',
      },
      fill: {
        description: 'description',
      },
      displayColumn: 'number',
    },
    {
      // Selects the G/L binding in that same column.
      id: 'glAccountId',
      label: 'No.',
      type: 'lookup',
      editableWhen: {
        field: 'lineType',
        values: ['gl_account'],
      },
      lookup: {
        endpoint: '/glAccounts',
        filter: "accountType eq 'posting' and blocked eq false",
        displayField: 'number',
      },
      fill: {
        description: 'name',
      },
      displayColumn: 'number',
    },
    // Editable text (100 characters). The server supplies a description when omitted.
    {
      id: 'description',
      label: 'Description',
      type: 'text',
      validation: {
        maxLength: 100,
      },
      factBox: {
        sectionId: 'selected-line',
        sectionTitle: 'Selected line',
        order: 10,
      },
    },
    {
      id: 'unitOfMeasureId',
      label: 'Unit of Measure',
      type: 'lookup',
      // Available on both Item and G/L draft lines.
      lookup: {
        endpoint: '/unitsOfMeasure',
        displayField: 'code',
      },
    },
    // Conversion from the selected item UOM (e.g. BOX = 10 base units), not requested quantity.
    // The existing API calculates this factor and prohibits direct writes.
    {
      id: 'qtyPerUnitOfMeasure',
      label: 'Qty. per Unit of Measure',
      type: 'decimal',
      readonly: true,
      align: 'end',
    },
    {
      // Untouched locations can default from the header.
      // Select a location master record; free text is not a valid location ID.
      id: 'locationId',
      label: 'Location',
      type: 'lookup',
      lookup: {
        endpoint: '/locations',
        displayField: 'code',
      },
    },
    {
      id: 'quantity',
      label: 'Quantity',
      type: 'decimal',
      defaultValue: '1',
      // Optional PR field rule. Other fields and ordinary draft creation remain independent.
      validation: {
        custom: ({ record }) => {
          if (!record['lineType']) return 'Choose Type before entering Quantity.';
          const master = record['lineType'] === 'item' ? record['itemId'] : record['glAccountId'];
          if (master === undefined || master === null || master === '')
            return 'Choose No. before entering Quantity.';
          return undefined;
        },
      },
      factBox: {
        sectionId: 'selected-line',
        sectionTitle: 'Selected line',
        order: 20,
      },
      align: 'end',
    },
    {
      id: 'estimatedUnitCost',
      label: 'Estimated Unit Cost',
      type: 'decimal',
      defaultValue: '0',
      align: 'end',
    },
    {
      // Preview = quantity × estimated unit cost; the server calculates the saved amount.
      id: 'estimatedAmount',
      label: 'Estimated Amount',
      type: 'decimal',
      readonly: true,
      factBox: {
        sectionId: 'selected-line',
        sectionTitle: 'Selected line',
        order: 30,
      },
      align: 'end',
    },
    {
      id: 'requiredDate',
      label: 'Required Date',
      type: 'date',
    },
    // Purchase-order progress is calculated by the server, never entered manually.
    {
      id: 'convertedQuantity',
      label: 'Converted Quantity',
      type: 'decimal',
      readonly: true,
      align: 'end',
    },
    {
      id: 'remainingQuantity',
      label: 'Remaining Quantity',
      type: 'decimal',
      readonly: true,
      align: 'end',
    },
  ],
  calculation: [
    {
      target: 'estimatedAmount',
      formula: 'quantity * estimatedUnitCost',
      precision: 6,
    },
  ],
  totalsCalculation: {
    // PR has no SST calculation; Core supplies zero SST and two-decimal display.
    totals: {
      subtotal: {
        formula: 'sum(estimatedAmount)',
      },
      total: {
        formula: 'totals.subtotal + totals.sst',
      },
    },
  },
  footerSections: [
    {
      id: 'document-totals',
      rows: [
        {
          id: 'subtotal',
          label: 'Subtotal',
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
  ],
};
