import { Component, Input } from '@angular/core';
import { ListPage, RunModalPageWindow } from '../../../platform/public-api';
import {
  noSeriesLinesListConfig, noSeriesLinesHeaderConfig, noSeriesLinesLineConfig,
} from './no-series-lines.config';
export * from './no-series-lines.config';

@Component({
  selector: 'app-no-series-lines',
  standalone: true,
  imports: [ListPage],
  templateUrl: './no-series-lines.html',
})
export class NoSeriesLinesPage {
  @Input() runModal?: RunModalPageWindow;
  readonly listConfig = noSeriesLinesListConfig;
  readonly headerConfig = noSeriesLinesHeaderConfig;
  readonly lineConfig = noSeriesLinesLineConfig;
}
