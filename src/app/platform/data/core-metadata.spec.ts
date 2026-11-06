import { DynamicForm } from '../../shared/ui/dynamic-form/dynamic-form';
import { ListPage } from '../pages/list-page/list-page';
import { provideRouter } from '@angular/router';
import { paymentTermsListConfig } from '../../features/purchase-masters/payment-terms/payment-terms.config';
import { TestBed } from '@angular/core/testing';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { of, Subject } from 'rxjs';
import { DataSourceService, DATA_REST_SERVICE } from './data-source.service';
import { EntityContractService } from './entity-contract.service';
import { SessionService } from '../../core/services/session.service';
import { WorkspaceContext } from '../../core/services/workspace-context';
import { DocumentHydrationOrchestratorService } from './document-hydration-orchestrator.service';

const source = { endpoint: '/fixtures' };
afterEach(() => {
  TestBed.resetTestingModule();
  vi.useRealTimers();
});
describe('Configured shared Core CRUD without metadata discovery', () => {
  let data: DataSourceService;
  let session: {
    Company: string;
    UserId: string;
    AccessToken: string;
    Permissions: unknown[];
    SuperAdmin: boolean;
    permissionsLoaded$: Subject<boolean>;
  };
  let workspace: { slug: string };
  let get: ReturnType<typeof vi.fn>,
    post: ReturnType<typeof vi.fn>,
    patch: ReturnType<typeof vi.fn>,
    remove: ReturnType<typeof vi.fn>,
    put: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    session = {
      Company: 'A',
      UserId: 'one',
      AccessToken: 'token',
      Permissions: [],
      SuperAdmin: false,
      permissionsLoaded$: new Subject<boolean>(),
    };
    workspace = { slug: 'workspace-a' };
    get = vi.fn(() => of({data: []}));
    post = vi.fn(() => of({ data: { systemId: 'created', systemRowVersion: 1 } }));
    patch = vi.fn(() => of({ data: { systemId: 'created', systemRowVersion: 2 } }));
    remove = vi.fn(() => of(null));
    put = vi.fn(() => of({ data: { systemId: 'created', systemRowVersion: 2 } }));
    TestBed.configureTestingModule({
      imports: [ListPage, DynamicForm],
      providers: [
        provideRouter([]),
        { provide: SessionService, useValue: session },
        { provide: WorkspaceContext, useValue: workspace },
        { provide: DATA_REST_SERVICE, useValue: { get, post, patch, put, delete: remove } },
      ],
    });
    data = TestBed.inject(DataSourceService);
  });
  it('keeps explicit defaults without inferring null for unspecified fields', async () => {
    session.SuperAdmin = true;
    const fixture = TestBed.createComponent(ListPage);
    fixture.componentRef.setInput('listConfig', {...paymentTermsListConfig, dataSource: source});
    fixture.componentRef.setInput('headerConfig', {sections:[{id:'general',fields:[
      {key:'unset',label:'Unset',readonly:true},
      {key:'empty',label:'Empty',readonly:true,defaultValue:null},
      {key:'zero',label:'Zero',readonly:true,defaultValue:0},
      {key:'flag',label:'Flag',readonly:true,defaultValue:false},
      {key:'text',label:'Text',readonly:true,defaultValue:''},
    ]}]});
    fixture.componentRef.setInput('documentOnly',true);
    fixture.componentRef.setInput('initialRecord',{});
    fixture.detectChanges(); await fixture.whenStable();
    expect(fixture.componentInstance.headerConfig.sections[0].fields.map(field=>field.defaultValue))
      .toEqual([undefined,null,0,false,'']);
    expect(post).not.toHaveBeenCalled();
    fixture.destroy();
  });
  it('opens an ordinary configured page and autosaves first input without capability discovery', async () => {
    session.SuperAdmin = true;
    const fixture = TestBed.createComponent(ListPage);
    fixture.componentRef.setInput('listConfig', { ...paymentTermsListConfig, dataSource: source });
    fixture.componentRef.setInput('headerConfig', {
      sections: [
        {
          id: 'general',
          title: 'General',
          fields: [
            { key: 'code', label: 'Code' },
            { key: 'description', label: 'Description' },
            { key: 'amount', label: 'Amount' },
          ],
        },
      ],
    });
    fixture.componentRef.setInput('documentOnly', true);
    fixture.componentRef.setInput('initialRecord', {});
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const page = fixture.componentInstance;
    expect(post).not.toHaveBeenCalled();
    expect(page.headerConfig.sections[0].fields[0].readonlyAfterCreate).toBeUndefined();
    expect(get.mock.calls.some(([url]) => String(url).includes('/apiCapabilities'))).toBe(false);
    page.handleInlineAction({
      actionKey: 'header:changed',
      payload: { fieldKey: 'code', value: 'NEW', previousValue: '' },
    });
    await vi.waitFor(() => expect(post).toHaveBeenCalledTimes(1));
    expect(post.mock.calls[0][1]).toMatchObject({ code: 'NEW' });
    expect(get.mock.calls.some(([url]) => String(url).includes('/apiCapabilities'))).toBe(false);
    fixture.destroy();
  });
  for (const manual of [false, true])
    it('retains a header edit excluded by configuration in ' + (manual ? 'manual' : 'automatic') + ' save', async () => {
      session.SuperAdmin = true;
      const fixture = TestBed.createComponent(ListPage);
      fixture.componentRef.setInput('listConfig', { ...paymentTermsListConfig, autoSave: !manual, dataSource: { ...source, createFields: ['code'] } });
      fixture.componentRef.setInput('headerConfig', { sections: [{ id: 'general', fields: [
        { key: 'code', label: 'Code', defaultValue: 'A' }, { key: 'description', label: 'Description' },
      ] }] });
      fixture.componentRef.setInput('documentOnly', true);
      fixture.componentRef.setInput('initialRecord', {});
      fixture.detectChanges();
      await fixture.whenStable();
      const page = fixture.componentInstance;
      page.handleInlineAction({ actionKey: 'header:changed', payload: { fieldKey: 'description', value: 'Keep my edit', previousValue: null } });
      if (manual) expect(await page['saveEntry']()).toBe(false);
      await vi.waitFor(() => expect(page.inlineDocumentWindowConfig?.statusMessage?.tone).toBe('error'));
      expect(page.inlineDocumentWindowConfig?.statusMessage?.message).toContain('description');
      expect(page.inlineDocumentWindowConfig?.headerData?.['description']).toBe('Keep my edit');
      expect(page.hasUnsavedChanges).toBe(true);
      expect(post).not.toHaveBeenCalled();
      page.listConfig.dataSource.createFields = ['code', 'description'];
      if (manual) await page['saveEntry'](); else page['triggerDraftCreateIfReady']();
      await vi.waitFor(() => expect(post).toHaveBeenCalledTimes(1));
      expect(post.mock.calls[0][1]).toEqual({ code: 'A', description: 'Keep my edit' });
      fixture.destroy();
    });
  for (const persisted of [false, true])
    it('retains a direct line edit before ' + (persisted ? 'update' : 'create') + ' payload filtering', async () => {
      session.SuperAdmin = true;
      const fixture = TestBed.createComponent(ListPage);
      const page = fixture.componentInstance;
      page.listConfig = { ...paymentTermsListConfig, dataSource: { endpoint: '/headers' } };
      page.headerConfig = { dialogTitle: 'Fixture', toolbarButtons: [], sections: [] };
      page.lineConfig = { placement: { mode: 'end' }, toolbarButtons: [],
        dataSource: { ...source, createFields: ['code'], updateFields: ['code'] },
        columns: [{ id: 'code', label: 'Code' }, { id: 'description', label: 'Description' }],
      };
      const row = { code: 'A', description: 'Keep line edit', ...(persisted ? { systemId: 'line', systemRowVersion: 1 } : {}) };
      page['activeDocumentWindowConfig'] = { headerData: { systemId: 'header' }, lineRows: [row] };
      page['handleLineChanged']({ row, column: page.lineConfig.columns[1], value: row.description });
      expect(page['activeDocumentWindowConfig']?.statusMessage?.message).toContain('description');
      expect(page.hasUnsavedChanges).toBe(true);
      expect(row.description).toBe('Keep line edit');
      expect(page['unsavedFields'].get(row)?.has('description')).toBe(true);
      expect(post).not.toHaveBeenCalled();
      expect(patch).not.toHaveBeenCalled();
      fixture.destroy();
    });
  it('opens the setup page without waiting for capability discovery', async () => {
    const pending = new Subject<unknown>();
    get.mockImplementation((url: string) => url.endsWith('/apiCapabilities') ? pending : of({data:{systemId:'saved',code:'A',systemRowVersion:1}}));
    session.SuperAdmin = true;
    const fixture = TestBed.createComponent(ListPage);
    fixture.componentRef.setInput('listConfig',{...paymentTermsListConfig,pageType:'setup',dataSource:{...source,singleton:true}});
    fixture.componentRef.setInput('headerConfig',{sections:[{id:'general',title:'General',fields:[{key:'code',label:'Code'}]}]});
    fixture.componentRef.setInput('documentOnly',true);fixture.componentRef.setInput('initialRecord',{});fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.entry-header')).not.toBeNull();
    expect(get.mock.calls.some(([url]) => String(url).includes('/apiCapabilities'))).toBe(false);
    // Existing record loading can still lock the editor; metadata must not gate it.
    expect(post).not.toHaveBeenCalled();
    // Leave discovery unresolved to prove page loading does not depend on it.
    await vi.waitFor(()=>expect(fixture.componentInstance.inlineDocumentWindowConfig?.contentReady).toBe(true));
    expect(post).not.toHaveBeenCalled();fixture.destroy();
  });
  it('uses standard raw lookup identity in the existing form options', () => {
    const fixture = TestBed.createComponent(DynamicForm);
    const field = {
      key: 'choice',
      label: 'Choice',
      lookup: { endpoint: '/choices', displayField: 'code' },
    };
    fixture.componentRef.setInput('sections', [{ id: 'general', fields: [field] }]);
    fixture.componentRef.setInput('data', {
      __options_choice: [{ systemId: 23, code: 'Caption' }],
    });
    fixture.detectChanges();
    expect(fixture.componentInstance.getFieldOptions(field)[0].value).toBe(23);
    fixture.destroy();
  });
  it('defaults lookup identity to systemId and preserves raw custom numeric identities', async () => {
    get.mockReturnValue(
      of({ data: { systemId: 23, legacyId: 41, code: 'Caption', systemRowVersion: 1 } }),
    );
    const hydration = TestBed.inject(DocumentHydrationOrchestratorService);
    const result = await hydration.resolveHeaderLookups({ choice: 23 }, [
      { key: 'choice', label: 'Choice', lookup: { endpoint: '/choices', displayField: 'code' } },
    ]);
    const custom = await hydration.resolveHeaderLookups({ choice: 41 }, [
      {
        key: 'choice',
        label: 'Choice',
        lookup: { endpoint: '/custom', valueField: 'legacyId', displayField: 'code' },
      },
    ]);
    expect(custom['choice']).toBe(41);
    expect(result['choice']).toBe(23);
  });
});
