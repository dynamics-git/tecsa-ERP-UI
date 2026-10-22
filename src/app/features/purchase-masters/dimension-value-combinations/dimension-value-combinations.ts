import { Component, Input } from '@angular/core';
import { ListPage, RunModalPageWindow } from '../../../platform/public-api';
import {
  dimensionValueCombinationsListConfig,
  dimensionValueCombinationsHeaderConfig,
  dimensionValueCombinationsLineConfig,
} from './dimension-value-combinations.config';
export * from './dimension-value-combinations.config';

@Component({
  selector: 'app-dimension-value-combinations',
  standalone: true,
  imports: [ListPage],
  templateUrl: './dimension-value-combinations.html',
})
export class DimensionValueCombinationsPage {
  @Input() runModal?: RunModalPageWindow;
  readonly listConfig = dimensionValueCombinationsListConfig;
  readonly headerConfig = dimensionValueCombinationsHeaderConfig;
  readonly lineConfig = dimensionValueCombinationsLineConfig;
}
