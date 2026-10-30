import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import { PageAccessService, PagePermissionRule } from './page-access.service';
import { SessionService } from './session.service';

describe('Shared page, button and field access', () => {
  let access: PageAccessService;
  let session: SessionService;
  const rule = (values: Partial<PagePermissionRule>): PagePermissionRule => ({
    pageId: 'sample', targetType: 'page', surface: 'header', targetKey: '*',
    canRead: true, canCreate: false, canModify: false, canDelete: false, canExecute: false, ...values,
  });
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({providers: [provideRouter([])]});
    session = TestBed.inject(SessionService);
    access = TestBed.inject(PageAccessService);
  });

  it('inherits existing data-driven behavior when no UI rule is declared', () => {
    expect(access.page('sample', 'Read')).toBe(true);
    expect(access.field('sample', 'header', 'name')).toEqual({visible: true, editable: true});
  });

  it('separates page operations, header/line buttons and header/line fields', () => {
    session.PagePermissions = [rule({canCreate: true}),
      rule({targetType: 'command', surface: 'line', targetKey: 'cmd:approve', canExecute: false}),
      rule({targetType: 'field', surface: 'header', targetKey: 'amount', canRead: false}),
      rule({targetType: 'field', surface: 'line', targetKey: 'amount', canRead: true, canModify: false})];
    expect(access.page('sample', 'Create')).toBe(true);
    expect(access.page('sample', 'Modify')).toBe(false);
    expect(access.allows('sample', 'command', 'line', 'cmd:approve', 'Execute')).toBe(false);
    expect(access.allows('sample', 'command', 'header', 'cmd:approve', 'Execute')).toBe(true);
    expect(access.field('sample', 'header', 'amount')).toEqual({visible: false, editable: false});
    expect(access.field('sample', 'line', 'amount')).toEqual({visible: true, editable: false});
  });

  it('uses positive union and clears the rules on logout', () => {
    session.PagePermissions = [rule({canRead: false}), rule({canRead: true, canModify: true})];
    expect(access.page('sample', 'Modify')).toBe(true);
    session.clearSessionData();
    expect(session.PagePermissions).toEqual([]);
    expect(session.CompanySuper).toBe(false);
  });

  it('keeps the selected-company SUPER bypass separate from global SUPER', () => {
    session.PagePermissions = [rule({canRead: false})];
    expect(access.page('sample', 'Read')).toBe(false);
    session.CompanySuper = true;
    expect(access.page('sample', 'Read')).toBe(true);
    expect(session.SuperAdmin).toBe(false);
  });
});
