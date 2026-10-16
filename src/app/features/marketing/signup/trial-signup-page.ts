import { Component, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { SaasRegistrationService } from './saas-registration.service';

@Component({
  selector: 'app-trial-signup-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './trial-signup-page.html',
  styleUrl: './trial-signup-page.scss',
})
export class TrialSignupPage {
  private readonly formBuilder = inject(FormBuilder);
  private readonly registration = inject(SaasRegistrationService);

  readonly form = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
    name: ['', [Validators.required, Validators.maxLength(150)]],
    password: ['', [Validators.required, Validators.minLength(12)]],
    passwordConfirmation: ['', [Validators.required]],
    organization: ['', [Validators.required, Validators.maxLength(150)]],
    company: ['', [Validators.required, Validators.maxLength(150)]],
    country: ['Malaysia', [Validators.required]],
  });

  readonly stages = ['Your email', 'About you', 'Your business', 'Create account'];
  step = 0;
  registrationComplete = false;
  busy = false;
  errorMessage = '';
  codeRequestedFor = '';
  verifiedEmail = '';
  trialEndsAt = '';
  platformPending = false;

  back(): void {
    if (this.busy || this.registrationComplete) return;
    this.errorMessage = '';
    this.step = Math.max(0, this.step - 1);
  }

  next(): void {
    if (this.busy || this.registrationComplete) return;
    this.errorMessage = '';
    if (this.step === 0) {
      this.advanceEmail();
      return;
    }
    if (this.step === 1) {
      this.form.controls.name.markAsTouched();
      this.form.controls.password.markAsTouched();
      this.form.controls.passwordConfirmation.markAsTouched();
      if (this.form.controls.name.invalid || this.form.controls.password.invalid
        || this.form.controls.passwordConfirmation.invalid) return;
      if (this.form.controls.password.value !== this.form.controls.passwordConfirmation.value) {
        this.errorMessage = 'Your passwords do not match.';
        return;
      }
      this.step = 2;
      return;
    }
    if (this.step === 2) {
      for (const key of ['organization', 'company', 'country'] as const) {
        this.form.controls[key].markAsTouched();
      }
      if (this.form.controls.organization.invalid || this.form.controls.company.invalid
        || this.form.controls.country.invalid) return;
      this.step = 3;
      return;
    }
    this.finishRegistration();
  }

  private advanceEmail(): void {
    const email = this.form.controls.email.value.trim().toLowerCase();
    this.form.controls.email.markAsTouched();
    if (this.form.controls.email.invalid) return;

    if (this.codeRequestedFor !== email) {
      this.codeRequestedFor = '';
      this.verifiedEmail = '';
      this.form.controls.code.reset();
      this.busy = true;
      this.registration.requestCode(email).pipe(finalize(() => this.busy = false)).subscribe({
        next: () => { this.codeRequestedFor = email; },
        error: (error: unknown) => { this.errorMessage = this.toError(error); },
      });
      return;
    }

    this.form.controls.code.markAsTouched();
    if (this.form.controls.code.invalid) return;
    this.busy = true;
    this.registration.verifyCode(email, this.form.controls.code.value)
      .pipe(finalize(() => this.busy = false)).subscribe({
        next: ({ verified }) => {
          if (verified) {
            this.verifiedEmail = email;
            this.step = 1;
          } else {
            this.errorMessage = 'Email verification failed.';
          }
        },
        error: (error: unknown) => { this.errorMessage = this.toError(error); },
      });
  }

  resendCode(): void {
    if (this.busy) return;
    this.codeRequestedFor = '';
    this.advanceEmail();
  }

  private finishRegistration(): void {
    const v = this.form.getRawValue();
    if (!this.verifiedEmail || this.verifiedEmail !== v.email.trim().toLowerCase()) {
      this.errorMessage = 'Please verify your email again.';
      this.step = 0;
      return;
    }
    if (this.form.invalid || v.password !== v.passwordConfirmation) {
      this.errorMessage = 'Please check all registration details.';
      return;
    }

    this.busy = true;
    this.registration.complete({
      email: this.verifiedEmail, code: v.code, name: v.name.trim(),
      password: v.password, password_confirmation: v.passwordConfirmation,
      organization: v.organization.trim(), company: v.company.trim(), country: v.country,
    }).pipe(finalize(() => this.busy = false)).subscribe({
      next: response => {
        this.trialEndsAt = response.data.subscription.trialEndsAt;
        this.platformPending = response.data.platformStatus !== 'synced';
        this.registrationComplete = true;
        this.form.controls.password.reset();
        this.form.controls.passwordConfirmation.reset();
        this.form.controls.code.reset();
      },
      error: (error: unknown) => { this.errorMessage = this.toError(error); },
    });
  }

  private toError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const body = error.error as { error?: { message?: string }; message?: string };
      return body?.error?.message ?? body?.message ??
        (error.status === 0 ? 'Could not connect to TecSA ERP. Please try again.' : 'Registration could not be completed.');
    }
    return 'Registration could not be completed.';
  }
}
