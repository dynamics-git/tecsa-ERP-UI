import {
  DataSourceConfig, HeaderConfig, LineConfig, ListPageConfig,
} from '../../../platform/public-api';

const rangeSource: DataSourceConfig = {
  endpoint: '/numberSeriesLines',
  keyField: 'systemId',
  headerPKProp: 'code',
  lineFKProp: 'seriesCode',
  defaultSort: 'lineNo asc',
  pageSize: 100,
  lineNo: true,
};

export const noSeriesLinesHeaderConfig: HeaderConfig = {
  dialogTitle: 'No. Series Lines',
  toolbarButtons: [],
  sections: [],
};

export const noSeriesLinesListConfig: ListPageConfig & { dataSource: DataSourceConfig } = {
  pageId: 'no-series-lines',
  pageType: 'worksheet',
  title: 'No. Series Lines',
  dataSource: rangeSource,
  identity: { primaryField: 'startingNo', secondaryField: 'endingNo' },
  module: 'Administration',
  tools: { search: false, filter: false, columns: false, export: false },
};

export const noSeriesLinesLineConfig: LineConfig = {
  placement: { mode: 'end' },
  dataSource: rangeSource,
  toolbarButtons: [],
  columns: [
    { id: 'lineNo', label: 'Line No.', type: 'integer', readonly: true },
    { id: 'startingDate', label: 'Starting Date', type: 'date' },
    { id: 'startingNo', label: 'Starting No.', type: 'code', required: true,
      validation: { maxLength: 20 } },
    { id: 'endingNo', label: 'Ending No.', type: 'code',
      validation: { maxLength: 20 } },
    { id: 'warningNo', label: 'Warning No.', type: 'code',
      validation: { maxLength: 20 } },
    { id: 'incrementByNo', label: 'Increment-by No.', type: 'integer', defaultValue: 1,
      validation: { min: 1 } },
    { id: 'lastNoUsed', label: 'Last No. Used', type: 'code', readonly: true },
    { id: 'lastDateUsed', label: 'Last Date Used', type: 'date', readonly: true },
    { id: 'open', label: 'Open', type: 'boolean', defaultValue: true },
  ],
};
