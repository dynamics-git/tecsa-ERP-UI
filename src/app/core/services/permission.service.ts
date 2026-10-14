import { Injectable } from '@angular/core';
import { SessionService } from './session.service';

@Injectable({
  providedIn: 'root'
})
export class PermissionService {
  constructor(private readonly sessionService: SessionService) {}

  isSuperAdmin(): boolean {
    return this.sessionService.SuperAdmin;
  }

  hasPermission(permissionKey?: string): boolean {
    if (!permissionKey) {
      return true;
    }

    if (this.isSuperAdmin()) {
      return true;
    }

    const permissions = this.sessionService.Permissions;

    if (!permissions.length) {
      return false;
    }

    const normalizedPermissionKey = this.normalize(permissionKey);

    return permissions.some((permission) => {
      const objectName = this.readPermissionValue(permission, 'ObjectName');
      const pageName = this.readPermissionValue(permission, 'PageName');
      const canRead = this.readPermissionFlag(permission, 'ReadPermission');

      return canRead && (
        this.normalize(objectName) === normalizedPermissionKey ||
        this.normalize(pageName) === normalizedPermissionKey
      );
    });
  }

  canView(pageId?: string): boolean {
    if (!pageId) {
      return true;
    }

    if (this.isSuperAdmin()) {
      return true;
    }

    const permissions = this.sessionService.Permissions;

    if (!permissions.length) {
      return false;
    }

    const normalizedPageId = this.normalize(pageId);

    return permissions.some((permission) => {
      const declaredPageId = this.readPermissionValue(permission, 'pageId');
      const declaredPageIdPascal = this.readPermissionValue(permission, 'PageId');
      const canRead = this.readPermissionFlag(permission, 'ReadPermission');

      return canRead && (
        this.normalize(declaredPageId) === normalizedPageId ||
        this.normalize(declaredPageIdPascal) === normalizedPageId
      );
    });
  }

  private readPermissionValue(permission: unknown, key: string): string {
    if (permission && typeof permission === 'object' && key in permission) {
      const record = permission as Record<string, unknown>;
      const value = record[key];
      return value === undefined || value === null ? '' : String(value);
    }

    return '';
  }

  private readPermissionFlag(permission: unknown, key: string): boolean {
    const value = this.readPermissionValue(permission, key);
    return value === 'true' || value === 'True' || value === 'Yes' || value === '1' || value === 'Full';
  }

  private normalize(value: string): string {
    return value
      .trim()
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .toUpperCase();
  }
}
