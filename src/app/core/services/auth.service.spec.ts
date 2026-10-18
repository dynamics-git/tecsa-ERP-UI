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
  const user = { systemId: '11111111-1111-4111-8111-111111111111', userName: 'test-user', name: 'Test User', email: 'user@example.test' };
  const apiBase = environment.apiBaseUrl.replace(/\/$/, '');
  const url = `${apiBase}/auth/login`;
  const contextUrl = (id: string) => `${apiBase}/auth/context?companyId=${id}`;
  const context = (company = companyA, superAdmin = false, canRead = false) => ({
    data: {
      company,
      isSuperAdmin: superAdmin,
      accessCenters: [],
      pages: [],
      resources: [{
        resource: 'customers',
        canRead,
        canCreate: canRead,
        canUpdate: canRead,
        canDelete: false,
        canExecute: false,
      }],
    },
  });
  const response = (companies = [companyA], defaultCompany: typeof companyA | null = companyA) =>
    ({ data: { token: 'sanctum-test-token', user, companies, defaultCompany } });

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
    expect(permissions.hasPermission('customers')).toBe(true);
    expect(session.Permissions).toHaveLength(1);
  });

  it('offers verified choices for multiple companies without selecting arbitrary defaults', async () => {
    const operation = firstValueFrom(auth.login({ email: user.email, password: 'pass' }));
    http.expectOne(url).flush(response([companyA, companyB], null));
    const result = await operation;
    expect(result.requiresCompanySelection).toBe(true);
    expect(result.companies.map(company => company.systemId)).toEqual([companyA.systemId, companyB.systemId]);
    expect(session.isSessionValid()).toBe(false);
    expect(session.Company).toBe('');
    expect(permissions.hasPermission('customers')).toBe(false);

    await expect(firstValueFrom(auth.selectCompany('unauthorized-id'))).rejects.toThrow('Choose an authorized company');
    const chosen = firstValueFrom(auth.selectCompany(companyB.systemId));
    http.expectOne(contextUrl(companyB.systemId)).flush(context(companyB));
    await chosen;
    expect(session.Company).toBe(companyB.systemId);
    expect(session.SuperAdmin).toBe(false);
    expect(permissions.hasPermission('customers')).toBe(false);
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
    http.expectOne(url).flush({ data: { token: 'token', user: { ...user, email: 'admin@tecsa.com.my', userName: 'admin@tecsa.com.my' }, companies: [companyA], defaultCompany: companyA } });
    http.expectOne(contextUrl(companyA.systemId)).flush(context(companyA, false, false));
    await operation;
    expect(permissions.isSuperAdmin()).toBe(false);
    expect(permissions.hasPermission('customers')).toBe(false);
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
    http.expectOne(contextUrl(companyA.systemId)).flush({ message: 'Company access denied' }, { status: 403, statusText: 'Forbidden' });
    await expect(operation).rejects.toBeTruthy();
    expect(session.isSessionValid()).toBe(false);
    expect(session.AccessToken).toBe('');
  });
});
