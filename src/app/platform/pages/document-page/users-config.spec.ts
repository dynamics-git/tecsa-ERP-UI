import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { firstValueFrom, of } from 'rxjs';
import { DocumentPage } from '../../../platform/pages/document-page/document-page';
import { DATA_REST_SERVICE, DataSourceService } from '../../../platform/data/data-source.service';
import { RecordCollaborationService } from '../../../platform/data/record-collaboration.service';
import { SessionService } from '../../../core/services/session.service';
import { providePlatformGovernance } from '../../../core/providers/platform-governance.provider';
import { fieldIsHidden, fieldIsRequired, fieldIsReadonly } from '../../../platform/models/field-state';
import { usersHeaderConfig, usersListConfig } from '../../../features/administration/users/users.config';

afterEach(() => { vi.restoreAllMocks(); TestBed.resetTestingModule(); });

describe('Users configuration through shared core', () => {
  it.each([true, false])('edits saved users through shared save; autoSave=%s', async autoSave => {
    const user = {systemId: 'user-1', userName: 'verify', name: 'Before', email: 'verify@example.com', isActive: true, lastLoginAt: null, systemRowVersion: 1};
    const patch = vi.fn((_path: string, body: Record<string, unknown>) => of({data: {...user, ...body, systemRowVersion: 2}}));
    TestBed.configureTestingModule({imports: [DocumentPage], providers: [provideRouter([]), ...providePlatformGovernance(), {provide: DATA_REST_SERVICE, useValue: {get: () => of({data: user}), patch, post: vi.fn(), delete: () => of(null)}}]});
    TestBed.inject(SessionService).SuperAdmin = true;
    const f = TestBed.createComponent(DocumentPage);
    f.componentRef.setInput('pageId', 'users');
    f.componentRef.setInput('documentOnly', true);
    f.componentRef.setInput('initialRecord', user);
    f.componentRef.setInput('listConfig', {...usersListConfig, autoSave});
    f.componentRef.setInput('headerConfig', usersHeaderConfig);
    f.detectChanges(); await f.whenStable();
    await vi.waitFor(() => expect(f.componentInstance.popupLoading).toBe(false));
    f.componentInstance.handleInlineAction({actionKey: 'header:changed', payload: {fieldKey: 'name', value: 'Edited', previousValue: 'Before'}});
    if (!autoSave) {
      expect(patch).not.toHaveBeenCalled();
      f.componentInstance.handleInlineAction({actionKey: 'cmd:save'});
    }
    await vi.waitFor(() => expect(patch).toHaveBeenCalledOnce());
    expect(patch.mock.calls[0]).toEqual(['/users/user-1', {name: 'Edited'}, '"1"']);
    expect(f.componentInstance.inlineDocumentWindowConfig?.headerData?.['systemRowVersion']).toBe(2);
    expect(f.componentInstance.hasUnsavedChanges).toBe(false);
    f.destroy();
  });

  it('requires and masks the draft password and excludes it from saved user editing and lists', async () => {
    const password = usersHeaderConfig.sections.flatMap(s => s.fields).find(f => f.key === 'password')!;
    expect(password.type).toBe('password');
    expect(fieldIsRequired(password, {})).toBe(true);
    expect(fieldIsHidden(password, {})).toBe(false);
    expect(fieldIsRequired(password, {systemId: 'saved'})).toBe(false);
    expect(fieldIsHidden(password, {systemId: 'saved'})).toBe(false);
    expect(fieldIsReadonly(password, {systemId: 'saved'})).toBe(true);
    expect(password.requiredWhen).toBeUndefined();
    expect(password.hiddenWhen).toBeUndefined();
    expect(usersListConfig.dataSurface!.columns.filter(c => !c.hidden).map(c => c.field ?? c.id)).not.toContain('password');
    const post = vi.fn((_path: string, body: Record<string, unknown>) => of({data: {systemId: 'created-user', userName: body['userName'], name: body['name'], email: body['email'], isActive: true, systemRowVersion: 1}}));
    TestBed.configureTestingModule({imports: [DocumentPage], providers: [provideRouter([]), ...providePlatformGovernance(), {provide: DATA_REST_SERVICE, useValue: {get: () => of({data: []}), post, patch: vi.fn(), delete: () => of(null)}}]});
    TestBed.inject(SessionService).SuperAdmin = true;
    const f = TestBed.createComponent(DocumentPage);
    f.componentRef.setInput('pageId', 'users'); f.componentRef.setInput('documentOnly', true);
    f.componentRef.setInput('initialRecord', {}); f.componentRef.setInput('listConfig', usersListConfig); f.componentRef.setInput('headerConfig', usersHeaderConfig);
    f.detectChanges(); await f.whenStable();
    for (const [fieldKey, value] of Object.entries({userName: 'verify', name: 'New User', email: 'verify@example.com'})) {
      f.componentInstance.handleInlineAction({actionKey: 'header:changed', payload: {fieldKey, value}});
    }
    expect(post).not.toHaveBeenCalled();
    expect(f.nativeElement.querySelector('input[type="password"]')).toBeTruthy();
    f.componentInstance.handleInlineAction({actionKey: 'header:changed', payload: {fieldKey: 'password', value: 'Verification123!'}});
    await vi.waitFor(() => expect(post).toHaveBeenCalledOnce());
    expect(post.mock.calls[0][0]).toBe('/users');
    expect(post.mock.calls[0][1]).toMatchObject({userName: 'verify', name: 'New User', email: 'verify@example.com', password: 'Verification123!'});
    expect(post.mock.calls[0][1]).not.toHaveProperty('lastLoginAt');
    f.destroy();
  });

  it('uses API filtering, sorting and paging and sends the record version on delete', async () => {
    const get = vi.fn((_path: string) => of({data: [], meta: {total: 0}}));
    const remove = vi.fn((_path: string, _version?: string) => of(null));
    TestBed.configureTestingModule({providers: [provideRouter([]), {provide: DATA_REST_SERVICE, useValue: {get, delete: remove}}]});
    TestBed.inject(SessionService).SuperAdmin = true;
    const source = TestBed.inject(DataSourceService);
    await firstValueFrom(source.loadList({...usersListConfig.dataSource, defaultFilter: 'isActive eq true', defaultSort: 'userName desc'}, {top: 10, skip: 10}));
    const url = new URL(get.mock.calls[0][0], 'http://test');
    expect(url.pathname).toBe('/users'); expect(url.searchParams.get('$filter')).toContain('isActive eq true');
    expect(url.searchParams.get('$orderby')).toBe('userName desc'); expect(url.searchParams.get('$top')).toBe('10'); expect(url.searchParams.get('$skip')).toBe('10');
    await firstValueFrom(source.delete(usersListConfig.dataSource, 'user-1', 3));
    expect(remove.mock.calls[0]).toEqual(['/users/user-1', '"3"']);
  });

  it('binds the common Notes and Attachments services to the selected user', () => {
    TestBed.configureTestingModule({providers: [provideRouter([]), {provide: DATA_REST_SERVICE, useValue: {get: () => of({data: []})}}]});
    vi.spyOn(TestBed.inject(SessionService), 'Company', 'get').mockReturnValue('company-1');
    const service = TestBed.inject(RecordCollaborationService);
    const context = {companyId: 'company-1', recordEndpoint: '/users/user-1'};
    expect(service.path(context, 'notes')).toBe('/companies/company-1/users/user-1/notes');
    expect(service.path(context, 'attachments')).toBe('/companies/company-1/users/user-1/attachments');
    expect(usersListConfig.factBox).toMatchObject({notes: true, attachments: true});
  });
});
