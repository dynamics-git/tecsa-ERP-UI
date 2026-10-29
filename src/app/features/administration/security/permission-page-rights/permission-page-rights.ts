import { Component, Input } from '@angular/core';
import { ListPage, RunModalPageWindow } from '../../../platform/public-api';
import { permissionPageRightsListConfig, permissionPageRightsHeaderConfig, permissionPageRightsLineConfig } from './permission-page-rights.config';
export * from './permission-page-rights.config';

@Component({
  selector: 'app-permission-page-rights',
  standalone: true,
  imports: [ListPage],
  templateUrl: './permission-page-rights.html',
})
export class PermissionPageRightsPage {
  @Input() runModal?: RunModalPageWindow;
  readonly listConfig = permissionPageRightsListConfig;
  readonly headerConfig = permissionPageRightsHeaderConfig;
  readonly lineConfig = permissionPageRightsLineConfig;
}
