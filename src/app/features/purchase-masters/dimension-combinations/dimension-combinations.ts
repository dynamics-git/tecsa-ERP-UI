import { Component, Input } from '@angular/core';
import { ListPage, RunModalPageWindow } from '../../../platform/public-api';
import {
  dimensionCombinationsListConfig,
  dimensionCombinationsHeaderConfig,
} from './dimension-combinations.config';
export * from './dimension-combinations.config';

@Component({
  selector: 'app-dimension-combinations',
  standalone: true,
  imports: [ListPage],
  templateUrl: './dimension-combinations.html',
})
export class DimensionCombinationsPage {
  @Input() runModal?: RunModalPageWindow;
  readonly listConfig = dimensionCombinationsListConfig;
  readonly headerConfig = dimensionCombinationsHeaderConfig;
}
