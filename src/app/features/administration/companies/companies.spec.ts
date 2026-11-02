import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { of, Subject, throwError } from 'rxjs';
import {
  ConfirmationService,
  DataSourceService,
  ListPage,
  PageCommandEvent,
} from '../../../platform/public-api';
import { SessionService } from '../../../core/services/session.service';
import { CompaniesPage } from './companies';
import { companiesDataSource, companiesLineConfig } from './companies.config';

const row = { systemId: 'other-company', systemRowVersion: 3, code: 'SOURCE', name: 'Source' };
function event(action: string, rows = [row]): PageCommandEvent {
  return {
    actionKey: action,
    context: {
      pageId: 'companies',
      checkedRowKeys: rows.map((r) => r.systemId),
      lineRows: rows,
      selectedRow: rows[0],
    },
  };
}
describe('Companies worksheet business commands', () => {
  const data = { captureWriteScope: vi.fn(), execute: vi.fn(), delete: vi.fn() };
  const confirmation = {
    prompt: vi.fn(),
    confirm: vi.fn(),
    message: vi.fn().mockResolvedValue(undefined),
    progress: vi.fn(() => vi.fn()),
  };
  beforeEach(() => {
    data.captureWriteScope.mockReturnValue(() => true);
    data.execute.mockReturnValue(of({ systemId: 'copy-id' }));
    data.delete.mockReturnValue(of({}));
    confirmation.prompt.mockResolvedValue({ code: 'TARGET', name: 'Target', mode: 'setup_master' });
    confirmation.confirm.mockResolvedValue(true);
    TestBed.configureTestingModule({
      imports: [CompaniesPage],
      providers: [
        { provide: DataSourceService, useValue: data },
        { provide: ConfirmationService, useValue: confirmation },
        { provide: SessionService, useValue: { Company: 'current-company' } },
      ],
    });
    TestBed.overrideComponent(CompaniesPage, { set: { template: '', imports: [] } });
  });
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.clearAllMocks();
  });
  function create() {
    const f = TestBed.createComponent(CompaniesPage);
    const c = f.componentInstance;
    c.page = {
      hasPendingWrites: false,
      hasUnsavedChanges: false,
      handleInlineAction: vi.fn(),
    } as unknown as ListPage;
    return c;
  }
  it('uses the existing API, shared CRUD prerequisites and explicit editable columns', () => {
    expect(companiesDataSource.endpoint).toBe('/companies');
    expect(companiesDataSource.requiredCreateFields).toEqual(['code', 'name']);
    expect(companiesLineConfig.columns.map((c) => c.id)).toEqual([
      'code',
      'name',
      'displayName',
      'isActive',
    ]);
    expect(companiesLineConfig.dataSource).toBe(companiesDataSource);
  });
  it.each(['setup_master', 'full'])(
    'executes %s through the existing data command and refreshes the worksheet',
    async (mode) => {
      confirmation.prompt.mockResolvedValue({ code: 'TARGET', name: 'Target', mode });
      const c = create();
      await c.handleBusinessCommand(event('copy-company'));
      expect(data.execute).toHaveBeenCalledWith(c.source, row.systemId, 'copy', {
        code: 'TARGET',
        name: 'Target',
        mode,
        sourceVersion: 3,
      });
      expect(c.page!.handleInlineAction).toHaveBeenCalledWith({ actionKey: 'cmd:line-refresh' });
    },
  );
  it('does not submit when cancelled, context changes, selection is multiple or edits are pending', async () => {
    const c = create();
    await c.handleBusinessCommand(event('copy-company', [row, row]));
    expect(data.execute).not.toHaveBeenCalled();
    confirmation.prompt.mockResolvedValue(null);
    await c.handleBusinessCommand(event('copy-company'));
    expect(data.execute).not.toHaveBeenCalled();
    confirmation.prompt.mockResolvedValue({ code: 'TARGET' });
    data.captureWriteScope.mockReturnValue(() => false);
    await c.handleBusinessCommand(event('copy-company'));
    expect(data.execute).not.toHaveBeenCalled();
    data.captureWriteScope.mockReturnValue(() => true);
    c.page = { hasPendingWrites: true } as ListPage;
    await c.handleBusinessCommand(event('copy-company'));
    expect(data.execute).not.toHaveBeenCalled();
  });
  it('preserves copy parameters after an API failure and prevents duplicate submissions', async () => {
    const pending = new Subject<unknown>();
    data.execute.mockReturnValue(pending);
    const c = create();
    const promise = c.handleBusinessCommand(event('copy-company'));
    await Promise.resolve();
    await c.handleBusinessCommand(event('copy-company'));
    expect(data.execute).toHaveBeenCalledOnce();
    pending.error(new Error('Copy failed'));
    await promise;
    expect(confirmation.message).toHaveBeenCalledWith(expect.stringContaining('Copy failed'));
    data.execute.mockReturnValue(of({}));
    await c.handleBusinessCommand(event('copy-company'));
    const fields = confirmation.prompt.mock.calls[1][1];
    expect(fields.find((f: { key: string }) => f.key === 'code').defaultValue).toBe('TARGET');
  });
  it('keeps only the current-company business guard on shared deletion', () => {
    const c = create();
    const before = c.source.hooks!.beforeDelete!;
    expect(
      before({ operation: 'delete', endpoint: '/companies', id: row.systemId, payload: undefined }),
    ).toBeUndefined();
    expect(
      before({
        operation: 'delete',
        endpoint: '/companies',
        id: 'current-company',
        payload: undefined,
      }),
    ).toContain('Switch to another');
  });
  it('blocks closing while the company operation is pending', () => {
    const c = create(),
      close = vi.fn();
    c.runModal = { record: {}, close };
    c.busy.set(true);
    c.requestClose();
    expect(close).not.toHaveBeenCalled();
    c.busy.set(false);
    c.requestClose();
    expect(close).toHaveBeenCalledOnce();
  });
});
