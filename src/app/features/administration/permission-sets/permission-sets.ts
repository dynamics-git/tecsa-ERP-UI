import { Component, Input } from '@angular/core';
import { ListPage, RunModalPageWindow } from '../../../platform/public-api';
import {
  permissionSetsListConfig,
  permissionSetsHeaderConfig,
  permissionSetsLineConfig,
} from './permission-sets.config';
export * from './permission-sets.config';

@Component({
  selector: 'app-permission-sets',
  standalone: true,
  imports: [ListPage],
  templateUrl: './permission-sets.html',
})
export class PermissionSetsPage {
  @Input() runModal?: RunModalPageWindow;
  readonly listConfig = permissionSetsListConfig;
  readonly headerConfig = permissionSetsHeaderConfig;
  readonly lineConfig = permissionSetsLineConfig;
}
