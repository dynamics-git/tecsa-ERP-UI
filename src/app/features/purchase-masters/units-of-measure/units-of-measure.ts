import { Component, Input } from '@angular/core';
import { ListPage, RunModalPageWindow } from '../../../platform/public-api';
import { unitsOfMeasureListConfig, unitsOfMeasureHeaderConfig } from './units-of-measure.config';
export * from './units-of-measure.config';

@Component({
  selector: 'app-units-of-measure',
  standalone: true,
  imports: [ListPage],
  templateUrl: './units-of-measure.html',
})
export class UnitsOfMeasurePage {
  @Input() runModal?: RunModalPageWindow;
  readonly listConfig = unitsOfMeasureListConfig;
  readonly headerConfig = unitsOfMeasureHeaderConfig;
}
