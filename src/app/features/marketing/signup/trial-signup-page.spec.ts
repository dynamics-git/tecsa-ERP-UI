import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TrialSignupPage } from './trial-signup-page';
import { SaasRegistrationService } from './saas-registration.service';

describe('SaaS signup and verified account provisioning', () => {
  let component: TrialSignupPage;
  const registration = {
    requestCode: vi.fn(() => of({ message: 'Verification sent' })),
    verifyCode: vi.fn(() => of({ verified: true })),
    complete: vi.fn(() => of({
      data: { organizationId: 'org', companyId: 'company',
        subscription: { status: 'trialing', trialEndsAt: '2026-11-16T00:00:00Z' } },
    })),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      imports: [TrialSignupPage],
      providers: [provideRouter([]), { provide: SaasRegistrationService, useValue: registration }],
    });
    component = TestBed.createComponent(TrialSignupPage).componentInstance;
  });

  it('requires verified email before proceeding to owner details', () => {
    component.next();
    expect(component.step).toBe(0);
    component.form.controls.email.setValue('invalid');
    component.next();
    expect(registration.requestCode).not.toHaveBeenCalled();
    component.form.controls.email.setValue('person@example.test');
    component.next();
    expect(registration.requestCode).toHaveBeenCalledWith('person@example.test');
    expect(component.step).toBe(0);
    component.form.controls.code.setValue('123456');
    component.next();
    expect(registration.verifyCode).toHaveBeenCalledWith('person@example.test', '123456');
    expect(component.step).toBe(1);
  });

  it('creates an account only after OTP, password and company details', () => {
    component.form.patchValue({ email: 'person@example.test', code: '123456' });
    component.next(); component.next();
    expect(component.step).toBe(1);

    component.form.patchValue({ name: 'Test Owner', password: 'strong-password-123', passwordConfirmation: 'wrong' });
    component.next();
    expect(component.step).toBe(1);
    component.form.controls.passwordConfirmation.setValue('strong-password-123');
    component.next();
    expect(component.step).toBe(2);
    component.next();
    expect(component.step).toBe(2);
    component.form.patchValue({ organization: 'Example Group', company: 'Example Company' });
    component.next();
    expect(component.step).toBe(3);
    component.next();
    expect(registration.complete).toHaveBeenCalledWith(expect.objectContaining({
      email: 'person@example.test', password: 'strong-password-123',
      organization: 'Example Group', company: 'Example Company', code: '123456',
    }));
    expect(component.registrationComplete).toBe(true);
    expect(component.form.controls.password.value).toBe('');
  });
});
