import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, Subject } from 'rxjs';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LoginPage } from './login';
import { AuthService } from '../../../core/services/auth.service';
import { IdleSessionService } from '../../../core/services/idle-session.service';
import { SessionService } from '../../../core/services/session.service';
import { ApiErrorService } from '../../../platform/public-api';

describe('ERP application sign-in', () => {
  const company = { systemId: 'company-1', name: 'TECSA', code: 'TECSA' };
  const auth = { login: vi.fn(), selectCompany: vi.fn() };
  const idle = { start: vi.fn() };
  beforeEach(() => {
    vi.resetAllMocks();
    TestBed.configureTestingModule({ imports: [LoginPage], providers: [provideRouter([]),
      {provide: AuthService, useValue: auth}, {provide: IdleSessionService, useValue: idle},
      {provide: SessionService, useValue: {}},
      {provide: ApiErrorService, useValue: {toMessage: () => 'Invalid credentials.'}},
    ] });
  });
  const page = () => {
    const fixture = TestBed.createComponent(LoginPage);
    fixture.detectChanges();
    fixture.componentInstance.form.setValue({ email: 'owner@example.test', password: 'existing-password' });
    return fixture;
  };
  it('renders the original compact ERP form without SaaS registration or marketing content', () => {
    const fixture = page();
    expect(fixture.nativeElement.querySelector('.app-login-panel')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('input[autocomplete="current-password"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.app-login-story')).toBeNull();
    expect(fixture.nativeElement.querySelectorAll('a').length).toBe(0);
    expect(fixture.nativeElement.textContent).toContain('Enterprise ERP');
  });
  it('signs in through existing authentication then enters ERP without registering again', async () => {
    const fixture = page();
    auth.login.mockReturnValue(of({ user: {}, companies: [company], requiresCompanySelection: false }));
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture.componentInstance.login();
    expect(auth.login).toHaveBeenCalledWith({email:'owner@example.test',password:'existing-password'});
    expect(idle.start).toHaveBeenCalledOnce();
    expect(navigate).toHaveBeenCalledWith(['/']);
  });
  it('retains authorized company selection before entering ERP', () => {
    const fixture = page();
    auth.login.mockReturnValue(of({ user: {}, companies: [company], requiresCompanySelection: true }));
    fixture.componentInstance.login(); fixture.detectChanges();
    expect(idle.start).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('.app-company-choice').textContent).toContain('TECSA');
    auth.selectCompany.mockReturnValue(of({}));
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture.componentInstance.chooseCompany(company.systemId);
    expect(auth.selectCompany).toHaveBeenCalledWith(company.systemId);
    expect(idle.start).toHaveBeenCalledOnce();
  });
  it('prevents duplicate submission and renders asynchronous errors in zoneless Angular', async () => {
    const fixture = page();
    const request = new Subject(); auth.login.mockReturnValue(request);
    fixture.componentInstance.login(); fixture.componentInstance.login();
    expect(auth.login).toHaveBeenCalledOnce();
    await Promise.resolve();
    request.error(new Error('unavailable')); await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('Invalid credentials.');
    expect(idle.start).not.toHaveBeenCalled();
  });
});
