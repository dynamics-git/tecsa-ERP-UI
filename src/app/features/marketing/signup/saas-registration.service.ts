import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export interface SaasSignupRequest {
  email: string;
  code: string;
  name: string;
  password: string;
  password_confirmation: string;
  organization: string;
  company: string;
  country: string;
}

export interface SaasSignupResult {
  data: {
    organizationId: string;
    companyId: string;
    subscription: { status: string; trialEndsAt: string };
  };
}

/** Anonymous SaaS onboarding; the Laravel API owns verification and provisioning. */
@Injectable({ providedIn: 'root' })
export class SaasRegistrationService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/v1/saas/registration';

  requestCode(email: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(this.base + '/request-code', { email });
  }

  verifyCode(email: string, code: string): Observable<{ verified: boolean }> {
    return this.http.post<{ verified: boolean }>(this.base + '/verify-code', { email, code });
  }

  complete(details: SaasSignupRequest): Observable<SaasSignupResult> {
    return this.http.post<SaasSignupResult>(this.base + '/complete', details);
  }
}
