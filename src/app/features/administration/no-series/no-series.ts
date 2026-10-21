import { Component } from '@angular/core';
import { DocumentPage } from '../../../platform/public-api';
import { noSeriesPageConfig, noSeriesHeaderConfig, noSeriesLineConfig } from './no-series.config';
export { noSeriesPageConfig, noSeriesHeaderConfig, noSeriesLineConfig } from './no-series.config';

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
