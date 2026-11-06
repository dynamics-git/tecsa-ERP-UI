import {
  DataSourceConfig,
  HeaderConfig,
  LineConfig,
  ListPageConfig,
} from '../../../platform/public-api';
import { noSeriesFactBoxConfig } from './no-series.factbox.config';

// BC-style worksheet: the series themselves are editable grid rows.
// Range Lines and Relationships open as separate related worksheets.
const noSeriesSource: DataSourceConfig = {
  endpoint: '/numberSeries',
  keyField: 'systemId',
  defaultSort: 'code asc',
  pageSize: 50,
};

export const noSeriesHeaderConfig: HeaderConfig = {
  dialogTitle: 'No. Series',
  toolbarButtons: [],
  sections: [],
};

export const noSeriesListConfig: ListPageConfig & { dataSource: DataSourceConfig } = {
  pageId: 'no-series',
  pageType: 'worksheet',
  title: 'No. Series',
  dataSource: noSeriesSource,
  identity: { primaryField: 'code', secondaryField: 'description' },
  module: 'Administration',
  menu: {
    module: 'Administration',
    group: 'Setup',
    icon: 'ts-icon ts-icon-number-series',
    moduleIcon: 'ts-icon ts-icon-administration-module',
    route: '/no-series',
  },
  factBox: noSeriesFactBoxConfig,
};

export const noSeriesLineConfig: LineConfig = {
  placement: { mode: 'end' },
  dataSource: noSeriesSource,
  toolbarButtons: [
    {
      label: 'Lines',
      actionKey: 'cmd:open-number-series-lines',
      group: 'Related',
      order: 40,
      runModalPageId: 'no-series-lines',
      runModalTarget: 'entry',
      runModalRecord: { source: 'activeLine', fields: { code: 'code', systemId: 'systemId' } },
    },
    {
      label: 'Relationships',
      actionKey: 'cmd:open-number-series-relationships',
      group: 'Related',
      order: 50,
      runModalPageId: 'no-series-relationships',
      runModalTarget: 'entry',
      runModalRecord: { source: 'activeLine', fields: { code: 'code', systemId: 'systemId' } },
    },
  ],
  columns: [
    { id: 'code', label: 'Code', type: 'code', required: true, readonlyAfterCreate: true,
      validation: { maxLength: 20 } },
    { id: 'description', label: 'Description', type: 'text', width: '300px',
      validation: { maxLength: 100 } },
    { id: 'defaultNos', label: 'Default Nos.', type: 'boolean', defaultValue: false },
    { id: 'manualNos', label: 'Manual Nos.', type: 'boolean', defaultValue: false },
    { id: 'dateOrder', label: 'Date Order', type: 'boolean', defaultValue: false },
  ],
};
