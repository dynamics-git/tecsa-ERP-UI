import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, EMPTY, Observable, throwError } from 'rxjs';
import { SessionService } from '../services/session.service';
import { environment } from '../../../environments/environment';

@Injectable()
export class HttpInterceptorService implements HttpInterceptor {
  constructor(private readonly sessionService: SessionService) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const token = this.sessionService.AccessToken;
    const base = (environment.authApiBaseUrl || environment.apiBaseUrl).replace(/\/$/, '');
    const isLogin = request.url === `${base}/auth/login`;
    const isErpApi = request.url.startsWith(`${base}/`) || request.url.startsWith(`${environment.apiBaseUrl.replace(/\/$/, '')}/`);
    const hasAuthorizationHeader = request.headers.has('Authorization');
    const requestWithToken = token && isErpApi && !isLogin && !hasAuthorizationHeader
      ? request.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`,
        },
      })
      : request;

    if (
      requestWithToken.url.includes('Microsoft.NAV') &&
      !this.sessionService.DefaultAccessCenter &&
      !this.sessionService.SuperAdmin
    ) {
      console.error('Access Center is blank in Users. Please contact your Administrator.');
      return EMPTY;
    }

    return next.handle(requestWithToken).pipe(
      catchError((error: unknown) => {
        if (!isLogin && this.isUnauthorized(error)) {
          this.sessionService.logout('unauthorized');
        }

        return throwError(() => error);
      })
    );
  }

  private isUnauthorized(error: unknown): boolean {
    return Boolean(error && typeof error === 'object' && 'status' in error && error.status === 401);
  }
}
