import { Component, Input } from '@angular/core';
import { ListPage, RunModalPageWindow } from '../../../platform/public-api';
import {
  glAccountDefaultDimensionsListConfig,
  glAccountDefaultDimensionsHeaderConfig,
  glAccountDefaultDimensionsLineConfig,
} from './gl-account-default-dimensions.config';
export * from './gl-account-default-dimensions.config';

@Component({
  selector: 'app-gl-account-default-dimensions',
  standalone: true,
  imports: [ListPage],
  templateUrl: './gl-account-default-dimensions.html',
})
export class GlAccountDefaultDimensionsPage {
  @Input() runModal?: RunModalPageWindow;
  readonly listConfig = glAccountDefaultDimensionsListConfig;
  readonly headerConfig = glAccountDefaultDimensionsHeaderConfig;
  readonly lineConfig = glAccountDefaultDimensionsLineConfig;
}
