import { Injectable } from '@angular/core';
import { SessionService } from './session.service';

export interface PagePermissionRule {
  pageId: string;
  targetType: 'page' | 'command' | 'field';
  surface: 'list' | 'header' | 'line' | 'detail' | 'factBox';
  targetKey: string;
  canRead: boolean;
  canCreate: boolean;
  canModify: boolean;
  canDelete: boolean;
  canExecute: boolean;
}

/** Additional UI grants never replace the published API's data permissions. */
@Injectable({ providedIn: 'root' })
export class PageAccessService {
  constructor(private readonly session: SessionService) {}

  allows(pageId: string, targetType: PagePermissionRule['targetType'], surface: string,
    targetKey: string, action: 'Read' | 'Create' | 'Modify' | 'Delete' | 'Execute'): boolean {
    if (this.session.SuperAdmin || this.session.CompanySuper) return true;
    const key = (value: string) => targetType === 'command' ? value.replace(/^cmd:/, '') : value;
    const rules = (this.session.PagePermissions ?? []).filter(rule => rule.pageId === pageId &&
      rule.targetType === targetType && rule.surface === surface && key(rule.targetKey) === key(targetKey));
    // A page without dedicated UI rules retains the existing API-driven behavior.
    return !rules.length || rules.some(rule => rule.canRead && rule[`can${action}`]);
  }

  page(pageId: string, action: 'Read' | 'Create' | 'Modify' | 'Delete' | 'Execute'): boolean {
    return this.allows(pageId, 'page', 'header', '*', action);
  }

  field(pageId: string, surface: string, key: string): { visible: boolean; editable: boolean } {
    return {
      visible: this.page(pageId, 'Read') && this.allows(pageId, 'field', surface, key, 'Read'),
      editable: this.allows(pageId, 'field', surface, key, 'Modify'),
    };
  }

  /** Display projections must not reveal hidden fields through record captions. */
  displayRecord(pageId: string, surface: string, value: unknown): unknown {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
    const keys = new Set((this.session.PagePermissions ?? []).filter(rule => rule.pageId === pageId &&
      rule.targetType === 'field' && rule.surface === surface).map(rule => rule.targetKey));
    const hidden = [...keys].filter(key => !this.field(pageId, surface, key).visible);
    if (!hidden.length) return value;
    const record = {...value as Record<string, unknown>};
    for (const key of hidden) delete record[key];
    return record;
  }
}
