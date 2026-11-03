import { WorkspaceContext } from './workspace-context';
import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Subject } from 'rxjs';
import type { PagePermissionRule } from './page-access.service';
import { environment } from '../../../environments/environment';

export type PermissionMatrix = {
  read: boolean;
  insert: boolean;
  modify: boolean;
  post: boolean;
  delete: boolean;
};

export type SessionContext = {
  user?: unknown;
  company?: string;
  companyName?: string;
  accessCenter?: unknown;
  defaultAccessCenter?: unknown;
  accessCenters?: unknown[];
  permissions?: unknown[];
  pagePermissions?: PagePermissionRule[];
  companySuper?: boolean;
  superAdmin?: boolean;
  showAllAccessCenters?: boolean;
  showAccessCenterSelection?: boolean;
  accessToken?: string;
};

@Injectable({
  providedIn: 'root'
})
export class SessionService {
  private readonly workspace=inject(WorkspaceContext);
  private readonly prefix = this.workspace.storageKey('app-');
  private readonly sessionSchemaKey = `${this.prefix}session-schema`;
  private readonly sessionSchemaVersion = 'laravel-company-context-v2';
  private readonly userDetailsKey = `${this.prefix}user-details`;
  private readonly companyKey = `${this.prefix}comapny`;
  private readonly companyNameKey = `${this.prefix}comapny-name`;
  private readonly accessCenterKey = `${this.prefix}access-center`;
  private readonly defaultAccessCenterKey = `${this.prefix}default-access-center`;
  private readonly accessCentersKey = `${this.prefix}access-centers`;
  private readonly permissionsKey = `${this.prefix}permissions`;
  private readonly pagePermissionsKey = `${this.prefix}page-permissions`;
  private readonly companySuperKey = `${this.prefix}company-super`;
  private readonly superAdminKey = `${this.prefix}super-admin`;
  private readonly showAllAccessCentersKey = `${this.prefix}show-all-access-centers`;
  private readonly showAccessCenterSelectionKey = `${this.prefix}show-access-center-selection`;
  private readonly licensePermissionKey = `${this.prefix}licensePermission`;
  private readonly ipKey = `${this.prefix}user-ip`;
  private readonly licenseInfoKey = `${this.prefix}Lisence-details`;
  private readonly userLastLoginKey = `${this.prefix}user-last-login`;
  private readonly openedPopupIdKey = `${this.prefix}opened-popup-id`;
  private readonly accessTokenKey = this.workspace.storageKey('access-token');

  readonly permissionsLoaded$ = new BehaviorSubject<boolean>(false);
  readonly permissionRefreshRequested$ = new Subject<void>();
  readonly accessCenterChanged$ = new Subject<unknown>();
  readonly userProfileChanged$ = new Subject<unknown>();

  constructor(private readonly router: Router) {
    this.ensureSessionSchemaCompatibility();
  }

  get User(): unknown {
    return this.readJson(this.userDetailsKey);
  }

  set User(value: unknown) {
    this.writeJson(this.userDetailsKey, value);
    this.userProfileChanged$.next(value);
  }

  get UserDetails(): unknown {
    return this.User;
  }

  set UserDetails(value: unknown) {
    this.User = value;
  }

  get Company(): string {
    return this.readString(this.companyKey);
  }

  set Company(value: string) {
    this.writeString(this.companyKey, value);
  }

  get CompanyName(): string {
    return this.readString(this.companyNameKey);
  }

  set CompanyName(value: string) {
    this.writeString(this.companyNameKey, value);
  }

  get AccessCenter(): unknown {
    return this.readJson(this.accessCenterKey);
  }

  set AccessCenter(value: unknown) {
    this.writeJson(this.accessCenterKey, value);
    this.accessCenterChanged$.next(value);
  }

  get DefaultAccessCenter(): unknown {
    return this.readJson(this.defaultAccessCenterKey);
  }

  set DefaultAccessCenter(value: unknown) {
    this.writeJson(this.defaultAccessCenterKey, value);
  }

  get AccessCenters(): unknown[] {
    const value = this.readJson(this.accessCentersKey);
    return Array.isArray(value) ? value : [];
  }

  set AccessCenters(value: unknown[]) {
    this.writeJson(this.accessCentersKey, value);
  }

  get AccessCenterId(): string {
    const value = this.AccessCenter;
    return this.readProperty(value, 'Code') || this.readProperty(value, 'code') || this.readProperty(value, 'Id') || this.readProperty(value, 'id') || '';
  }

  get RoleId(): string {
    return this.readProperty(this.User, 'roleId') || this.readProperty(this.User, 'RoleId');
  }

  get UserName(): string {
    return this.readProperty(this.User, 'userName') || this.readProperty(this.User, 'UserName') || this.readProperty(this.User, 'name') || this.readProperty(this.User, 'Name');
  }

  get UserId(): string {
    return this.readProperty(this.User, 'userId') || this.readProperty(this.User, 'UserId') || this.readProperty(this.User, 'systemId') || this.readProperty(this.User, 'SystemId') || this.readProperty(this.User, 'id') || this.readProperty(this.User, 'Id');
  }

  get Email(): string {
    return this.readProperty(this.User, 'email') || this.readProperty(this.User, 'Email');
  }

  get Permissions(): unknown[] {
    const value = this.readJson(this.permissionsKey);
    return Array.isArray(value) ? value : [];
  }

  set Permissions(value: unknown[]) {
    this.writeJson(this.permissionsKey, value);
    this.permissionsLoaded$.next(true);
  }

  get SuperAdmin(): boolean {
    return this.readBoolean(this.superAdminKey);
  }

  get PagePermissions(): PagePermissionRule[] {
    const value = this.readJson(this.pagePermissionsKey);
    return Array.isArray(value) ? value as PagePermissionRule[] : [];
  }

  set PagePermissions(value: PagePermissionRule[]) {
    this.writeJson(this.pagePermissionsKey, value);
  }

  get CompanySuper(): boolean { return this.readBoolean(this.companySuperKey); }
  set CompanySuper(value: boolean) { this.writeBoolean(this.companySuperKey, value); }

  set SuperAdmin(value: boolean) {
    this.writeBoolean(this.superAdminKey, value);
  }

  get ShowAllAccessCenters(): boolean {
    return this.readBoolean(this.showAllAccessCentersKey);
  }

  set ShowAllAccessCenters(value: boolean) {
    this.writeBoolean(this.showAllAccessCentersKey, value);
  }

  get ShowAccessCenterSelection(): boolean {
    return this.readBoolean(this.showAccessCenterSelectionKey);
  }

  set ShowAccessCenterSelection(value: boolean) {
    this.writeBoolean(this.showAccessCenterSelectionKey, value);
  }

  get licensePermission(): boolean {
    return this.readBoolean(this.licensePermissionKey);
  }

  set licensePermission(value: boolean) {
    this.writeBoolean(this.licensePermissionKey, value);
  }

  get IP(): string {
    return this.readString(this.ipKey);
  }

  set IP(value: string) {
    this.writeString(this.ipKey, value);
  }

  get UserLiseceLoginIfo(): unknown {
    return this.readJson(this.licenseInfoKey);
  }

  set UserLiseceLoginIfo(value: unknown) {
    this.writeJson(this.licenseInfoKey, value);
  }

  get UserLastLoginInfo(): unknown {
    return this.readJson(this.userLastLoginKey);
  }

  set UserLastLoginInfo(value: unknown) {
    this.writeJson(this.userLastLoginKey, value);
  }

  get OpenedPopupId(): string {
    return this.readString(this.openedPopupIdKey);
  }

  set OpenedPopupId(value: string) {
    this.writeString(this.openedPopupIdKey, value);
  }

  get AccessToken(): string {
    return this.readString(this.accessTokenKey);
  }

  set AccessToken(value: string) {
    this.writeString(this.accessTokenKey, value);
  }

  applySessionContext(context: SessionContext): void {
    if (context.user !== undefined) {
      this.User = context.user;
    }

    if (context.company !== undefined) {
      this.Company = context.company;
    }

    if (context.companyName !== undefined) {
      this.CompanyName = context.companyName;
    }

    if (context.accessCenter !== undefined) {
      this.AccessCenter = context.accessCenter;
    }

    if (context.defaultAccessCenter !== undefined) {
      this.DefaultAccessCenter = context.defaultAccessCenter;
    }

    if (context.accessCenters !== undefined) {
      this.AccessCenters = context.accessCenters;
    }

    if (context.pagePermissions !== undefined) this.PagePermissions = context.pagePermissions;
    if (context.companySuper !== undefined) this.CompanySuper = context.companySuper;

    if (context.superAdmin !== undefined) {
      this.SuperAdmin = context.superAdmin;
    }
    if (context.permissions !== undefined) this.Permissions = context.permissions;

    if (context.showAllAccessCenters !== undefined) {
      this.ShowAllAccessCenters = context.showAllAccessCenters;
    }

    if (context.showAccessCenterSelection !== undefined) {
      this.ShowAccessCenterSelection = context.showAccessCenterSelection;
    }

    if (context.accessToken !== undefined) {
      this.AccessToken = context.accessToken;
    }
  }

  getPermission(pageName: string): PermissionMatrix {
    if (this.SuperAdmin) {
      return {
        read: true,
        insert: true,
        modify: true,
        post: true,
        delete: true
      };
    }

    const permission = this.Permissions.find((item) => this.readProperty(item, 'pageName') === pageName || this.readProperty(item, 'PageName') === pageName);

    return {
      read: this.readPermissionFlag(permission, 'ReadPermission'),
      insert: this.readPermissionFlag(permission, 'InsertPermission'),
      modify: this.readPermissionFlag(permission, 'ModifyPermission'),
      post: this.readPermissionFlag(permission, 'PostPermission'),
      delete: this.readPermissionFlag(permission, 'DeletePermission')
    };
  }

  hasPermission(pageName: string, permission: keyof PermissionMatrix): boolean {
    return this.getPermission(pageName)[permission];
  }

  isSessionValid(): boolean {
    return Boolean(this.User && this.AccessToken && this.Company);
  }

  clearSessionData(): void {
    [
      this.userDetailsKey,
      this.companyKey,
      this.companyNameKey,
      this.accessCenterKey,
      this.defaultAccessCenterKey,
      this.accessCentersKey,
      this.permissionsKey,
      this.pagePermissionsKey,
      this.companySuperKey,
      this.superAdminKey,
      this.showAllAccessCentersKey,
      this.showAccessCenterSelectionKey,
      this.licensePermissionKey,
      this.ipKey,
      this.licenseInfoKey,
      this.userLastLoginKey,
      this.openedPopupIdKey,
      this.accessTokenKey,
      'Recent-Shortcut-Items'
    ].forEach((key) => localStorage.removeItem(key));

    this.permissionsLoaded$.next(false);
  }

  logout(reason = 'logout'): void {
    this.notifyBackendLogout(reason);
    this.clearSessionData();
    console.warn(`Session cleared: ${reason}`);
    void this.router.navigate(['/auth/login']);
  }

  logoutWithIdleMessage(): void {
    this.logout('idle-timeout');
  }

  prepareIdleExpiry(): void {
    localStorage.setItem(`${this.prefix}idle-expired`, 'true');
  }

  finishIdleExpiryRedirect(): void {
    localStorage.removeItem(`${this.prefix}idle-expired`);
    void this.router.navigate(['/auth/login']);
  }

  notifyUserProfileChanged(): void {
    this.userProfileChanged$.next(this.User);
  }

  private ensureSessionSchemaCompatibility(): void {
    const current = localStorage.getItem(this.sessionSchemaKey);

    if (current === this.sessionSchemaVersion) {
      return;
    }

    this.clearSessionData();
    localStorage.setItem(this.sessionSchemaKey, this.sessionSchemaVersion);
  }

  private notifyBackendLogout(reason: string): void {
    const token = this.AccessToken;

    if (!token || reason === 'unauthorized') {
      return;
    }

    void fetch(this.workspace.apiUrl(this.buildAuthUrl('/auth/logout'),environment.apiBaseUrl), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      }
    }).catch(() => {
      // Local logout should still complete if the backend session is already gone.
    });
  }

  private buildAuthUrl(endpoint: string): string {
    const baseUrl = environment.apiBaseUrl;
    const normalizedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${normalizedBase}${normalizedEndpoint}`;
  }

  private readPermissionFlag(value: unknown, key: string): boolean {
    const camelKey = key.charAt(0).toLowerCase() + key.slice(1);
    const flag = this.readProperty(value, camelKey) || this.readProperty(value, key);
    return flag === 'true' || flag === 'Yes' || flag === '1' || flag === 'Full';
  }

  private readProperty(value: unknown, key: string): string {
    if (value && typeof value === 'object' && key in value) {
      const record = value as Record<string, unknown>;
      const property = record[key];
      return property === undefined || property === null ? '' : String(property);
    }

    if (value && typeof value === 'object') {
      const record = value as Record<string, unknown>;
      const normalized = key.toLowerCase();
      const matched = Object.keys(record).find((candidate) => candidate.toLowerCase() === normalized);
      if (matched) {
        const property = record[matched];
        return property === undefined || property === null ? '' : String(property);
      }
    }

    return '';
  }

  private readJson(key: string): unknown {
    const value = localStorage.getItem(key);

    if (!value) {
      return undefined;
    }

    try {
      return JSON.parse(value) as unknown;
    } catch {
      return value;
    }
  }

  private writeJson(key: string, value: unknown): void {
    if (value === undefined || value === null || value === '') {
      localStorage.removeItem(key);
      return;
    }

    localStorage.setItem(key, JSON.stringify(value));
  }

  private readString(key: string): string {
    return localStorage.getItem(key) ?? '';
  }

  private writeString(key: string, value: string): void {
    if (!value) {
      localStorage.removeItem(key);
      return;
    }

    localStorage.setItem(key, value);
  }

  private readBoolean(key: string): boolean {
    return localStorage.getItem(key) === 'true';
  }

  private writeBoolean(key: string, value: boolean): void {
    localStorage.setItem(key, String(value));
  }
}
