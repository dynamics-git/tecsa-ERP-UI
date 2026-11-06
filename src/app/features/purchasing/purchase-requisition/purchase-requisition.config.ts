import {
  ObjectPageConfig,
  HeaderConfig,
  LineConfig,
  listColumns,
} from '../../../platform/public-api';
import { purchaseRequisitionFactBoxConfig } from './purchase-requisition.factbox.config';

// Header form.
export const purchaseRequisitionHeaderConfig: HeaderConfig = {
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
          key: 'documentType',
          label: 'Document Type',
          readonly: true,
        },
        {
          key: 'number',
          label: 'No.',
          readonlyAfterCreate: true,
        },
        {
          key: 'noSeriesCode',
          label: 'Number Series (optional)',
          type: 'lookup',
          readonlyAfterCreate: true,
          lookup: {
            endpoint: '/noSeries',
            valueField: 'code',
            displayField: 'code',
          },
          displayFormat: '[code] — [description]',
        },
        {
          key: 'status',
          label: 'Status',
          readonly: true,
          factBox: true,
        },
        {
          key: 'requestDate',
          label: 'Request Date',
          defaultValue: () => new Date().toLocaleDateString('en-CA'),
          required: true,
        },
        {
          key: 'requiredDate',
          label: 'Required Date',
        },
        {
          key: 'purpose',
          label: 'Purpose',
          type: 'textarea',
          width: 'wide',
        },
      ],
    },
    {
      id: 'request-details',
      title: 'Request Details',
      fields: [
        {
          key: 'locationCode',
          label: 'Location',
          type: 'lookup',
          lookup: {
            endpoint: '/locations',
            valueField: 'code',
            displayField: 'code',
          },
        },
      ],
    },
  ],
};

// List page.
export const purchaseRequisitionListConfig: ObjectPageConfig = {
  pageId: 'purchase-requisition',
  objectId: 10000,
  pageType: 'document',
  title: 'Purchase Requisition',
  dataSource: {
    defaultSort: 'number desc',
    pageSize: 25,
    autoGenerateNumber: true,
    omitEmptyFields: ['number'],
    headerPKProp: 'number',
    writableStates: { field: 'status', values: ['open'] },
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
    headerPKProp: 'number',
    lineFKProp: 'documentNumber',
    parentFieldMap: { documentType: 'documentType' },
    defaultSort: 'lineNo asc',
    invalidates: ['/purchaseRequisitions'],
  },
  columns: [
    {
      id: 'lineNo',
      label: 'Line No.',
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
      clearFieldsOnChange: ['number', 'unitOfMeasureCode', 'locationCode'],
    },
    {
      // Selects the Items binding in the shared No. column; does not require a value.
      id: 'itemNumber',
      field: 'number',
      label: 'No.',
      type: 'lookup',
      editableWhen: {
        field: 'lineType',
        values: ['item'],
      },
      lookup: {
        endpoint: '/items',
        valueField: 'number',
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
      id: 'glAccountNumber',
      field: 'number',
      label: 'No.',
      type: 'lookup',
      editableWhen: {
        field: 'lineType',
        values: ['gl_account'],
      },
      lookup: {
        endpoint: '/glAccounts',
        valueField: 'number',
        filter: 'accountType eq 0 and blocked eq false',
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
      factBox: {
        sectionId: 'selected-line',
        sectionTitle: 'Selected line',
        order: 10,
      },
    },
    {
      id: 'unitOfMeasureCode',
      label: 'Unit of Measure',
      type: 'lookup',
      // Available on both Item and G/L draft lines.
      lookup: {
        endpoint: '/unitsOfMeasure',
        valueField: 'code',
        displayField: 'code',
      },
    },
    // Conversion from the selected item UOM (e.g. BOX = 10 base units), not requested quantity.
    // The existing API calculates this factor and prohibits direct writes.
    {
      id: 'qtyPerUnitOfMeasure',
      label: 'Qty. per Unit of Measure',
      readonly: true,
      align: 'end',
    },
    {
      // Untouched locations can default from the header.
      // Select a location master record; free text is not a valid location ID.
      id: 'locationCode',
      label: 'Location',
      type: 'lookup',
      lookup: {
        endpoint: '/locations',
        valueField: 'code',
        displayField: 'code',
      },
    },
    {
      id: 'quantity',
      label: 'Quantity',
      defaultValue: '1',
      // Optional PR field rule. Other fields and ordinary draft creation remain independent.
      validation: {
        custom: ({ record }) => {
          if (!record['lineType']) return 'Choose Type before entering Quantity.';
          const master = record['number'];
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
      defaultValue: '0',
      align: 'end',
    },
    {
      // Preview = quantity × estimated unit cost; the server calculates the saved amount.
      id: 'estimatedAmount',
      label: 'Estimated Amount',
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
    },
    // Purchase-order progress is calculated by the server, never entered manually.
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
