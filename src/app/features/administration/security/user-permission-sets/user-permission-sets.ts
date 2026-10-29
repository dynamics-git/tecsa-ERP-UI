import { Component, Input } from '@angular/core';
import { ListPage, RunModalPageWindow } from '../../../platform/public-api';
import { userPermissionSetsListConfig, userPermissionSetsHeaderConfig, userPermissionSetsLineConfig } from './user-permission-sets.config';
export * from './user-permission-sets.config';

@Component({
  selector: 'app-user-permission-sets',
  standalone: true,
  imports: [ListPage],
  templateUrl: './user-permission-sets.html',
})
export class UserPermissionSetsPage {
  @Input() runModal?: RunModalPageWindow;
  readonly listConfig = userPermissionSetsListConfig;
  readonly headerConfig = userPermissionSetsHeaderConfig;
  readonly lineConfig = userPermissionSetsLineConfig;
}
