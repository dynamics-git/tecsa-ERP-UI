import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { RestService } from '../../../core/services/rest.service';

export interface PermissionRole {
  systemId: string;
  code: string;
  name: string;
  description?: string;
  isSystem: boolean;
  assignable: boolean;
  isActive: boolean;
}
export interface PermissionTarget {
  systemId: string;
  surface: string;
  targetType: string;
  targetKey: string;
  label: string;
  isActive: boolean;
}
export interface PermissionPage {
  systemId: string;
  pageId: string;
  title: string;
  pageType: string;
  module?: string | null;
  route?: string | null;
  resource?: string | null;
  isActive: boolean;
  targets: PermissionTarget[];
}
export interface PageRight {
  pageId: string;
  canRead: boolean;
  canCreate: boolean;
  canModify: boolean;
  canDelete: boolean;
  canPost: boolean;
}
export interface TargetRight {
  targetId: string;
  canView: boolean;
  canEdit: boolean;
  canExecute: boolean;
}
export interface ResourceRight {
  resource: string;
  canRead: boolean;
  canCreate: boolean;
  canModify: boolean;
  canDelete: boolean;
  canExecute: boolean;
}
export interface UserRecord {
  systemId: string;
  userName: string;
  name: string;
  email: string;
  isActive: boolean;
  lastLoginAt?: string | null;
}
export interface UserCompany {
  systemId: string;
  companyId: string;
  company?: { systemId: string; code: string; name: string };
  isActive: boolean;
  isDefault: boolean;
}
export interface UserRole {
  systemId: string;
  permissionSetId: string;
  companyId: string | null;
  isActive: boolean;
  permissionSet?: PermissionRole;
}
export interface UserSession {
  systemId: string;
  userId: string;
  ipAddress: string | null;
  userAgent: string | null;
  startedAt: string;
  lastSeenAt: string;
  expiresAt: string;
  endedAt: string | null;
  endReason: string | null;
  signedIn: boolean;
  recentlyActive: boolean;
  isCurrent: boolean;
}
type ApiList<T> = { data: T[]; meta?: { lastPage?: number; total?: number } };

@Injectable({ providedIn: 'root' })
export class PermissionAdminApi {
  private readonly rest = inject(RestService);

  async list<T>(url: string): Promise<T[]> {
    const response = await firstValueFrom(this.rest.get(url, {suppressGlobalErrorDialog: true})) as ApiList<T>;
    return response.data ?? [];
  }

  async all<T>(path: string): Promise<T[]> {
    const records: T[] = [];
    for (let page = 1; page <= 50; page++) {
      const params = path.includes('?') ? '&' : '?';
      const response = await firstValueFrom(this.rest.get(
        path + params + 'page=' + page + '&perPage=100', {suppressGlobalErrorDialog: true},
      )) as ApiList<T>;
      records.push(...(response.data ?? []));
      if (!response.meta?.lastPage || page >= response.meta.lastPage) return records;
    }
    throw new Error('More than 5000 records. Narrow the selection before continuing.');
  }

  async resources(): Promise<string[]> {
    return this.list<string>('/permissionResources');
  }

  async pages(): Promise<PermissionPage[]> {
    return this.all<PermissionPage>('/permissionPages');
  }

  async syncPages(pages: unknown[]): Promise<void> {
    await firstValueFrom(this.rest.put('/permissionPages/catalog', { pages }, {suppressGlobalErrorDialog: true}));
  }

  async roles(): Promise<PermissionRole[]> {
    return this.all<PermissionRole>('/permissionSets');
  }

  async getPageRights(id: string): Promise<PageRight[]> {
    return this.list<PageRight>('/permissionSets/' + encodeURIComponent(id) + '/pageRights');
  }
  async getTargetRights(id: string): Promise<TargetRight[]> {
    return this.list<TargetRight>('/permissionSets/' + encodeURIComponent(id) + '/targetRights');
  }
  async getResourceRights(id: string): Promise<ResourceRight[]> {
    return this.list<ResourceRight>('/permissionSets/' + encodeURIComponent(id) + '/permissions');
  }
  async savePageRights(id: string, rights: PageRight[]): Promise<void> {
    await firstValueFrom(this.rest.put('/permissionSets/' + encodeURIComponent(id) + '/pageRights',
      { pages: rights }, {suppressGlobalErrorDialog: true}));
  }
  async saveTargetRights(id: string, rights: TargetRight[]): Promise<void> {
    await firstValueFrom(this.rest.put('/permissionSets/' + encodeURIComponent(id) + '/targetRights',
      { targets: rights }, {suppressGlobalErrorDialog: true}));
  }
  async saveResourceRights(id: string, rights: ResourceRight[]): Promise<void> {
    await firstValueFrom(this.rest.put('/permissionSets/' + encodeURIComponent(id) + '/permissions',
      { permissions: rights }, {suppressGlobalErrorDialog: true}));
  }

  async createUser(user: {userName: string; name: string; email: string; password: string}): Promise<UserRecord> {
    const response = await firstValueFrom(this.rest.post('/users', user, {suppressGlobalErrorDialog: true})) as {data: UserRecord};
    return response.data;
  }
  async companies(): Promise<Array<{systemId:string; code:string; name:string}>> {
    return this.all('/companies');
  }
  async memberships(id: string): Promise<UserCompany[]> {
    return this.list<UserCompany>('/users/' + encodeURIComponent(id) + '/companies');
  }
  async addCompany(userId: string, companyId: string, isDefault: boolean): Promise<void> {
    await firstValueFrom(this.rest.post('/users/' + encodeURIComponent(userId) + '/companies',
      { companyId, isDefault }, {suppressGlobalErrorDialog: true}));
  }
  async removeCompany(userId: string, membershipId: string): Promise<void> {
    await firstValueFrom(this.rest.delete('/users/' + encodeURIComponent(userId) + '/companies/' + encodeURIComponent(membershipId),
      {suppressGlobalErrorDialog: true}));
  }
  async assignments(id: string): Promise<UserRole[]> {
    return this.list<UserRole>('/users/' + encodeURIComponent(id) + '/permissionSets');
  }
  async assignRole(userId: string, permissionSetId: string, companyId: string | null): Promise<void> {
    await firstValueFrom(this.rest.post('/users/' + encodeURIComponent(userId) + '/permissionSets',
      {permissionSetId, companyId}, {suppressGlobalErrorDialog: true}));
  }
  async unassignRole(userId: string, assignmentId: string): Promise<void> {
    await firstValueFrom(this.rest.delete('/users/' + encodeURIComponent(userId) + '/permissionSets/' + encodeURIComponent(assignmentId),
      {suppressGlobalErrorDialog: true}));
  }
  async sessions(userId: string): Promise<UserSession[]> {
    return this.list<UserSession>('/users/' + encodeURIComponent(userId) + '/sessions');
  }
  async revokeSession(userId: string, sessionId: string): Promise<void> {
    await firstValueFrom(this.rest.delete('/users/' + encodeURIComponent(userId) + '/sessions/' + encodeURIComponent(sessionId),
      {suppressGlobalErrorDialog: true}));
  }
}
