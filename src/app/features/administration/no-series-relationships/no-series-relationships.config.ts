import {
  DataSourceConfig, HeaderConfig, LineConfig, ListPageConfig,
} from '../../../platform/public-api';

const relationshipSource: DataSourceConfig = {
  endpoint: '/numberSeriesRelationships',
  keyField: 'systemId',
  headerPKProp: 'code',
  lineFKProp: 'code',
  defaultSort: 'seriesCode asc',
  pageSize: 50,
};

export const noSeriesRelationshipsHeaderConfig: HeaderConfig = {
  dialogTitle: 'No. Series Relationships',
  toolbarButtons: [],
  sections: [],
};

export const noSeriesRelationshipsListConfig: ListPageConfig & { dataSource: DataSourceConfig } = {
  pageId: 'no-series-relationships',
  pageType: 'worksheet',
  title: 'No. Series Relationships',
  dataSource: relationshipSource,
  identity: { primaryField: 'seriesCode' },
  module: 'Administration',
  tools: { search: false, filter: false, columns: false, export: false },
};

export const noSeriesRelationshipsLineConfig: LineConfig = {
  placement: { mode: 'end' },
  dataSource: relationshipSource,
  toolbarButtons: [],
  columns: [
    {
      id: 'seriesCode',
      label: 'Related Series',
      type: 'lookup',
      valueType: 'code',
      required: true,
      readonlyAfterCreate: true,
      lookup: {
        endpoint: '/numberSeries',
        valueField: 'code',
        displayField: 'code',
        recordRead: 'collection',
        searchFields: ['code', 'description'],
      },
      displayFormat: '[code] — [description]',
    },
  ],
};
