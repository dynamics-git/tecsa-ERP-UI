import { Component, Input, ViewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ListPage, RunModalPageWindow, type DocumentPageCommandEvent } from '../../../platform/public-api';
import { PermissionAdminApi, UserRecord } from './permission-admin-api.service';
import { PermissionUserAccess } from './permission-user-access';
import { permissionUsersHeaderConfig, permissionUsersListConfig } from './permission-users.config';
export * from './permission-users.config';

@Component({
  selector: 'app-permission-users',
  standalone: true,
  imports: [ListPage, PermissionUserAccess, FormsModule],
  templateUrl: './permission-users.html',
  styleUrl: './permission-editor.scss',
})
export class PermissionUsersPage {
  private readonly api = inject(PermissionAdminApi);
  @Input() runModal?: RunModalPageWindow;
  @ViewChild(ListPage) grid?: ListPage;
  readonly listConfig = permissionUsersListConfig;
  readonly headerConfig = permissionUsersHeaderConfig;
  selectedUser?: UserRecord;
  creating = false;
  saving = false;
  error = '';
  newUser = {userName: '', name: '', email: '', password: ''};

  handleCommand(event: DocumentPageCommandEvent): void {
    if (event.actionKey === 'create-user') {
      this.creating = true; this.error = ''; return;
    }
    if (event.actionKey !== 'manage-access') return;
    const value = event.context.headerData ?? event.context.selectedRow;
    const user = value && typeof value === 'object' ? value as UserRecord : undefined;
    if (user?.systemId) this.selectedUser = user;
  }

  async createUser(): Promise<void> {
    if (this.saving || !this.newUser.userName.trim() || !this.newUser.name.trim()
      || !this.newUser.email.trim() || this.newUser.password.length < 12) {
      this.error = 'Provide a User ID, name, email and password of at least 12 characters.'; return;
    }
    this.saving = true; this.error = '';
    try {
      const created = await this.api.createUser(this.newUser);
      this.creating = false;
      this.newUser = {userName:'',name:'',email:'',password:''};
      this.grid?.handleCommand({actionKey:'refresh'});
      this.selectedUser = created; // Assign Company and Roles immediately after creation.
    } catch (e) {
      const value = e as {error?:{message?:string};message?:string};
      this.error = value?.error?.message ?? value?.message ?? 'Could not create user.';
    } finally {this.saving = false;}
  }
}
