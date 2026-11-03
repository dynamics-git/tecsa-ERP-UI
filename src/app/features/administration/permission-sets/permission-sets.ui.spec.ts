import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getFeaturePageRoutes } from '../../../core/services/page-registry';
import { providePlatformGovernance } from '../../../core/providers/platform-governance.provider';
import { SessionService } from '../../../core/services/session.service';
import {
  DATA_REST_SERVICE,
  DocumentLines,
  MINIMUM_LINE_GRID_ROWS,
  ListPage,
  RunModalHost,
  RunModalLoadingService,
  RunModalService,
  RunModalStackService,
} from '../../../platform/public-api';
import { UsersPage } from '../users/users';
import { usersHeaderConfig, usersLineConfig, usersListConfig } from '../users/users.config';
import { pagePermissionsListConfig } from '../page-permissions/page-permissions.config';
import { PermissionSetsPage } from './permission-sets';
import {
  permissionSetsHeaderConfig,
  permissionSetsLineConfig,
  permissionSetsListConfig,
} from './permission-sets.config';

// Controlled UI fixtures only. These records are never seeded into the application or backend.
const user = { systemId: 'user-1', systemRowVersion: 1, userName: 'AMIT', name: 'Amit', email: 'amit@example.test', isActive: true };
const sets = [
  { systemId: 'set-1', systemRowVersion: 1, code: 'PURCHASING', name: 'Purchasing', description: 'Purchase access', assignable: true, isActive: true, isSystem: false },
  { systemId: 'set-2', systemRowVersion: 1, code: 'READONLY', name: 'Read only', description: '', assignable: true, isActive: true, isSystem: true },
];
const companies = [
  { systemId: 'company-a', name: 'Company A', code: 'A' },
  { systemId: 'company-b', name: 'Company B', code: 'B' },
];
const assignments = [
  { systemId: 'assignment-a', userName: user.userName, permissionSetCode: 'PURCHASING', companyCode: 'A', isActive: true },
  { systemId: 'assignment-b', userName: user.userName, permissionSetCode: 'READONLY', companyCode: 'B', isActive: true },
];
const permissions = [{ systemId: 'permission-1', systemRowVersion: 1, permissionSetCode: 'PURCHASING', resource: 'purchase_requisitions', canRead: true, canCreate: true, canModify: false, canDelete: false, canExecute: false }];

describe('Permission module config-driven UI review', () => {
  let writes: ReturnType<typeof vi.fn>;
  let reads: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    writes = vi.fn(() => of({}));
    const collection = (data: unknown[]) => of({ data: structuredClone(data), meta: { total: data.length } });
    const get = reads = vi.fn((endpoint: string) => {
      if (endpoint.startsWith('/userPermissionSets')) return collection(assignments);
      if (endpoint.startsWith('/permissionResources')) return collection([{resource: 'purchase_requisitions'}]);
      if (endpoint.startsWith('/permissionSources')) return collection([{name: 'users'}]);
      if (endpoint.includes('/pagePermissions')) return collection([]);
      if (endpoint.startsWith('/permissionSetPermissions')) return collection(decodeURIComponent(endpoint).includes('READONLY') ? [] : permissions);
      if (endpoint.startsWith('/companyUsers')) return collection([]);
      if (endpoint.startsWith('/permissionSets/set-1')) return of({ data: structuredClone(sets[0]) });
      if (endpoint.startsWith('/permissionSets/set-2')) return of({ data: structuredClone(sets[1]) });
      if (endpoint.startsWith('/permissionSets')) return collection(decodeURIComponent(endpoint).replace(/\+/g, ' ').includes("code eq 'PURCHASING'") ? [sets[0]] : sets);
      if (endpoint.startsWith('/companies') || endpoint.startsWith('/permissionCompanies')) return collection(companies);
      if (endpoint.startsWith('/users/user-1')) return of({ data: structuredClone(user) });
      if (endpoint.startsWith('/users')) return collection([user]);
      throw new Error('Unexpected UI read: ' + endpoint);
    });
    TestBed.configureTestingModule({
      imports: [RunModalHost, UsersPage, PermissionSetsPage],
      providers: [
        provideRouter([]), ...providePlatformGovernance(),
        { provide: DATA_REST_SERVICE, useValue: { get, post: writes, put: writes, patch: writes, delete: writes } },
      ],
    });
    TestBed.inject(SessionService).SuperAdmin = true;
  });
  afterEach(() => TestBed.resetTestingModule());

  async function open(pageId: string, record: Record<string, unknown>) {
    const fixture = TestBed.createComponent(RunModalHost);
    fixture.detectChanges();
    expect(await TestBed.inject(RunModalService).open({ pageId, target: 'entry', context: { headerData: record } })).toBe(true);
    fixture.detectChanges();
    await fixture.whenStable();
    await vi.waitFor(() => expect(TestBed.inject(RunModalLoadingService).isAnyLoading()).toBe(false));
    fixture.detectChanges();
    return fixture;
  }

  it('keeps the existing Users identity and fields, with assignments declared as owned lines', () => {
    expect(usersListConfig).toMatchObject({ pageId: 'users', dataSource: { endpoint: '/users', keyField: 'systemId' }, menu: { route: '/users' } });
    expect(usersHeaderConfig.sections.flatMap(section => section.fields).map(field => field.key)).toEqual(['userName', 'name', 'email', 'password', 'isActive', 'lastLoginAt']);
    expect(usersLineConfig.dataSource).toMatchObject({endpoint: '/userPermissionSets', keyField: 'systemId', headerPKProp: 'userName', lineFKProp: 'userName'});
    expect(usersLineConfig.dataSource.navigation).toBeUndefined();
    expect(usersLineConfig.columns.find(column => column.id === 'companyCode')).toMatchObject({ type: 'lookup', lookup: { endpoint: '/permissionCompanies' } });
    expect(getFeaturePageRoutes().find(route => route.path === 'permission-sets')?.component).toBe(PermissionSetsPage);
  });

  it('uses standard autosave for page rules and honours the mapped Permission Set over a selected resource line', async () => {
    expect(pagePermissionsListConfig.autoSave).toBeUndefined();
    expect(pagePermissionsListConfig.commands?.some(command => command.actionKey === 'cmd:save')).not.toBe(true);
    const command = permissionSetsHeaderConfig.toolbarButtons.find(command => command.actionKey === 'cmd:page-permissions')!;
    const request = {
      pageId: command.runModalPageId!, target: 'entry' as const,
      context: {headerData: structuredClone(sets[0]), activeLine: structuredClone(permissions[0]), recordMappingComplete: true},
    };
    const host = TestBed.createComponent(RunModalHost);
    host.detectChanges();
    expect(await TestBed.inject(RunModalService).open(request)).toBe(true);
    host.detectChanges(); await host.whenStable();
    await vi.waitFor(() => expect(TestBed.inject(RunModalLoadingService).isAnyLoading()).toBe(false));
    host.detectChanges();
    expect(reads.mock.calls.some(([endpoint]) => String(endpoint).startsWith('/pagePermissions') && decodeURIComponent(String(endpoint)).replace(/\+/g, ' ').includes("permissionSetCode eq 'PURCHASING'"))).toBe(true);
    expect(reads.mock.calls.some(([endpoint]) => String(endpoint).includes('permission-1/pagePermissions'))).toBe(false);
    expect(host.nativeElement.textContent).not.toMatch(/(?:^|\s)Save(?:\s|$)/);
    host.destroy();
  });

  it('renders user header and company-specific permission assignments in the same configured card', async () => {
    const fixture = await open('users', user);
    const page = fixture.debugElement.query(By.directive(UsersPage));
    expect(page).not.toBeNull();
    const text = page.nativeElement.textContent;
    expect(text).toContain('Delete Line');
    expect(text).toContain('Refresh Lines');
    expect(text).toContain('Open Permission Set');
    const editor = page.query(By.directive(DocumentLines)).componentInstance as DocumentLines;
    expect(editor.rows.filter(row => row['systemId'])).toHaveLength(2);
    expect(editor.rows.filter(row => row['systemId']).map(row => row['companyCode'])).toEqual(['A', 'B']);
    expect(editor.lookupDisplay(usersLineConfig.columns[0], editor.rows[0])).toBe('PURCHASING');
    expect(editor.lookupDisplay(usersLineConfig.columns[1], editor.rows[0])).toBe('Purchasing');
    expect(editor.lookupDisplay(usersLineConfig.columns[2], editor.rows[0])).toBe('Company A');
    expect(writes).not.toHaveBeenCalled();
    fixture.destroy();
  });

  it('autosaves a resource checkbox through ordinary line PATCH without a page save override', async () => {
    writes.mockImplementation((_endpoint: string, payload: any) => of({data: {...permissions[0], ...payload, systemRowVersion: 2}}));
    const fixture = await open('permission-sets', sets[0]);
    const page = fixture.debugElement.query(By.directive(PermissionSetsPage));
    const editor = page.query(By.directive(DocumentLines)).componentInstance as DocumentLines;
    expect(editor.rows[0]['resource']).toBe('purchase_requisitions');
    const checkboxes = [...page.nativeElement.querySelectorAll('app-document-lines tbody tr:first-child input[type="checkbox"]')] as HTMLInputElement[];
    expect(checkboxes.slice(1).map(input => input.checked)).toEqual([true, true, false, false, false]);
    expect(checkboxes.slice(1).every(input => !input.disabled)).toBe(true);
    expect(page.nativeElement.textContent).not.toContain('Update Permissions');
    expect(writes).not.toHaveBeenCalled();
    checkboxes[3].click();
    fixture.detectChanges();
    await vi.waitFor(() => expect(writes).toHaveBeenCalledWith('/permissionSetPermissions/permission-1', expect.objectContaining({canModify: true}), '"1"'));
    expect(writes.mock.calls.some(([url]) => String(url).includes('/permissions'))).toBe(false);
    fixture.destroy();
  });

  it('opens the same Permission Set card from an assignment and retains the parent selection on return', async () => {
    const fixture = await open('users', user);
    const parent = fixture.debugElement.query(By.directive(UsersPage));
    const editor = parent.query(By.directive(DocumentLines)).componentInstance as DocumentLines;
    (parent.nativeElement.querySelector('app-document-lines .row-pointer') as HTMLButtonElement).click();
    fixture.detectChanges();
    const button = [...parent.nativeElement.querySelectorAll('button')].find((element: any) => element.textContent.trim() === 'Open Permission Set') as HTMLButtonElement;
    expect(button.disabled).toBe(false);
    button.click();
    fixture.detectChanges();
    await fixture.whenStable();
    await vi.waitFor(() => expect(TestBed.inject(RunModalLoadingService).isAnyLoading()).toBe(false));
    fixture.detectChanges();
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(fixture.debugElement.query(By.directive(PermissionSetsPage)), TestBed.inject(RunModalService).getLastOpenFailureReason()).not.toBeNull();
    });
    const child = fixture.debugElement.query(By.directive(PermissionSetsPage));
    expect(child).not.toBeNull();
    expect(reads.mock.calls.some(([url]) => String(url).startsWith('/permissionSets?') && decodeURIComponent(String(url)).replace(/\+/g, ' ').includes("code eq 'PURCHASING'"))).toBe(true);
    expect(child.query(By.directive(ListPage)).componentInstance.inlineDocumentWindowConfig.headerData.systemId).toBe('set-1');
    const stack = TestBed.inject(RunModalStackService);
    let entries: any[] = [];
    const subscription = stack.stack$.subscribe(value => entries = value);
    await fixture.componentInstance.closePopup(entries.at(-1));
    fixture.detectChanges();
    expect(parent.nativeElement.isConnected).toBe(true);
    expect(editor.activeRowIndex).toBe(0);
    expect(editor.rows[0]['systemId']).toBe('assignment-a');
    expect(writes).not.toHaveBeenCalled();
    subscription.unsubscribe();
    fixture.destroy();
  });

  it('declares PR-style business relationships and core autosave in every permission config', () => {
    expect(permissionSetsHeaderConfig.sections[0].fields.map(field => field.key)).toEqual(['code', 'name', 'description', 'assignable', 'isActive', 'isSystem']);
    expect(permissionSetsLineConfig.columns.map(column => column.id)).toEqual(['resource', 'canRead', 'canCreate', 'canModify', 'canDelete', 'canExecute']);
    expect(permissionSetsListConfig.autoSave).toBeUndefined();
    expect(permissionSetsLineConfig.dataSource).toMatchObject({endpoint: '/permissionSetPermissions', keyField: 'systemId', headerPKProp: 'code', lineFKProp: 'permissionSetCode'});
    expect(permissionSetsLineConfig.dataSource.navigation).toBeUndefined();
    expect(permissionSetsHeaderConfig.toolbarButtons.find(command => command.actionKey === 'cmd:save')).toBeUndefined();
    expect(usersLineConfig.toolbarButtons![0].runModalRecord).toEqual({source: 'activeLine', fields: {code: 'permissionSetCode'}});
    expect(permissionSetsHeaderConfig.toolbarButtons.find(command => command.runModalPageId === 'page-permissions')).toBeDefined();
    expect(usersLineConfig.toolbarButtons!.map(command => command.actionKey)).toEqual(['cmd:open-permission-set']);
    expect(permissionSetsLineConfig.toolbarButtons).toBeUndefined();
  });

  it('does not open an arbitrary card when a mapped business key is missing or ambiguous', async () => {
    const modal = TestBed.inject(RunModalService);
    for (const matches of [[], [sets[0], {...sets[0], systemId: 'duplicate'}]]) {
      reads.mockImplementationOnce(() => of({data: matches, meta: {total: matches.length}}));
      expect(await modal.open({pageId: 'permission-sets', target: 'entry',
        context: {recordMappingComplete: true, headerData: {code: 'PURCHASING'}}})).toBe(false);
      expect(modal.getLastOpenFailureReason()).toBe('related-record-missing');
    }
    expect(writes).not.toHaveBeenCalled();
  });

  it('shows an empty read-only permission grid without inventing an assignment or resource row', async () => {
    const fixture = await open('permission-sets', sets[1]);
    const page = fixture.debugElement.query(By.directive(PermissionSetsPage));
    const editor = page.query(By.directive(DocumentLines)).componentInstance as DocumentLines;
    expect(editor.rows).toEqual([]);
    expect(page.nativeElement.querySelectorAll('app-document-lines tbody tr.empty-grid-row')).toHaveLength(MINIMUM_LINE_GRID_ROWS);
    expect(page.nativeElement.querySelectorAll('app-document-lines tbody input, app-document-lines tbody button, app-document-lines tbody select')).toHaveLength(0);
    expect(writes).not.toHaveBeenCalled();
    fixture.destroy();
  });
});
