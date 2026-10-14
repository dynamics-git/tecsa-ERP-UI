import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { SessionService } from './session.service';

/**
 * TecSA Laravel issues user-bound Sanctum tokens.
 * No development backdoor or browser-side client_credentials exchange is permitted.
 */
@Injectable({ providedIn: 'root' })
export class ApiAuthService {
  constructor(private readonly session: SessionService) {}

  getToken(): Observable<string> {
    const token = this.session.AccessToken;
    return token ? of(token) : throwError(() => new Error('Sign in to access TecSA ERP.'));
  }
}
