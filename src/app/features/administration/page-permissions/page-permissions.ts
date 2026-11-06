import { Component, Input, inject } from '@angular/core';
import { ListPage, RunModalPageWindow } from '../../../platform/public-api';
import { PermissionPageContextService } from '../../../core/services/permission-page-context.service';
import * as config from './page-permissions.config';
export * from './page-permissions.config';

@Component({
  selector: 'app-page-permissions',
  standalone: true,
  imports: [ListPage],
  templateUrl: './page-permissions.html',
})
export class PagePermissionsPage {
  private readonly scope = inject(PermissionPageContextService);
  private window?: RunModalPageWindow;
  @Input() set runModal(value: RunModalPageWindow | undefined) {
    this.window = value;
    const resolved = value?.module ?? this.scope.apply(config, 'page-permissions', {headerData: value?.record});
    this.listConfig = resolved['pagePermissionsListConfig'] as typeof config.pagePermissionsListConfig;
    this.headerConfig = resolved['pagePermissionsHeaderConfig'] as typeof config.pagePermissionsHeaderConfig;
    this.lineConfig = resolved['pagePermissionsLineConfig'] as typeof config.pagePermissionsLineConfig;
  }
  get runModal(): RunModalPageWindow | undefined { return this.window; }
  listConfig = config.pagePermissionsListConfig;
  headerConfig = config.pagePermissionsHeaderConfig;
  lineConfig = config.pagePermissionsLineConfig;
}
