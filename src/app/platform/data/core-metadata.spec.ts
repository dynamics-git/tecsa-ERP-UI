import { fieldIsReadonly } from '../models/field-state';
import { DynamicForm } from '../../shared/ui/dynamic-form/dynamic-form';
import { ListPage } from '../pages/list-page/list-page';
import { provideRouter } from '@angular/router';
import { paymentTermsListConfig } from '../../features/purchase-masters/payment-terms/payment-terms.config';
import { TestBed } from '@angular/core/testing';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { firstValueFrom, of, Subject, throwError } from 'rxjs';
import { DataSourceService, DATA_REST_SERVICE } from './data-source.service';
import { EntityContractService, CoreMetadata } from './entity-contract.service';
import { SessionService } from '../../core/services/session.service';
import { WorkspaceContext } from '../../core/services/workspace-context';
import { DocumentHydrationOrchestratorService } from './document-hydration-orchestrator.service';

const source = { endpoint: '/fixtures' };
function metadata(): { data: CoreMetadata } {
  return {
    data: {
      contractVersion: '1.0',
      entities: {
        fixtures: {
          kind: 'generic',
          path: 'fixtures',
          endpoint: 'fixtures',
          key: 'systemId',
          fields: {
            code: {
              type: 'code',
              read: true,
              create: true,
              update: false,
              required: true,
              maxLength: 20,
            },
            description: { type: 'text', read: true, create: true, update: true, nullable: true },
            amount: {
              type: 'decimal',
              read: true,
              create: true,
              update: true,
              precision: 20,
              scale: 6,
              default: '0',
            },
            derived: { type: 'text', read: true, create: false, update: false },
          },
          operations: { read: true, create: true, update: true, delete: false },
        },
      },
      endpoints: [],
    },
  };
}
afterEach(() => {
  TestBed.resetTestingModule();
  vi.useRealTimers();
});
describe('Authenticated shared Core metadata contract', () => {
  let data: DataSourceService, contracts: EntityContractService;
  let session: {
    Company: string;
    UserId: string;
    AccessToken: string;
    Permissions: unknown[];
    SuperAdmin: boolean;
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
    };
    workspace = { slug: 'workspace-a' };
    get = vi.fn(() => of(metadata()));
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
    contracts = TestBed.inject(EntityContractService);
  });
  it('resolves defaults, nullable values and write flags without repeating page rules', async () => {
    expect(await firstValueFrom(data.loadCoreMetadata())).toBe(true);
    expect(get.mock.calls[0][0]).toContain('/apiCapabilities');
    expect(data.resolveSourceContract(source)).toMatchObject({
      keyField: 'systemId',
      supportsCreate: true,
      supportsUpdate: true,
      supportsDelete: false,
    });
    expect(data.resolveFieldContract(source, { key: 'code', label: 'Code' })).toMatchObject({
      valueType: 'code',
      required: true,
      readonlyAfterCreate: true,
      validation: { maxLength: 20 },
    });
    expect(
      data.resolveFieldContract(source, { key: 'description', label: 'Description' }).defaultValue,
    ).toBeNull();
    expect(data.resolveFieldContract(source, { key: 'amount', label: 'Amount' })).toMatchObject({
      valueType: 'decimal',
      defaultValue: '0',
      validation: { precision: 20, scale: 6 },
    });
    expect(data.resolveFieldContract(source, { key: 'derived', label: 'Derived' }).readonly).toBe(
      true,
    );
  });
  it('keeps update-only fields out of new-record editing without blocking ordinary creation', async () => {
    const contract = metadata();
    contract.data.entities['fixtures'].fields['later'] = {
      type: 'text',
      read: true,
      create: false,
      update: true,
      required: true,
    };
    get.mockReturnValue(of(contract));
    await firstValueFrom(data.loadCoreMetadata());
    const field = data.resolveFieldContract(source, { key: 'later', label: 'Later' });
    expect(field.required).toBe(false);
    expect(fieldIsReadonly(field, {})).toBe(true);
    expect(fieldIsReadonly(field, { systemId: 'saved' })).toBe(false);
  });
  it('retains explicit identity, conditional rules, lookup and presentation overrides', async () => {
    await firstValueFrom(data.loadCoreMetadata());
    const field = {
      key: 'code',
      label: 'Custom',
      required: false,
      readonlyAfterCreate: false,
      valueType: 'text' as const,
      validation: { maxLength: 8 },
      lookup: { endpoint: '/custom', valueField: 'legacyId', displayField: 'caption' },
    };
    expect(data.resolveFieldContract(source, field)).toMatchObject(field);
    const legacy = { ...source, addressStyle: 'odata' as const };
    expect(data.resolveSourceContract(legacy)).toEqual(legacy);
    expect(
      data.resolveSourceContract({ ...source, keyField: 'legacyId', supportsCreate: false }),
    ).toMatchObject({ keyField: 'legacyId', supportsCreate: false });
  });
  it('uses the declared keyed PUT contract without confusing the record systemId with its address', async () => {
    const contract = metadata();
    contract.data.entities['fixtures'].addressKey = 'code';
    contract.data.entities['fixtures'].updateMethod = 'PUT';
    get.mockReturnValue(of(contract));
    await firstValueFrom(data.loadCoreMetadata());
    expect(data.resolveSourceContract(source).keyField).toBe('code');
    expect(contracts.updateMethod(source)).toBe('PUT');
    await firstValueFrom(data.update(source, 'BUSINESS-KEY', { description: 'Kept' }, 1));
    expect(patch).not.toHaveBeenCalled();
    expect(put.mock.calls[0]).toEqual(['/fixtures/BUSINESS-KEY', { description: 'Kept' }, '"1"']);
  });
  it('preserves partial updates and rejects forbidden values without POST retry or omission', async () => {
    await firstValueFrom(data.loadCoreMetadata());
    const input = { description: 'keep me', derived: 'also keep me' };
    await expect(firstValueFrom(data.create(source, input))).rejects.toThrow('derived');
    expect(input).toEqual({ description: 'keep me', derived: 'also keep me' });
    expect(post).not.toHaveBeenCalled();
    await firstValueFrom(data.create(source, { code: 'A', description: 'value' }));
    expect(post).toHaveBeenCalledTimes(1);
    await firstValueFrom(data.update(source, 'created', { description: null }, 1));
    expect(patch.mock.calls[0].slice(1)).toEqual([{ description: null }, '"1"']);
    await expect(
      firstValueFrom(data.delete({ ...source, supportsDelete: true }, 'created', 2)),
    ).rejects.toThrow('does not support delete');
    expect(remove).not.toHaveBeenCalled();
  });
  it('rejects generic configured allowlist exclusions without losing the submitted edits', async () => {
    await firstValueFrom(data.loadCoreMetadata());
    const input = { code: 'A', description: 'Keep this edit' };
    await expect(firstValueFrom(data.create({ ...source, createFields: ['code'] }, input))).rejects.toThrow('description');
    await expect(firstValueFrom(data.update({ ...source, updateFields: [] }, 'created', { description: input.description }, 1))).rejects.toThrow('description');
    expect(post).not.toHaveBeenCalled();
    expect(patch).not.toHaveBeenCalled();
    expect(input).toEqual({ code: 'A', description: 'Keep this edit' });
    await firstValueFrom(data.create({ ...source, createFields: ['code', 'description'] }, input));
    expect(post).toHaveBeenCalledTimes(1);
    expect(post.mock.calls[0][1]).toEqual(input);
  });
  it('does not lose tracked edits to explicit allowlists when discovery is unavailable', async () => {
    get.mockReturnValue(throwError(() => new Error('Discovery unavailable')));
    expect(await firstValueFrom(data.loadCoreMetadata())).toBe(false);
    const input = { description: 'Retain this edit' };
    expect(() => data.assertEditedFields({ ...source, createFields: ['code'] }, 'create', input, ['description'])).toThrow('description');
    expect(() => data.assertEditedFields({ ...source, updateBlockedFields: ['description'] }, 'update', input, ['description'])).toThrow('description');
    expect(input.description).toBe('Retain this edit');
    expect(post).not.toHaveBeenCalled();
    expect(patch).not.toHaveBeenCalled();
  });
  it('checks generic server write rules before presentation overrides or omission rules', async () => {
    await firstValueFrom(data.loadCoreMetadata());
    data.resolveFieldContract(source, { key: 'derived', label: 'Derived', readonly: false });
    for (const config of [
      { ...source, createFields: ['description'] },
      { ...source, omitEmptyFields: ['derived'] },
    ]) {
      await expect(firstValueFrom(data.create(config, { description: 'Kept', derived: '' }))).rejects.toThrow('derived');
    }
    data.resolveFieldContract(source, { key: 'code', label: 'Code', readonlyAfterCreate: false });
    await expect(firstValueFrom(data.update({ ...source, updateBlockedFields: ['code'] }, 'created', { code: 'B' }, 1))).rejects.toThrow('code');
    expect(post).not.toHaveBeenCalled();
    expect(patch).not.toHaveBeenCalled();
  });
  it('uses domain methods instead of collaboration registry flags and never treats hints as an allowlist', async () => {
    const contract = metadata();
    contract.data.entities['fixtures'].kind = 'domain';
    contract.data.entities['fixtures'].operations = {
      read: true,
      create: false,
      update: false,
      delete: false,
    };
    contract.data.endpoints = [
      {
        path: '/api/v1/companies/{companyId}/fixtures',
        methods: ['POST'],
        type: 'write',
        inputFields: { code: { type: 'string' } },
      },
      {
        path: '/api/v1/companies/{companyId}/fixtures/{systemId}',
        methods: ['PATCH'],
        type: 'write',
      },
    ];
    get.mockReturnValue(of(contract));
    await firstValueFrom(data.loadCoreMetadata());
    expect(data.resolveSourceContract(source)).toMatchObject({
      supportsCreate: true,
      supportsUpdate: true,
      supportsDelete: false,
    });
    await firstValueFrom(data.create(source, { controllerSpecific: 'retained' }));
    expect(post.mock.calls[0][1]).toEqual({ controllerSpecific: 'retained' });
    expect(data.resolveFieldContract(source, { key: 'code', label: 'Code' })).toEqual({
      key: 'code',
      label: 'Code',
    });
  });
  it('keeps explicit nested parent identity separate from a document number', async () => {
    const contract = metadata();
    contract.data.entities['child'] = {
      ...contract.data.entities['fixtures'],
      path: 'fixtures/{parentId}/lines',
      endpoint: 'lines',
      parent: { entity: 'fixtures', parameter: 'parentId' },
    };
    get.mockReturnValue(of(contract));
    await firstValueFrom(data.loadCoreMetadata());
    const nested = {
      endpoint: '/lines',
      navigation: {
        parentEndpoint: '/fixtures',
        childCollection: 'lines',
        parentIdFields: ['systemId'],
      },
    };
    expect(data.resolveSourceContract(nested).keyField).toBe('systemId');
    expect(data.relation(nested, { systemId: 'raw-id', number: 'DOC-1' }).endpoint).toBe(
      '/fixtures/raw-id/lines',
    );
  });
  it('preserves current configs and writes when discovery fails or is unsupported', async () => {
    get.mockReturnValue(throwError(() => ({ status: 503 })));
    expect(await firstValueFrom(data.loadCoreMetadata())).toBe(false);
    expect(data.resolveSourceContract(source)).toEqual(source);
    await firstValueFrom(data.create(source, { existing: 'value' }));
    expect(post.mock.calls[0][1]).toEqual({ existing: 'value' });
    get.mockReturnValue(of({ data: { contractVersion: 'future' } }));
    expect(await firstValueFrom(data.loadCoreMetadata())).toBe(false);
  });
  it('drops expired metadata on outage and ignores metadata invalidated during its request', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-27T00:00:00Z'));
    await firstValueFrom(data.loadCoreMetadata());
    vi.setSystemTime(new Date('2026-10-27T00:01:00Z'));
    get.mockReturnValue(throwError(() => ({ status: 503 })));
    expect(await firstValueFrom(data.loadCoreMetadata())).toBe(false);
    expect(data.resolveSourceContract(source)).toEqual(source);
    const pending = new Subject<unknown>();
    get.mockReturnValue(pending);
    const result = firstValueFrom(data.loadCoreMetadata());
    data.invalidateReadCache();
    pending.next(metadata());
    pending.complete();
    expect(await result).toBe(false);
    expect(data.resolveSourceContract(source)).toEqual(source);
  });
  it('deduplicates discovery and rejects a late response from a different company', async () => {
    const pending = new Subject<unknown>();
    get.mockReturnValue(pending);
    const one = firstValueFrom(data.loadCoreMetadata()),
      two = firstValueFrom(data.loadCoreMetadata());
    expect(get).toHaveBeenCalledTimes(1);
    session.Company = 'B';
    pending.next(metadata());
    pending.complete();
    expect(await one).toBe(false);
    expect(await two).toBe(false);
    expect(data.resolveSourceContract(source)).toEqual(source);
  });
  for (const context of ['user', 'company', 'workspace', 'token', 'permissions'] as const)
    it('invalidates discovery on ' + context + ' change', async () => {
      await firstValueFrom(data.loadCoreMetadata());
      await firstValueFrom(data.loadCoreMetadata());
      expect(get).toHaveBeenCalledTimes(1);
      if (context === 'user') session.UserId = 'two';
      if (context === 'company') session.Company = 'B';
      if (context === 'workspace') workspace.slug = 'workspace-b';
      if (context === 'token') session.AccessToken = 'new-token';
      if (context === 'permissions') session.Permissions = [{ read: false }];
      expect(data.resolveSourceContract(source)).toEqual(source);
      get.mockReturnValue(of({ data: { contractVersion: '1.0', entities: {}, endpoints: [] } }));
      await firstValueFrom(data.loadCoreMetadata());
      expect(get).toHaveBeenCalledTimes(2);
      expect(data.resolveSourceContract(source)).toEqual(source);
    });
  it('opens an ordinary configured page and autosaves first input using metadata without repeated rules', async () => {
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
    expect(page.headerConfig.sections[0].fields[0].readonlyAfterCreate).toBe(true);
    expect(page.inlineDocumentWindowConfig?.headerData?.['amount']).toBe('0');
    page.handleInlineAction({
      actionKey: 'header:changed',
      payload: { fieldKey: 'code', value: 'NEW', previousValue: '' },
    });
    await vi.waitFor(() => expect(post).toHaveBeenCalledTimes(1));
    expect(post.mock.calls[0][1]).toMatchObject({ code: 'NEW', description: null, amount: '0' });
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
      await firstValueFrom(data.loadCoreMetadata());
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
  it('keeps the setup shell visible and editors locked during delayed metadata discovery', async () => {
    const pending = new Subject<unknown>();
    get.mockImplementation((url: string) => url.endsWith('/apiCapabilities') ? pending : of({data:{systemId:'saved',code:'A',systemRowVersion:1}}));
    session.SuperAdmin = true;
    const fixture = TestBed.createComponent(ListPage);
    fixture.componentRef.setInput('listConfig',{...paymentTermsListConfig,pageType:'setup',dataSource:{...source,singleton:true}});
    fixture.componentRef.setInput('headerConfig',{sections:[{id:'general',title:'General',fields:[{key:'code',label:'Code'}]}]});
    fixture.componentRef.setInput('documentOnly',true);fixture.componentRef.setInput('initialRecord',{});fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.entry-header')).not.toBeNull();
    expect(fixture.componentInstance.inlineDocumentWindowConfig?.contentReady).toBe(false);
    expect(fixture.componentInstance.inlineDocumentWindowConfig?.interactionLocked).toBe(true);
    expect(post).not.toHaveBeenCalled();
    pending.next(metadata());pending.complete();
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
