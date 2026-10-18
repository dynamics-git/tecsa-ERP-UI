import { Component } from '@angular/core';
import { DocumentPage } from '../../../platform/public-api';
import {
  numberSeriesHeaderConfig, numberSeriesLineConfig, numberSeriesListConfig,
} from './number-series.config';

@Component({
  selector: 'app-number-series',
  standalone: true,
  imports: [DocumentPage],
  template: `<app-document-page
    [pageId]="pageId"
    [listConfig]="listConfig"
    [headerConfig]="headerConfig"
    [lineConfig]="lineConfig"></app-document-page>`,
})
export class NumberSeriesPage {
  readonly pageId = 'number-series';
  readonly listConfig = numberSeriesListConfig;
  readonly headerConfig = numberSeriesHeaderConfig;
  readonly lineConfig = numberSeriesLineConfig;
}
