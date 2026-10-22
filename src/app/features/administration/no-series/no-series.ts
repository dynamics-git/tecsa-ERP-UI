import { Component, Input } from '@angular/core';
import { ListPage, RunModalPageWindow } from '../../../platform/public-api';
import { noSeriesListConfig, noSeriesHeaderConfig, noSeriesLineConfig } from './no-series.config';
export * from './no-series.config';

@Component({
  selector: 'app-no-series',
  standalone: true,
  imports: [ListPage],
  templateUrl: './no-series.html',
})
export class NoSeriesPage {
  @Input() runModal?: RunModalPageWindow;
  readonly listConfig = noSeriesListConfig;
  readonly headerConfig = noSeriesHeaderConfig;
  readonly lineConfig = noSeriesLineConfig;
}
