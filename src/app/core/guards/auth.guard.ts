import { UnsavedChangesService } from '../../platform/public-api';
import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateChildFn, CanActivateFn, Router, RouterStateSnapshot } from '@angular/router';
import { PermissionService } from '../services/permission.service';
import { SessionService } from '../services/session.service';

const canActivate = (route: ActivatedRouteSnapshot, _state: RouterStateSnapshot) => {
  const sessionService = inject(SessionService);
  const permissionService = inject(PermissionService);
  const router = inject(Router);

  if (sessionService.isSessionValid()) {
    const pageId = route.data?.['pageId'];
    if (typeof pageId === 'string' && pageId.trim().length && !permissionService.canView(pageId)) {
      return router.createUrlTree(['/']);
    }

    return true;
  }

  return router.createUrlTree(['/auth/login']);
};

export const authGuard: CanActivateFn = canActivate;
export const authChildGuard: CanActivateChildFn = canActivate;

export const guestGuard: CanActivateFn = () => {
  const sessionService = inject(SessionService);
  const router = inject(Router);

  if (sessionService.isSessionValid()) {
    return router.createUrlTree(['/']);
  }

  return true;
};

export const unsavedChangesGuard: CanActivateChildFn = () => !inject(SessionService).isSessionValid() || inject(UnsavedChangesService).canLeave();
