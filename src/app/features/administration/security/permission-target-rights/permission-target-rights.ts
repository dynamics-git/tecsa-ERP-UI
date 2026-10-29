import { Component, Input } from '@angular/core';
import { ListPage, RunModalPageWindow } from '../../../platform/public-api';
import { permissionTargetRightsListConfig, permissionTargetRightsHeaderConfig, permissionTargetRightsLineConfig } from './permission-target-rights.config';
export * from './permission-target-rights.config';

@Component({
  selector: 'app-permission-target-rights',
  standalone: true,
  imports: [ListPage],
  templateUrl: './permission-target-rights.html',
})
export class PermissionTargetRightsPage {
  @Input() runModal?: RunModalPageWindow;
  readonly listConfig = permissionTargetRightsListConfig;
  readonly headerConfig = permissionTargetRightsHeaderConfig;
  readonly lineConfig = permissionTargetRightsLineConfig;
}
