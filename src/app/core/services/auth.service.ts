import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, map, Observable, of, switchMap, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { runModalPageModules } from '../../features/run-modal-page-modules';
import type { DataSourceConfig, ListPageConfig, LineConfig } from '../../platform/public-api';
import { ApiAuthService } from './api-auth.service';
import { RestService } from './rest.service';
import { SessionContext, SessionService } from './session.service';

export type LoginRequest = {
  companyId?: string;
  companyName?: string;
  email: string;
  password: string;
};

export type AuthorizedCompany = {
  systemId: string;
  name: string;
  code: string;
};

export type LoginResult = {
  user: Record<string, unknown>;
  session?: SessionContext;
  companies: AuthorizedCompany[];
  requiresCompanySelection: boolean;
};

type BackendLoginResponse = Record<string, unknown>;

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private pendingLogin?: { token: string; user: Record<string, unknown>; companies: AuthorizedCompany[] };
  constructor(
    private readonly apiAuth: ApiAuthService,
    private readonly restService: RestService,
    private readonly sessionService: SessionService,
    private readonly http: HttpClient,
  ) {}

  authenticate(): Observable<string> {
    if (this.sessionService.AccessToken) {
      return of(this.sessionService.AccessToken);
    }

    return this.apiAuth.getToken().pipe(
      tap((token) => {
        this.sessionService.AccessToken = token;
      }),
    );
  }

  storeAccessToken(token: string): void {
    this.sessionService.AccessToken = token;
  }

  applySessionContext(context: SessionContext): void {
    this.sessionService.applySessionContext(context);
  }

  getCompanies(): Observable<unknown> {
    return this.restService.get('/companies');
  }

  /** Account-wide membership lookup: never derive this from the active company's business collection. */
  listAuthorizedCompanies(): Observable<AuthorizedCompany[]> {
    return this.http.get<BackendLoginResponse>(this.buildAuthUrl('/auth/companies'), {
      headers: this.createBearerHeaders(),
    }).pipe(map((response) => {
      const body = this.toRecord(response) ?? {};
      return this.extractAuthorizedCompanies(this.readValue(body, 'data'));
    }));
  }

  /** Retain the old session until the backend verifies the new company and its permissions. */
  switchActiveCompany(companyId: string): Observable<SessionContext> {
    const requestedId = companyId.trim();
    const user = this.toRecord(this.sessionService.User);
    if (!requestedId || !user || !this.sessionService.isSessionValid()) {
      return throwError(() => new Error('Sign in and choose an authorized company.'));
    }
    if (requestedId === this.sessionService.Company) {
      return throwError(() => new Error('This company is already active.'));
    }
    return this.getPermissionEngine(requestedId).pipe(map((response) => {
      const body = this.toRecord(response) ?? {};
      const engine = this.toRecord(this.readValue(body, 'data'));
      const verified = this.toRecord(engine?.['company']);
      if (!engine || !verified || this.readFirstString(verified, ['systemId']) !== requestedId) {
        throw new Error('The server did not verify the selected company.');
      }
      const companyName = this.readFirstString(verified, ['displayName', 'name']);
      const context = {
        ...this.mapEngineToSessionContext(user, {
          email: this.readFirstString(user, ['email']),
          password: '',
          companyId: requestedId,
          companyName,
        }, engine),
        company: requestedId,
        companyName,
      };
      this.sessionService.applySessionContext(context);
      return context;
    }));
  }

  getPermissionEngine(companyId: string): Observable<unknown> {
    return this.http.get(this.buildAuthUrl('/auth/context'), {
      headers: this.createBearerHeaders(),
      params: { companyId },
    });
  }

  login(request: LoginRequest): Observable<LoginResult> {
    // Never carry over another user's company and permissions.
    this.pendingLogin = undefined;
    this.sessionService.clearSessionData();

    return this.http
      .post<BackendLoginResponse>(this.buildAuthUrl('/auth/login'), {
        login: request.email.trim(),
        password: request.password,
      })
      .pipe(
        switchMap((response) => {
          const data = this.toRecord(this.readValue(response, 'data'));
          const token = data ? this.readFirstString(data, ['token']) : '';
          const user = data ? this.toRecord(this.readValue(data, 'user')) : undefined;
          const companies = data ? this.extractAuthorizedCompanies(this.readValue(data, 'companies')) : [];
          if (!token || !user) {
            return throwError(() => new Error('Login response is missing verified account details.'));
          }
          if (!companies.length) {
            return throwError(
              () => new Error('No active ERP company is assigned to this account. Contact your administrator.'),
            );
          }

          this.pendingLogin = { token, user, companies };
          const defaultCompany = this.toRecord(data?.['defaultCompany']);
          const defaultId = defaultCompany ? this.readFirstString(defaultCompany, ['systemId']) : '';
          const selected =
            companies.find((company) => company.systemId === defaultId) ??
            (companies.length === 1 ? companies[0] : undefined);
          if (!selected) {
            return of({ user, companies, requiresCompanySelection: true });
          }
          return this.selectCompany(selected.systemId).pipe(
            map((session) => ({ user, session, companies, requiresCompanySelection: false })),
          );
        }),
        catchError((error: unknown) => {
          this.pendingLogin = undefined;
          this.sessionService.clearSessionData();
          return throwError(() => error);
        }),
      );
  }

  selectCompany(companyId: string): Observable<SessionContext> {
    const pending = this.pendingLogin;
    const selected = pending?.companies.find((company) => company.systemId === companyId);
    if (!pending || !selected) {
      return throwError(() => new Error('Choose an authorized company.'));
    }

    this.sessionService.AccessToken = pending.token;
    return this.getPermissionEngine(companyId).pipe(
      map((response) => {
        const data = this.toRecord(this.readValue(this.toRecord(response) ?? {}, 'data'));
        const verified = this.toRecord(data?.['company']);
        if (!data || !verified || this.readFirstString(verified, ['systemId']) !== selected.systemId) {
          throw new Error('Could not verify the selected company.');
        }
        const session = this.mapEngineToSessionContext(
          pending.user,
          {
            email: this.readFirstString(pending.user, ['email']),
            password: '',
            companyId: selected.systemId,
            companyName: selected.name,
          },
          data,
        );
        this.sessionService.applySessionContext(session);
        this.pendingLogin = undefined;
        return session;
      }),
      catchError((error: unknown) => {
        this.sessionService.clearSessionData();
        return throwError(() => error);
      }),
    );
  }

  private extractAuthorizedCompanies(value: unknown): AuthorizedCompany[] {
    if (!Array.isArray(value)) return [];
    return value.flatMap((item): AuthorizedCompany[] => {
      const company = this.toRecord(item);
      if (!company || company['isActive'] === false) return [];
      const systemId = this.readFirstString(company, ['systemId']);
      const name = this.readFirstString(company, ['displayName', 'name']);
      const code = this.readFirstString(company, ['code']);
      return systemId && name ? [{ systemId, name, code }] : [];
    });
  }

  getCurrentUser(): Observable<Record<string, unknown>> {
    return this.http
      .get<BackendLoginResponse>(this.buildAuthUrl('/auth/me'), {
        headers: this.createBearerHeaders(),
      })
      .pipe(
        map((response) => {
          const user = this.extractUser(response) ?? this.toRecord(response);

          if (!user) {
            throw new Error('Current user response did not include user details.');
          }

          return user;
        }),
      );
  }

  isSuperAdmin(): boolean {
    return this.sessionService.SuperAdmin;
  }

  hasPermission(pageName: string, permission: 'read' | 'insert' | 'modify' | 'post' | 'delete'): boolean {
    return this.sessionService.hasPermission(pageName, permission);
  }

  logout(reason?: string): void {
    this.sessionService.logout(reason);
  }

  private buildAuthUrl(endpoint: string): string {
    const baseUrl = environment.apiBaseUrl;
    const normalizedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${normalizedBase}${normalizedEndpoint}`;
  }

  private createBearerHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.sessionService.AccessToken}`,
    });
  }

  private extractToken(response: unknown): string {
    const tokenKeys = ['token', 'access_token', 'accessToken', 'plainTextToken'];
    const queue: unknown[] = [response];

    while (queue.length) {
      const current = queue.shift();

      if (!current || typeof current !== 'object') {
        continue;
      }

      const record = current as Record<string, unknown>;

      for (const key of tokenKeys) {
        const value = this.readValue(record, key);
        if (typeof value === 'string' && value.trim().length) {
          return value.trim();
        }
      }

      for (const key of ['data', 'result', 'auth']) {
        const nested = this.readValue(record, key);
        if (nested && typeof nested === 'object') {
          queue.push(nested);
        }
      }
    }

    return '';
  }

  private extractUser(response: unknown): Record<string, unknown> | undefined {
    const record = this.toRecord(response);

    if (!record) {
      return undefined;
    }

    for (const key of ['user', 'User', 'profile', 'data']) {
      const value = this.readValue(record, key);
      const user = this.toRecord(value);

      if (user && !this.extractToken(user)) {
        return user;
      }

      if (user) {
        const nestedUser = this.extractUser(user);
        if (nestedUser) {
          return nestedUser;
        }
      }
    }

    return undefined;
  }

  private toRecord(value: unknown): Record<string, unknown> | undefined {
    return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
  }

  private getDeviceName(): string {
    if (typeof navigator === 'undefined') {
      return 'TecSA ERP';
    }

    return navigator.userAgent || 'TecSA ERP';
  }

  private mapEngineToSessionContext(
    user: Record<string, unknown>,
    request: LoginRequest,
    engineResponse: unknown,
  ): SessionContext {
    const engine = this.toRecord(engineResponse) ?? {};
    const isSuperAdmin = this.readBoolean(engine, 'isSuperAdmin');
    const accessCenters = this.resolveEngineAccessCenters(engine);
    const permissions = this.mapEnginePagesToPermissions(engine);
    const defaultAccessCenter = this.readFirstString(user, ['defaultAccessCenter', 'DefaultAccessCenter']);
    const accessCenter = this.resolveSelectedAccessCenter(accessCenters, defaultAccessCenter);

    return this.createSessionContext(user, request, {
      superAdmin: isSuperAdmin,
      permissions,
      accessCenters,
      showAllAccessCenters: this.readBoolean(engine, 'showAllAccessCenters') || isSuperAdmin,
      showAccessCenterSelection: this.readBoolean(engine, 'showAccessCenterSelection') || accessCenters.length > 0,
      accessCenter,
      defaultAccessCenter,
    });
  }

  private resolveEngineAccessCenters(engine: Record<string, unknown>): unknown[] {
    const rawAccessCenters = this.readValue(engine, 'accessCenters');
    return Array.isArray(rawAccessCenters) ? rawAccessCenters : [];
  }

  private mapEnginePagesToPermissions(engine: Record<string, unknown>): unknown[] {
    const rawPages = this.readValue(engine, 'pages');

    if (!Array.isArray(rawPages)) {
      return [];
    }

    const permissions: Record<string, unknown>[] = [];

    const pages = rawPages.flatMap((page) => {
      const record = this.toRecord(page);
      const apiPath = record ? this.readFirstString(record, ['apiPath']) : '';
      if (!apiPath) return [page]; // Preserve the established session format.
      const normalizedPath = (value: string) => value.replace(/\{[^}]*\}/g, '{}').replace(/^\/+|\/+$/g, '');
      const sourcePath = (source: DataSourceConfig) =>
        source.navigation
          ? source.navigation.parentEndpoint + '/{parentId}/' + source.navigation.childCollection
          : source.endpoint;
      const bindings: Record<string, unknown>[] = [];
      for (const module of runModalPageModules) {
        const config = Object.values(module).find(
          (value) => value && typeof value === 'object' && 'pageId' in value,
        ) as ListPageConfig | undefined;
        if (!config?.dataSource) continue;
        const sources: Array<{ ids: string[]; source: DataSourceConfig }> = [
          { ids: [...new Set([config.permissionPageId ?? config.pageId!, config.pageId!])], source: config.dataSource },
        ];
        const lines = Object.entries(module).find(([key]) => key.endsWith('LineConfig'))?.[1] as LineConfig | undefined;
        if (lines)
          sources.push({ ids: [lines.permissionPageId ?? config.pageId! + '-lines'], source: lines.dataSource });
        for (const binding of sources) {
          if (normalizedPath(sourcePath(binding.source)) !== normalizedPath(apiPath)) continue;
          for (const id of binding.ids) {
            if (!bindings.some((value) => value['pageId'] === id))
              bindings.push({ ...record, pageId: id, pageName: config.title ?? id });
          }
        }
      }
      return bindings.length ? bindings : [page];
    });

    pages.forEach((page) => {
      const pageRecord = this.toRecord(page);
      if (!pageRecord) {
        return;
      }

      const pageId = this.readFirstString(pageRecord, ['pageId', 'PageId']);
      const pageName = this.readFirstString(pageRecord, ['pageName', 'PageName']) || pageId;
      const pageCode = this.readFirstString(pageRecord, ['pageCode', 'PageCode']) || pageName;
      const canRead = this.readBoolean(pageRecord, 'canRead');
      const canCreate = this.readBoolean(pageRecord, 'canCreate');
      const canUpdate = this.readBoolean(pageRecord, 'canUpdate');
      const canDelete = this.readBoolean(pageRecord, 'canDelete');

      permissions.push({
        query: pageRecord['query'],
        PageId: pageId,
        pageId,
        ObjectName: pageCode,
        PageName: pageName,
        ReadPermission: canRead ? 'Yes' : 'No',
        InsertPermission: canCreate ? 'Yes' : 'No',
        ModifyPermission: canUpdate ? 'Yes' : 'No',
        PostPermission: this.readBoolean(pageRecord, 'canExecute') ? 'Yes' : 'No',
        canExecute: this.readBoolean(pageRecord, 'canExecute'),
        DeletePermission: canDelete ? 'Yes' : 'No',
        canRead,
        canCreate,
        canUpdate,
        canDelete,
      });

      const actions = this.readValue(pageRecord, 'actions');
      if (!Array.isArray(actions)) {
        return;
      }

      actions.forEach((action) => {
        const actionRecord = this.toRecord(action);
        if (!actionRecord) {
          return;
        }

        const actionId = this.readFirstString(actionRecord, ['actionId', 'ActionId']);
        const canExecute = this.readBoolean(actionRecord, 'canExecute');

        permissions.push({
          PageId: pageId,
          pageId,
          ObjectName: actionId || pageCode,
          PageName: pageName,
          ReadPermission: canRead ? 'Yes' : 'No',
          InsertPermission: canCreate ? 'Yes' : 'No',
          ModifyPermission: canUpdate ? 'Yes' : 'No',
          PostPermission: canExecute ? 'Yes' : 'No',
          DeletePermission: canDelete ? 'Yes' : 'No',
          actionId,
          canRead,
          canCreate,
          canUpdate,
          canDelete,
          canExecute,
        });
      });
    });

    return permissions;
  }

  private resolveSelectedAccessCenter(accessCenters: unknown[], preferredCode: string): unknown {
    if (!preferredCode.length || !accessCenters.length) {
      return undefined;
    }

    const matched = accessCenters.find((item) => {
      const record = this.toRecord(item);
      if (!record) {
        return false;
      }

      const code = this.readFirstString(record, ['code', 'Code', 'accessCenter', 'AccessCenter']);
      return code === preferredCode;
    });

    return matched;
  }

  private createSessionContext(
    user: Record<string, unknown>,
    request: LoginRequest,
    overrides: Partial<SessionContext>,
  ): SessionContext {
    const companyId = this.resolveCompanyId(user, request);
    const companyName = this.resolveCompanyName(user, request);

    return {
      user,
      company: companyId,
      companyName,
      accessToken: this.sessionService.AccessToken,
      ...overrides,
    };
  }

  private resolveCompanyId(user: Record<string, unknown>, request: LoginRequest): string {
    return this.readFirstString(user, ['companyId', 'CompanyId']) || (request.companyId ?? '').trim();
  }

  private resolveCompanyName(user: Record<string, unknown>, request: LoginRequest): string {
    return this.readFirstString(user, ['companyName', 'CompanyName']) || (request.companyName ?? '').trim();
  }

  private firstRecord(response: unknown): Record<string, unknown> | undefined {
    return this.records(response)[0] as Record<string, unknown> | undefined;
  }

  private records(response: unknown): unknown[] {
    if (Array.isArray(response)) {
      return response;
    }

    if (response && typeof response === 'object' && 'value' in response) {
      const value = (response as Record<string, unknown>)['value'];
      return Array.isArray(value) ? value : [];
    }

    return [];
  }

  private readString(source: Record<string, unknown>, key: string): string {
    const value = this.readValue(source, key);
    return value === undefined || value === null ? '' : String(value);
  }

  private readFirstString(source: Record<string, unknown>, keys: string[]): string {
    for (const key of keys) {
      const value = this.readString(source, key);
      if (value.length) {
        return value;
      }
    }

    return '';
  }

  private readUserId(user: Record<string, unknown>): string {
    return this.readFirstString(user, ['userId', 'UserId', 'systemId', 'SystemId', 'id', 'Id']);
  }

  private readRoleId(user: Record<string, unknown>): string {
    return this.readFirstString(user, ['roleId', 'RoleId']);
  }

  private readBoolean(source: Record<string, unknown>, key: string): boolean {
    const value = this.readValue(source, key);
    return value === true || value === 'true' || value === 'True' || value === 'Yes' || value === '1';
  }

  private readValue(source: Record<string, unknown>, key: string): unknown {
    if (key in source) {
      return source[key];
    }

    const normalized = key.toLowerCase();
    const matched = Object.keys(source).find((candidate) => candidate.toLowerCase() === normalized);
    return matched ? source[matched] : undefined;
  }

  private extractAccessCenterCode(value: unknown): string {
    if (!value) {
      return '';
    }

    if (typeof value === 'string') {
      return value;
    }

    if (typeof value === 'object') {
      const record = value as Record<string, unknown>;
      const result = this.readFirstString(record, ['accessCenter', 'AccessCenter', 'code', 'Code', 'id', 'Id']);
      return result === undefined || result === null ? '' : String(result);
    }

    return '';
  }
}
