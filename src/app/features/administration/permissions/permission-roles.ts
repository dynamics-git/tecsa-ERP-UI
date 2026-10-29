import { Component, Input } from '@angular/core';
import { ListPage, RunModalPageWindow } from '../../../platform/public-api';
import type { DocumentPageCommandEvent } from '../../../platform/pages/list-page/list-page';
import { PermissionRole } from './permission-admin-api.service';
import { PermissionRoleEditor } from './permission-role-editor';
import { permissionRolesHeaderConfig, permissionRolesListConfig } from './permission-roles.config';
export * from './permission-roles.config';

@Component({
  selector: 'app-permission-roles',
  standalone: true,
  imports: [ListPage, PermissionRoleEditor],
  templateUrl: './permission-roles.html',
})
export class PermissionRolesPage {
  @Input() runModal?: RunModalPageWindow;
  readonly listConfig = permissionRolesListConfig;
  readonly headerConfig = permissionRolesHeaderConfig;
  selectedRole?: PermissionRole;

  handleCommand(event: DocumentPageCommandEvent): void {
    if (event.actionKey !== 'manage-permissions') return;
    const record = event.context.headerData ?? event.context.selectedRow;
    if (!record || typeof record !== 'object') return;
    const role = record as PermissionRole;
    if (!role.systemId) return;
    this.selectedRole = role;
  }
}
