import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, Observable, throwError, tap } from 'rxjs';
import { SessionService } from '../services/session.service';
import { WorkspaceContext } from '../services/workspace-context';
import { environment } from '../../../environments/environment';

@Injectable()
export class HttpInterceptorService implements HttpInterceptor {
  constructor(private readonly sessionService: SessionService, private readonly workspace: WorkspaceContext) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const token = this.sessionService.AccessToken;
    const base = environment.apiBaseUrl.replace(/\/$/, '');
    const isLogin = request.url === `${base}/auth/login`;
    const isSignup = request.url.startsWith(`${base}/saas/registration/`);
    const isApiRequest = request.url.startsWith(`${base}/`);
    const hasAuthorizationHeader = request.headers.has('Authorization');
    const requestWithToken = token && isApiRequest && !isLogin && !isSignup && !hasAuthorizationHeader
      ? request.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`,
        },
      })
      : request;

    return next.handle(requestWithToken.clone({url:this.workspace.apiUrl(requestWithToken.url,base)})).pipe(
      tap(event => {
        if (event instanceof HttpResponse && isApiRequest && !['GET', 'HEAD'].includes(request.method) &&
          /\/(?:permissionSets|permissionSetPermissions|userPermissionSets|pagePermissions|companyUsers)(?:\/|\?|$)/.test(request.url)) {
          this.sessionService.permissionRefreshRequested$.next();
        }
      }),
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
