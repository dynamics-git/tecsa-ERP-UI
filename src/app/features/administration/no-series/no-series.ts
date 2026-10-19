import { Component } from '@angular/core';
import { DocumentPage } from '../../../platform/public-api';
import { noSeriesListConfig, noSeriesHeaderConfig, noSeriesLineConfig } from './no-series.config';

@Component({ selector: 'app-no-series', standalone: true, imports: [DocumentPage], templateUrl: './no-series.html' })
export class NoSeriesPage {
  readonly listConfig = noSeriesListConfig;
  readonly headerConfig = noSeriesHeaderConfig;
  readonly lineConfig = noSeriesLineConfig;
}
