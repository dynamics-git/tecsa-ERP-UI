import { Injectable, inject } from '@angular/core';
import { SessionService } from './session.service';

/** UI affordance restrictions for configured fields/actions. API checks remain server-owned. */
@Injectable({ providedIn: 'root' })
export class PermissionTargetService {
  private readonly session = inject(SessionService);

  allowed(
    pageId: string,
    surface: 'list'|'header'|'line'|'detail'|'factBox'|'worksheet'|'runModal',
    type: 'field'|'column'|'command'|'page',
    key: string,
    ability: 'canView'|'canEdit'|'canExecute',
  ): boolean {
    if (this.session.SuperAdmin) return true;
    const grant = this.session.Permissions.find(value => {
      if (!value || typeof value !== 'object') return false;
      const row = value as Record<string, unknown>;
      return row['pageId'] === pageId || row['PageId'] === pageId;
    }) as Record<string, unknown> | undefined;
    const targets = grant?.['targets'];
    if (!targets || typeof targets !== 'object' || Array.isArray(targets)) return true;
    const values = targets as Record<string, unknown>;
    const prefix = surface + '|' + type + '|';
    const entry = values[prefix + key] ??
      (type === 'command' ? values[prefix + (key.startsWith('cmd:') ? key.slice(4) : 'cmd:' + key)] : undefined);
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return true;
    return (entry as Record<string, unknown>)[ability] !== false;
  }
}
