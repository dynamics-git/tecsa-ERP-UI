import { Component, Input } from '@angular/core';
import { ListPage, RunModalPageWindow } from '../../../platform/public-api';
import {
  pageConfigurationHeaderConfig,
  pageConfigurationLineConfig,
  pageConfigurationListConfig,
} from './page-configuration.config';
export * from './page-configuration.config';

@Component({
  selector: 'app-page-configuration',
  standalone: true,
  imports: [ListPage],
  templateUrl: './page-configuration.html',
})
export class PageConfigurationPage {
  @Input() runModal?: RunModalPageWindow;
  readonly listConfig = pageConfigurationListConfig;
  readonly headerConfig = pageConfigurationHeaderConfig;
  readonly lineConfig = pageConfigurationLineConfig;
}
