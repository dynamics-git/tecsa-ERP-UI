import { Component, Input } from '@angular/core';
import { ListPage, RunModalPageWindow } from '../../../platform/public-api';
import { dimensionsListConfig, dimensionsHeaderConfig } from './dimensions.config';
export * from './dimensions.config';

@Component({
  selector: 'app-dimensions',
  standalone: true,
  imports: [ListPage],
  templateUrl: './dimensions.html',
})
export class DimensionsPage {
  @Input() runModal?: RunModalPageWindow;
  readonly listConfig = dimensionsListConfig;
  readonly headerConfig = dimensionsHeaderConfig;
}
