import { Component, Input } from '@angular/core';
import { ListPage, RunModalPageWindow } from '../../../platform/public-api';
import {
  itemDefaultDimensionsListConfig,
  itemDefaultDimensionsHeaderConfig,
  itemDefaultDimensionsLineConfig,
} from './item-default-dimensions.config';
export * from './item-default-dimensions.config';

@Component({
  selector: 'app-item-default-dimensions',
  standalone: true,
  imports: [ListPage],
  templateUrl: './item-default-dimensions.html',
})
export class ItemDefaultDimensionsPage {
  @Input() runModal?: RunModalPageWindow;
  readonly listConfig = itemDefaultDimensionsListConfig;
  readonly headerConfig = itemDefaultDimensionsHeaderConfig;
  readonly lineConfig = itemDefaultDimensionsLineConfig;
}
