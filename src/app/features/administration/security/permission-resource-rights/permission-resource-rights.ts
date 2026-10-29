import { Component, Input } from '@angular/core';
import { ListPage, RunModalPageWindow } from '../../../platform/public-api';
import { permissionResourceRightsListConfig, permissionResourceRightsHeaderConfig, permissionResourceRightsLineConfig } from './permission-resource-rights.config';
export * from './permission-resource-rights.config';

@Component({
  selector: 'app-permission-resource-rights',
  standalone: true,
  imports: [ListPage],
  templateUrl: './permission-resource-rights.html',
})
export class PermissionResourceRightsPage {
  @Input() runModal?: RunModalPageWindow;
  readonly listConfig = permissionResourceRightsListConfig;
  readonly headerConfig = permissionResourceRightsHeaderConfig;
  readonly lineConfig = permissionResourceRightsLineConfig;
}
