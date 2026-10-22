import { Component, Input } from '@angular/core';
import { ListPage, RunModalPageWindow } from '../../../platform/public-api';
import {
  dimensionValuesListConfig,
  dimensionValuesHeaderConfig,
  dimensionValuesLineConfig,
} from './dimension-values.config';
export * from './dimension-values.config';

@Component({
  selector: 'app-dimension-values',
  standalone: true,
  imports: [ListPage],
  templateUrl: './dimension-values.html',
})
export class DimensionValuesPage {
  @Input() runModal?: RunModalPageWindow;
  readonly listConfig = dimensionValuesListConfig;
  readonly headerConfig = dimensionValuesHeaderConfig;
  readonly lineConfig = dimensionValuesLineConfig;
}
