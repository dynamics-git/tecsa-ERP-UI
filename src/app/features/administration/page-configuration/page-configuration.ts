import { Component, Input, inject } from '@angular/core';
import { ListPage, RunModalPageWindow } from '../../../platform/public-api';
import { PermissionPageContextService } from '../../../core/services/permission-page-context.service';
import * as config from './page-configuration.config';
export * from './page-configuration.config';

@Component({
  selector: 'app-page-configuration',
  standalone: true,
  imports: [ListPage],
  templateUrl: './page-configuration.html',
})
export class PageConfigurationPage {
  private readonly scope = inject(PermissionPageContextService);
  private window?: RunModalPageWindow;
  @Input() set runModal(value: RunModalPageWindow | undefined) {
    this.window = value;
    const resolved = value?.module ?? this.scope.apply(config, 'page-configuration', {headerData: value?.record});
    this.listConfig = resolved['pageConfigurationListConfig'] as typeof config.pageConfigurationListConfig;
    this.headerConfig = resolved['pageConfigurationHeaderConfig'] as typeof config.pageConfigurationHeaderConfig;
    this.lineConfig = resolved['pageConfigurationLineConfig'] as typeof config.pageConfigurationLineConfig;
  }
  get runModal(): RunModalPageWindow | undefined { return this.window; }
  listConfig = config.pageConfigurationListConfig;
  headerConfig = config.pageConfigurationHeaderConfig;
  lineConfig = config.pageConfigurationLineConfig;
}
