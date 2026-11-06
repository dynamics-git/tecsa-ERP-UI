import { Component, Input } from '@angular/core';
import { ListPage, RunModalPageWindow } from '../../../platform/public-api';
import {
  noSeriesRelationshipsListConfig,
  noSeriesRelationshipsHeaderConfig,
  noSeriesRelationshipsLineConfig,
} from './no-series-relationships.config';
export * from './no-series-relationships.config';

@Component({
  selector: 'app-no-series-relationships',
  standalone: true,
  imports: [ListPage],
  templateUrl: './no-series-relationships.html',
})
export class NoSeriesRelationshipsPage {
  @Input() runModal?: RunModalPageWindow;
  readonly listConfig = noSeriesRelationshipsListConfig;
  readonly headerConfig = noSeriesRelationshipsHeaderConfig;
  readonly lineConfig = noSeriesRelationshipsLineConfig;
}
