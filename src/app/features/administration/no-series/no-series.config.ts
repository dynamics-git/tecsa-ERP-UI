import {
  DataSourceConfig,
  HeaderConfig,
  LineConfig,
  ListPageConfig,
  listColumns,
} from '../../../platform/public-api';
import { noSeriesFactBoxConfig } from './no-series.factbox.config';

// Header form.
export const noSeriesHeaderConfig: HeaderConfig = {
  dialogTitle: 'No. Series',
  toolbarButtons: [],
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
          validation: {
            maxLength: 20,
          },
        },
        {
          key: 'description',
          label: 'Description',
          type: 'text',
          required: true,
          validation: {
            maxLength: 100,
          },
          width: 'wide',
        },
        {
          key: 'defaultNos',
          label: 'Default Nos.',
          type: 'boolean',
          defaultValue: true,
        },
        {
          key: 'manualNos',
          label: 'Manual Nos.',
          type: 'boolean',
          defaultValue: false,
        },
        {
          key: 'dateOrder',
          label: 'Date Order',
          type: 'boolean',
          defaultValue: false,
        },
        {
          key: 'isActive',
          label: 'Active',
          type: 'boolean',
          defaultValue: true,
        },
      ],
    },
  ],
};

// List page.
export const noSeriesListConfig: ListPageConfig & {
  dataSource: DataSourceConfig;
} = {
  pageId: 'no-series',
  pageType: 'document',
  title: 'No. Series',
  dataSource: {
    endpoint: '/numberSeries',
    keyField: 'systemId',
    headerPKProp: 'code',
    defaultSort: 'code asc',
    pageSize: 25,
  },
  identity: {
    primaryField: 'code',
    secondaryField: 'description',
  },
  module: 'Administration',
  menu: {
    module: 'Administration',
    group: 'Setup',
    icon: 'ts-icon ts-icon-number-series',
    moduleIcon: 'ts-icon ts-icon-administration-module',
    route: '/no-series',
  },
  dataSurface: {
    columns: listColumns(noSeriesHeaderConfig, [
      {
        field: 'code',
        isPrimary: true,
        type: 'text',
      },
      {
        field: 'description',
        width: '300px',
      },
      {
        field: 'defaultNos',
      },
      {
        field: 'manualNos',
      },
      {
        field: 'dateOrder',
      },
      {
        field: 'isActive',
      },
    ]),
  },
  factBox: noSeriesFactBoxConfig,
};

// Document lines.
export const noSeriesLineConfig: LineConfig = {
  placement: {
    mode: 'end',
  },
  dataSource: {
    endpoint: '/numberSeries',
    keyField: 'systemId',
    // The saved header's systemId scopes every line request.
    navigation: {
      parentEndpoint: '/numberSeries',
      parentIdFields: ['systemId'],
      childCollection: 'lines',
    },
    defaultSort: 'lineNo asc',
    pageSize: 100,
    lineNo: true,
  },
  toolbarButtons: [],
  columns: [
    {
      id: 'lineNo',
      label: 'Line No.',
      type: 'integer',
      readonly: true,
    },
    {
      id: 'startingDate',
      label: 'Starting Date',
      type: 'date',
      required: true,
    },
    {
      id: 'startingNo',
      label: 'Starting No.',
      type: 'code',
      required: true,
      validation: {
        maxLength: 20,
      },
    },
    {
      id: 'endingNo',
      label: 'Ending No.',
      type: 'code',
      validation: {
        maxLength: 20,
      },
    },
    {
      id: 'warningNo',
      label: 'Warning No.',
      type: 'code',
      validation: {
        maxLength: 20,
      },
    },
    {
      id: 'incrementBy',
      label: 'Increment By',
      type: 'integer',
      defaultValue: 1,
      required: true,
      validation: {
        min: 1,
        max: 2147483647,
      },
    },
    {
      id: 'lastNoUsed',
      label: 'Last No. Used',
      type: 'code',
      readonly: true,
    },
    {
      id: 'lastDateUsed',
      label: 'Last Date Used',
      type: 'date',
      readonly: true,
    },
    {
      id: 'isOpen',
      label: 'Open',
      type: 'boolean',
      readonly: true,
    },
  ],
};
