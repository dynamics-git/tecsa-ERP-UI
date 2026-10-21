import { Component } from '@angular/core';
import { DocumentPage, ListPageConfig, DataSourceConfig } from '../../../platform/public-api';
import { noSeriesHeaderConfig, noSeriesLineConfig } from './no-series.config';
export { noSeriesHeaderConfig, noSeriesLineConfig } from './no-series.config';

export const noSeriesPageConfig: ListPageConfig & { dataSource: DataSourceConfig } = {
  pageId: 'no-series',
  pageType: 'document',
  autoSave: true,
  title: 'No. Series',
  module: 'Administration',
  menu: { module: 'Administration', group: 'Setup', icon: 'ts-icon ts-icon-list', route: '/no-series' },
  dataSource: {
    endpoint: '/numberSeries',
    keyField: 'systemId',
    documentNoField: 'code',
    defaultSort: 'code asc',
    pageSize: 25,
    supportsDelete: false,
  },
  dataSurface: {
    idField: 'systemId',
    columns: [
      { field: 'code', label: 'Code', isPrimary: true, type: 'text' },
      { field: 'description', label: 'Description', type: 'text', width: '300px' },
      { field: 'defaultNos', label: 'Default Nos.', type: 'boolean' },
      { field: 'manualNos', label: 'Manual Nos.', type: 'boolean' },
      { field: 'dateOrder', label: 'Date Order', type: 'boolean' },
      { field: 'isActive', label: 'Active', type: 'boolean' },
    ],
  },
};

@Component({
  selector: 'app-no-series',
  standalone: true,
  imports: [DocumentPage],
  templateUrl: './no-series.html',
})
export class NoSeriesPage {
  readonly pageConfig = noSeriesPageConfig;
  readonly headerConfig = noSeriesHeaderConfig;
  readonly lineConfig = noSeriesLineConfig;
}
