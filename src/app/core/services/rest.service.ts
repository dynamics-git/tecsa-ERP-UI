import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, Observable, of, switchMap, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SessionService } from './session.service';

export type RestRequestOptions = {
  suppressGlobalErrorDialog?: boolean;
  ifMatch?: string;
};

@Injectable({
  providedIn: 'root'
})
export class RestService {
  constructor(
    private readonly http: HttpClient,
    private readonly sessionService: SessionService
  ) {}

  get(endpoint: string, options?: RestRequestOptions): Observable<unknown> {
    if (!environment.apiBaseUrl) {
      return throwError(() => new Error('API base URL is not configured'));
    }

    return this.getAuthorizationToken().pipe(
      switchMap((token) => this.http.get(this.buildUrl(endpoint), {
        headers: this.createHeaders(token)
      })),
      catchError((error: HttpErrorResponse) => this.handleError(error, options))
    );
  }

  post(endpoint: string, body: unknown, options?: RestRequestOptions): Observable<unknown> {
    if (!environment.apiBaseUrl) {
      return throwError(() => new Error('API base URL is not configured'));
    }

    return this.getAuthorizationToken().pipe(
      switchMap((token) => this.http.post(this.buildUrl(endpoint), body, {
        headers: this.createHeaders(token)
      })),
      catchError((error: HttpErrorResponse) => this.handleError(error, options))
    );
  }

  put(endpoint: string, body: unknown, options?: RestRequestOptions): Observable<unknown> {
    if (!environment.apiBaseUrl) {
      return throwError(() => new Error('API base URL is not configured'));
    }

    return this.getAuthorizationToken().pipe(
      switchMap((token) => this.http.put(this.buildUrl(endpoint), body, {
        headers: this.requestHeaders(token, options)
      })),
      catchError((error: HttpErrorResponse) => this.handleError(error, options))
    );
  }

  patch(endpoint: string, body: unknown, ifMatchKey?: string, options?: RestRequestOptions): Observable<unknown> {
    if (!environment.apiBaseUrl) {
      return throwError(() => new Error('API base URL is not configured'));
    }

    return this.getAuthorizationToken().pipe(
      switchMap((token) => this.http.patch(this.buildUrl(endpoint), body, {
        headers: this.requestHeaders(token, { ...options, ifMatch: ifMatchKey })
      })),
      catchError((error: HttpErrorResponse) => this.handleError(error, options))
    );
  }

  delete(endpoint: string, options?: RestRequestOptions): Observable<unknown> {
    if (!environment.apiBaseUrl) {
      return throwError(() => new Error('API base URL is not configured'));
    }

    return this.getAuthorizationToken().pipe(
      switchMap((token) => this.http.delete(this.buildUrl(endpoint), {
        headers: this.requestHeaders(token, options)
      })),
      catchError((error: HttpErrorResponse) => this.handleError(error, options))
    );
  }

  private buildUrl(endpoint: string): string {
    const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const base = environment.apiBaseUrl.replace(/\/$/, '');
    // The Laravel API scopes records by /companies/{companyId}/, not companies(id).
    if (/^\/companies(?:\/|\?|$)/.test(normalizedEndpoint)) {
      return `${base}${normalizedEndpoint}`;
    }
    const companyId = this.sessionService.Company;
    if (!companyId) {
      throw new Error('Select an authorized company before accessing ERP data.');
    }
    return `${base}/companies/${encodeURIComponent(companyId)}${normalizedEndpoint}`;
  }

  private getAuthorizationToken(): Observable<string> {
    const token = this.sessionService.AccessToken;
    return token ? of(token) : throwError(() => new Error('Sign in to access TecSA ERP.'));
  }

  private createHeaders(token: string): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    });
  }

  private requestHeaders(token: string, options?: RestRequestOptions): HttpHeaders {
    const headers = this.createHeaders(token);
    return options?.ifMatch ? headers.set('If-Match', options.ifMatch) : headers;
  }

  private handleError(error: HttpErrorResponse, options?: RestRequestOptions): Observable<never> {
    if (error.status === 401) {
      this.sessionService.logout('unauthorized');
    }

    if (!options?.suppressGlobalErrorDialog) {
      const message = error.error?.error?.message || error.error?.message || error.message;
      console.error('REST request failed:', message);
    }

    return throwError(() => error);
  }
}
