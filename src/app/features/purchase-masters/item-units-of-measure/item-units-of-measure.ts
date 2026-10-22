import { Component, Input } from '@angular/core';
import { ListPage, RunModalPageWindow } from '../../../platform/public-api';
import {
  itemUnitsOfMeasureListConfig,
  itemUnitsOfMeasureHeaderConfig,
  itemUnitsOfMeasureLineConfig,
} from './item-units-of-measure.config';
export * from './item-units-of-measure.config';

@Component({
  selector: 'app-item-units-of-measure',
  standalone: true,
  imports: [ListPage],
  templateUrl: './item-units-of-measure.html',
})
export class ItemUnitsOfMeasurePage {
  @Input() runModal?: RunModalPageWindow;
  readonly listConfig = itemUnitsOfMeasureListConfig;
  readonly headerConfig = itemUnitsOfMeasureHeaderConfig;
  readonly lineConfig = itemUnitsOfMeasureLineConfig;
}
