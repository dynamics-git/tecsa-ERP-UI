import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PermissionAdminApi, PermissionRole, UserCompany, UserRecord, UserRole, UserSession } from './permission-admin-api.service';

@Component({
  selector: 'app-permission-user-access',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './permission-user-access.html',
  styleUrl: './permission-editor.scss',
})
export class PermissionUserAccess implements OnChanges {
  private readonly api = inject(PermissionAdminApi);
  @Input({required:true}) user!: UserRecord;
  @Output() closed = new EventEmitter<void>();

  tab: 'access' | 'sessions' = 'access';
  companies: Array<{systemId:string;code:string;name:string}> = [];
  memberships: UserCompany[] = [];
  roles: PermissionRole[] = [];
  assignments: UserRole[] = [];
  sessions: UserSession[] = [];
  companyId = '';
  defaultCompany = false;
  roleId = '';
  roleCompanyId = '';
  confirmation = '';
  loading = false;
  working = false;
  error = '';
  message = '';
  private requestId = 0;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['user']) void this.reload();
  }
  get activeMemberships(): UserCompany[] { return this.memberships.filter(item => item.isActive); }
  get assignableRoles(): PermissionRole[] { return this.roles.filter(role => role.assignable && role.isActive); }
  get assignmentCompanies(): UserCompany[] { return this.activeMemberships; }
  companyLabel(id: string): string {
    const row = this.memberships.find(item => item.companyId === id);
    return row?.company?.code ?? this.companies.find(item => item.systemId === id)?.code ?? id;
  }

  async reload(): Promise<void> {
    const revision = ++this.requestId;
    this.loading = true; this.error = '';
    try {
      const [companies, memberships, roles, assignments, sessions] = await Promise.all([
        this.api.companies(), this.api.memberships(this.user.systemId), this.api.roles(),
        this.api.assignments(this.user.systemId), this.api.sessions(this.user.systemId),
      ]);
      if (revision !== this.requestId) return;
      this.companies = companies; this.memberships = memberships;
      this.roles = roles; this.assignments = assignments; this.sessions = sessions;
      this.companyId ||= companies.find(company => !memberships.some(m => m.companyId === company.systemId && m.isActive))?.systemId ?? '';
      this.roleId ||= this.assignableRoles[0]?.systemId ?? '';
    } catch (error) {
      if (revision === this.requestId) this.error = this.errorText(error);
    } finally { if (revision === this.requestId) this.loading = false; }
  }
  async addCompany(): Promise<void> {
    if (!this.companyId) return;
    await this.perform(async () => {
      await this.api.addCompany(this.user.systemId, this.companyId, this.defaultCompany);
      this.message = 'Company membership saved.';
    });
  }
  async addRole(): Promise<void> {
    if (!this.roleId) return;
    if (this.roleCompanyId && !this.activeMemberships.some(m => m.companyId === this.roleCompanyId)) {
      this.error = 'Add the Company membership before assigning a Company-specific role.'; return;
    }
    await this.perform(async () => {
      await this.api.assignRole(this.user.systemId, this.roleId, this.roleCompanyId || null);
      this.message = 'Role assigned.';
    });
  }
  async removeRole(row: UserRole): Promise<void> {
    if (this.confirmation !== row.systemId) {this.confirmation = row.systemId; return;}
    await this.perform(async () => {
      await this.api.unassignRole(this.user.systemId, row.systemId);
      this.message = 'Role assignment removed.';
    });
  }
  async removeCompany(row: UserCompany): Promise<void> {
    if (this.confirmation !== row.systemId) {this.confirmation = row.systemId; return;}
    await this.perform(async () => {
      await this.api.removeCompany(this.user.systemId, row.systemId);
      this.message = 'Company access deactivated.';
    });
  }
  async revokeSession(row: UserSession): Promise<void> {
    if (this.confirmation !== row.systemId) {this.confirmation = row.systemId; return;}
    await this.perform(async () => {
      await this.api.revokeSession(this.user.systemId, row.systemId);
      this.message = 'Session revoked.';
    });
  }
  private async perform(action: () => Promise<void>): Promise<void> {
    if (this.working) return;
    this.working = true; this.error = ''; this.message = '';
    try { await action(); this.confirmation = ''; const result = this.message; await this.reload(); this.message = result; }
    catch (error) { this.error = this.errorText(error); }
    finally { this.working = false; }
  }
  private errorText(error: unknown): string {
    if (error && typeof error === 'object') {
      const value = error as {error?: {message?: string};message?: string};
      return value.error?.message ?? value.message ?? 'Request failed.';
    }
    return String(error);
  }
}
