import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { HTTP_INTERCEPTORS, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AuthService } from './auth.service';
import { SessionService } from './session.service';
import { PermissionService } from './permission.service';
import { HttpInterceptorService } from '../interceptors/http-interceptor';
import { environment } from '../../../environments/environment';

describe('TecSA Laravel company-aware login', () => {
  let auth: AuthService;
  let session: SessionService;
  let permissions: PermissionService;
  let http: HttpTestingController;
  const companyA = { systemId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', name: 'Company A', code: 'A', isActive: true };
  const companyB = { systemId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', name: 'Company B', code: 'B', isActive: true };
  const user = {
    systemId: '11111111-1111-4111-8111-111111111111',
    userName: 'test-user',
    name: 'Test User',
    email: 'user@example.test',
  };
  const apiBase = environment.apiBaseUrl.replace(/\/$/, '');
  const url = `${apiBase}/auth/login`;
  const contextUrl = (id: string) => `${apiBase}/auth/context?companyId=${id}`;
  const context = (company = companyA, superAdmin = false, canRead = false) => ({
    data: {
      company,
      isSuperAdmin: superAdmin,
      accessCenters: [],
      pages: [
        {
          pageId: 'purchase-order',
          pageName: 'Purchase Order',
          pageCode: 'purchase_orders',
          canRead,
          canCreate: false,
          canUpdate: false,
          canDelete: false,
          canExecute: false,
        },
      ],
    },
  });
  const response = (companies = [companyA], defaultCompany: typeof companyA | null = companyA) => ({
    data: { token: 'sanctum-test-token', user, companies, defaultCompany },
  });

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        { provide: HTTP_INTERCEPTORS, useClass: HttpInterceptorService, multi: true },
      ],
    });
    auth = TestBed.inject(AuthService);
    session = TestBed.inject(SessionService);
    permissions = TestBed.inject(PermissionService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  it('lists only active authorized companies through the identity API', async () => {
    session.applySessionContext({ user, company: companyA.systemId, companyName: companyA.name, accessToken: 'sanctum-test-token' });
    const result = firstValueFrom(auth.listAuthorizedCompanies());
    const request = http.expectOne(`${apiBase}/auth/companies`);
    expect(request.request.headers.get('Authorization')).toBe('Bearer sanctum-test-token');
    request.flush({ data: [companyA, { ...companyB, isActive: false }] });
    expect((await result).map(company => company.systemId)).toEqual([companyA.systemId]);
  });

  it('changes company only after a matching verified permission context', async () => {
    session.applySessionContext({ user, company: companyA.systemId, companyName: companyA.name, accessToken: 'sanctum-test-token', permissions: [] });
    const switching = firstValueFrom(auth.switchActiveCompany(companyB.systemId));
    expect(session.Company).toBe(companyA.systemId);
    const request = http.expectOne(contextUrl(companyB.systemId));
    expect(request.request.headers.get('Authorization')).toBe('Bearer sanctum-test-token');
    request.flush(context(companyB, false, true));
    const selected = await switching;
    expect(selected.company).toBe(companyB.systemId);
    expect(session.Company).toBe(companyB.systemId);
    expect(session.CompanyName).toBe(companyB.name);
    expect(session.AccessToken).toBe('sanctum-test-token');
    expect(session.Permissions.some((item) => (item as Record<string, unknown>)['pageId'] === 'purchase-order')).toBe(true);
  });

  it('preserves the original company and permissions if the returned context does not match', async () => {
    const originalPermissions = [{ pageId: 'purchase-requisition', canRead: true }];
    session.applySessionContext({ user, company: companyA.systemId, companyName: companyA.name, accessToken: 'sanctum-test-token', permissions: originalPermissions });
    const switching = firstValueFrom(auth.switchActiveCompany(companyB.systemId));
    http.expectOne(contextUrl(companyB.systemId)).flush(context(companyA));
    await expect(switching).rejects.toThrow('did not verify the selected company');
    expect(session.Company).toBe(companyA.systemId);
    expect(session.CompanyName).toBe(companyA.name);
    expect(session.Permissions).toEqual(originalPermissions);
  });

  it('uses Laravel login, verifies default company and receives backend permissions before entering ERP', async () => {
    const operation = firstValueFrom(auth.login({ email: ' user@example.test ', password: 'correct-password' }));
    const login = http.expectOne(url);
    expect(login.request.method).toBe('POST');
    expect(login.request.body).toEqual({ login: 'user@example.test', password: 'correct-password' });
    expect(login.request.headers.has('Authorization')).toBe(false);
    login.flush(response());
    expect(session.isSessionValid()).toBe(false);
    const check = http.expectOne(contextUrl(companyA.systemId));
    expect(check.request.headers.get('Authorization')).toBe('Bearer sanctum-test-token');
    check.flush(context(companyA, false, true));
    const result = await operation;
    expect(result.requiresCompanySelection).toBe(false);
    expect(session.isSessionValid()).toBe(true);
    expect(session.Company).toBe(companyA.systemId);
    expect(session.CompanyName).toBe(companyA.name);
    expect(session.SuperAdmin).toBe(false);
    expect(permissions.canView('purchase-order')).toBe(true);
    expect(session.Permissions).toHaveLength(1);
  });

  it('offers verified choices for multiple companies without selecting arbitrary defaults', async () => {
    const operation = firstValueFrom(auth.login({ email: user.email, password: 'pass' }));
    http.expectOne(url).flush(response([companyA, companyB], null));
    const result = await operation;
    expect(result.requiresCompanySelection).toBe(true);
    expect(result.companies.map((company) => company.systemId)).toEqual([companyA.systemId, companyB.systemId]);
    expect(session.isSessionValid()).toBe(false);
    expect(session.Company).toBe('');
    expect(permissions.canView('purchase-order')).toBe(false);

    await expect(firstValueFrom(auth.selectCompany('unauthorized-id'))).rejects.toThrow('Choose an authorized company');
    const chosen = firstValueFrom(auth.selectCompany(companyB.systemId));
    http.expectOne(contextUrl(companyB.systemId)).flush(context(companyB));
    await chosen;
    expect(session.Company).toBe(companyB.systemId);
    expect(session.SuperAdmin).toBe(false);
    expect(permissions.canView('purchase-order')).toBe(false);
  });

  it('rejects a mismatched company from the server before applying session data', async () => {
    const operation = firstValueFrom(auth.login({ email: user.email, password: 'pass' }));
    http.expectOne(url).flush(response());
    http.expectOne(contextUrl(companyA.systemId)).flush(context(companyB));
    await expect(operation).rejects.toThrow('Could not verify the selected company');
    expect(session.isSessionValid()).toBe(false);
    expect(session.Company).toBe('');
    expect(session.Permissions).toEqual([]);
  });

  it('does not grant SUPER privileges merely because the username resembles an admin', async () => {
    const operation = firstValueFrom(auth.login({ email: 'admin@tecsa.com.my', password: 'pass' }));
    http
      .expectOne(url)
      .flush({
        data: {
          token: 'token',
          user: { ...user, email: 'admin@tecsa.com.my', userName: 'admin@tecsa.com.my' },
          companies: [companyA],
          defaultCompany: companyA,
        },
      });
    http.expectOne(contextUrl(companyA.systemId)).flush(context(companyA, false, false));
    await operation;
    expect(permissions.isSuperAdmin()).toBe(false);
    expect(permissions.canView('purchase-order')).toBe(false);
  });

  it('rejects accounts without company membership and does not retain a bearer token', async () => {
    const operation = firstValueFrom(auth.login({ email: user.email, password: 'pass' }));
    http.expectOne(url).flush(response([], null));
    await expect(operation).rejects.toThrow('No active ERP company');
    expect(session.AccessToken).toBe('');
    expect(session.isSessionValid()).toBe(false);
  });

  it('remains logged out when the backend denies company context', async () => {
    const operation = firstValueFrom(auth.login({ email: user.email, password: 'pass' }));
    http.expectOne(url).flush(response());
    http
      .expectOne(contextUrl(companyA.systemId))
      .flush({ message: 'Company access denied' }, { status: 403, statusText: 'Forbidden' });
    await expect(operation).rejects.toBeTruthy();
    expect(session.isSessionValid()).toBe(false);
    expect(session.AccessToken).toBe('');
  });
  it('binds discovered entity endpoints to existing UI pages without a backend page registry', async () => {
    const operation = firstValueFrom(auth.login({ email: 'user@example.test', password: 'correct-password' }));
    http.expectOne(url).flush(response());
    http.expectOne(contextUrl(companyA.systemId)).flush({
      data: {
        company: companyA,
        isSuperAdmin: true,
        accessCenters: [],
        pages: [
          {
            pageId: 'items',
            apiPath: '/items',
            pageCode: 'items',
            canRead: true,
            canCreate: true,
            canUpdate: true,
            canDelete: true,
          },
          {
            pageId: 'itemUnitsOfMeasure',
            apiPath: '/items/{itemSystemId}/unitsOfMeasure',
            pageCode: 'items',
            canRead: true,
            canCreate: false,
            canUpdate: false,
            canDelete: false,
          },
          {
            pageId: 'numberSeries',
            apiPath: '/numberSeries',
            pageCode: 'number_series',
            canRead: true,
            canCreate: true,
            canUpdate: true,
            canDelete: true,
          },
        ],
      },
    });
    await operation;
    const entries = session.Permissions as Array<Record<string, unknown>>;
    expect(entries.find((entry) => entry['pageId'] === 'items')?.['canDelete']).toBe(true);
    expect(entries.find((entry) => entry['pageId'] === 'items-lines')?.['canDelete']).toBe(false);
    expect(entries.find((entry) => entry['pageId'] === 'item-units-of-measure')?.['canUpdate']).toBe(false);
    expect(entries.find((entry) => entry['pageId'] === 'no-series')?.['canDelete']).toBe(true);
    expect(session.SuperAdmin).toBe(true);
  });
});
