import { Component, Input } from '@angular/core';
import { ListPage, RunModalPageWindow } from '../../../platform/public-api';
import {
  defaultDimensionPrioritiesListConfig,
  defaultDimensionPrioritiesHeaderConfig,
  defaultDimensionPrioritiesLineConfig,
} from './default-dimension-priorities.config';
export * from './default-dimension-priorities.config';

@Component({
  selector: 'app-default-dimension-priorities',
  standalone: true,
  imports: [ListPage],
  templateUrl: './default-dimension-priorities.html',
})
export class DefaultDimensionPrioritiesPage {
  @Input() runModal?: RunModalPageWindow;
  readonly listConfig = defaultDimensionPrioritiesListConfig;
  readonly headerConfig = defaultDimensionPrioritiesHeaderConfig;
  readonly lineConfig = defaultDimensionPrioritiesLineConfig;
}
