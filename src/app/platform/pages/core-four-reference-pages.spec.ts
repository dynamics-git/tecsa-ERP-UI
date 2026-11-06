import { By } from '@angular/platform-browser';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { of, Subject, throwError } from 'rxjs';
import { ListPage } from './list-page/list-page';
import { DocumentLines } from '../document/document-lines/document-lines';
import { DATA_REST_SERVICE } from '../data/data-source.service';
import { SessionService } from '../../core/services/session.service';
import { ConfirmationService } from '../../shared/ui/confirmation.service';
import { providePlatformGovernance } from '../../core/providers/platform-governance.provider';
import type { ListPageConfig } from '../models/page-config.model';
import type { HeaderConfig } from '../models/document-window-config.model';
import type { LineConfig } from '../models/line-config.model';

/**
 * Four deliberately synthetic Page configurations. No business Page/legacy
 * configuration, live database, permissions Page or production route is used.
 * This protects the shared CRUD, save and Header-Line behavior itself.
 *
 * Card includes a List browser; Document exercises a flat Header-Line API;
 * Worksheet exercises row writes; Setup exercises singleton PUT.
 */
type ReferenceKind = 'card' | 'document' | 'worksheet' | 'setup';
const header = {
  systemId: 'header-1', code: 'A', number: 'DOC-1',
  documentType: 'reference', description: 'Before', systemRowVersion: 3,
};
const firstRow = {
  systemId: 'line-1', lineNo: 10000, documentNumber: 'DOC-1',
  documentType: 'reference', description: 'First', quantity: '2', systemRowVersion: 5,
};

function referencePage(kind: ReferenceKind): {
  list: ListPageConfig;
  header: HeaderConfig;
  lines?: LineConfig;
} {
  const endpoint = {
    card: '/referenceCards',
    document: '/referenceHeaders',
    worksheet: '/referenceWorksheets',
    setup: '/referenceSetup',
  }[kind];
  const list: ListPageConfig = {
    pageId: 'core-reference-' + kind,
    pageType: kind,
    title: 'Core Reference ' + kind,
    autoSave: kind === 'card' || kind === 'document' ? false : true,
    dataSource: {
      endpoint, keyField: 'systemId',
      ...(kind === 'setup' ? { singleton: true, supportsCreate: false } : {}),
    },
    dataSurface: { columns: [{ field: 'code', label: 'Code' }, { field: 'description', label: 'Description' }] },
  };
  const headerConfig: HeaderConfig = {
    dialogTitle: 'Core Reference',
    toolbarButtons: [],
    sections: [{
      id: 'general', title: 'General',
      fields: [
        { key: 'code', label: 'Code', valueType: 'code', required: true },
        { key: 'description', label: 'Description', valueType: 'text' },
      ],
    }],
  };
  const lines: LineConfig | undefined = kind === 'document' || kind === 'worksheet' ? {
    placement: { mode: 'end' },
    dataSource: {
      endpoint: kind === 'document' ? '/referenceLines' : '/referenceWorksheetRows',
      keyField: 'systemId',
      headerPKProp: 'number',
      lineFKProp: 'documentNumber',
      parentFieldMap: { documentType: 'documentType' },
    },
    columns: [
      { id: 'lineNo', label: 'Line No.', valueType: 'integer', readonly: true },
      { id: 'description', label: 'Description', valueType: 'text', required: true },
      { id: 'quantity', label: 'Quantity', valueType: 'decimal', defaultValue: '1' },
    ],
  } : undefined;
  return { list, header: headerConfig, lines };
}

function mount(kind: ReferenceKind, options: {
  browser?: boolean;
  initial?: Record<string, unknown>;
  pendingList?: Subject<unknown>;
} = {}) {
  const config = referencePage(kind);
  let savedHeader = structuredClone(header);
  const savedLines = kind === 'worksheet' ? [structuredClone(firstRow)] : [];
  const get = vi.fn((url: string) => {
    if (url.includes('/referenceLines') || url.includes('/referenceWorksheetRows')) {
      return of({ data: structuredClone(savedLines), meta: { total: savedLines.length } });
    }
    if (url.includes('/referenceSetup')) return of({ data: structuredClone(savedHeader) });
    if (options.pendingList && url.includes('/referenceCards') && url.includes('?')) return options.pendingList;
    if (/\/reference(?:Cards|Headers|Worksheets)\/[^/?]+/.test(url)) return of({ data: structuredClone(savedHeader) });
    return of({ data: [structuredClone(savedHeader)], meta: { total: 1, recordShape: 'complete' } });
  });
  const post = vi.fn((url: string, values: Record<string, unknown>) => {
    if (url.includes('/referenceLines') || url.includes('/referenceWorksheetRows')) {
      const saved = { ...values, systemId: 'line-' + (savedLines.length + 1), lineNo: (savedLines.length + 1) * 10000, systemRowVersion: 1 };
      savedLines.push(saved as typeof firstRow);
      return of({ data: structuredClone(saved) });
    }
    savedHeader = { ...savedHeader, ...values, systemId: 'created-header', systemRowVersion: 1 };
    return of({ data: structuredClone(savedHeader) });
  });
  const patch = vi.fn((url: string, values: Record<string, unknown>, _etag?: string) => {
    if (url.includes('/referenceLines') || url.includes('/referenceWorksheetRows')) {
      const row = savedLines.find(row => url.includes(String(row.systemId)));
      if (row) Object.assign(row, values, { systemRowVersion: Number(row.systemRowVersion) + 1 });
      return of({ data: structuredClone(row ?? { ...values, systemId: 'line-1', systemRowVersion: 6 }) });
    }
    savedHeader = { ...savedHeader, ...values, systemRowVersion: Number(savedHeader.systemRowVersion) + 1 };
    return of({ data: structuredClone(savedHeader) });
  });
  const put = vi.fn((url: string, values: Record<string, unknown>, etag?: string) => patch(url, values, etag));
  const remove = vi.fn((_url: string, _etag?: string) => of(undefined));
  TestBed.configureTestingModule({
    imports: [ListPage],
    providers: [
      provideRouter([]),
      ...providePlatformGovernance(),
      { provide: DATA_REST_SERVICE, useValue: { get, post, patch, put, delete: remove } },
    ],
  });
  TestBed.inject(SessionService).SuperAdmin = true;
  const fixture = TestBed.createComponent(ListPage);
  fixture.componentRef.setInput('pageId', config.list.pageId);
  fixture.componentRef.setInput('documentOnly', !options.browser);
  fixture.componentRef.setInput('initialRecord', structuredClone(options.initial ?? header));
  fixture.componentRef.setInput('listConfig', config.list);
  fixture.componentRef.setInput('headerConfig', config.header);
  if (config.lines) fixture.componentRef.setInput('lineConfig', config.lines);
  fixture.detectChanges();
  return { fixture, page: fixture.componentInstance, get, post, patch, put, remove, savedLines, config };
}

afterEach(() => {
  vi.restoreAllMocks();
  TestBed.resetTestingModule();
});

describe('Core acceptance: four independent reference Pages', () => {
  it('Card/List: reads a collection, shows loading and deletes by stable record identity and ETag', async () => {
    const loading = new Subject<unknown>();
    const { fixture, page, remove } = mount('card', { browser: true, pendingList: loading });
    fixture.detectChanges();
    expect(page.loading).toBe(true);
    expect(fixture.nativeElement.querySelector('app-loading-indicator')).not.toBeNull();
    loading.next({ data: [structuredClone(header)], meta: { total: 1 } });
    loading.complete();
    await vi.waitFor(() => expect(page.rows).toHaveLength(1));
    expect(page.listConfig.title).toBe('Core Reference card');
    vi.spyOn(TestBed.inject(ConfirmationService), 'confirmIntent').mockResolvedValue(true);
    page.handleCheckedKeysChanged(['header-1']);
    page.handleCommand({ actionKey: 'delete' });
    await vi.waitFor(() => expect(remove).toHaveBeenCalledOnce());
    expect(remove).toHaveBeenCalledWith('/referenceCards/header-1', '"3"');
    fixture.destroy();
  });

  it('Card: required-field validation blocks a new record before any POST', async () => {
    const { fixture, page, post, patch } = mount('card', { initial: { description: 'Incomplete' } });
    await vi.waitFor(() => expect(page.inlineDocumentWindowConfig?.headerData?.['description']).toBe('Incomplete'));
    page.handleInlineAction({ actionKey: 'cmd:save' });
    await fixture.whenStable();
    expect(post).not.toHaveBeenCalled();
    expect(patch).not.toHaveBeenCalled();
    expect(page.inlineDocumentWindowConfig?.headerData?.['systemId']).toBeUndefined();
    fixture.destroy();
  });

  it('Card/List: a rejected Delete keeps the record visible and reports the failure', async () => {
    const { fixture, page, remove } = mount('card', { browser: true });
    await vi.waitFor(() => expect(page.rows).toHaveLength(1));
    vi.spyOn(TestBed.inject(ConfirmationService), 'confirmIntent').mockResolvedValue(true);
    remove.mockImplementationOnce(() => throwError(() => new Error('Related records prevent deletion.')));
    page.handleCheckedKeysChanged(['header-1']);
    page.handleCommand({ actionKey: 'delete' });
    await vi.waitFor(() => expect(remove).toHaveBeenCalledOnce());
    await vi.waitFor(() => expect(page.error).toContain('Related records prevent deletion'));
    expect(page.rows).toHaveLength(1);
    fixture.destroy();
  });

  it('Card: creates only on explicit Save and updates only the changed field', async () => {
    const { fixture, page, post, patch } = mount('card', { initial: { code: 'NEW', description: 'New' } });
    // An unsaved Card is initialized locally, not hydrated from an API record.
    await vi.waitFor(() => expect(page.inlineDocumentWindowConfig?.headerData?.['code']).toBe('NEW'));
    expect(post).not.toHaveBeenCalled();
    page.handleInlineAction({ actionKey: 'cmd:save' });
    await vi.waitFor(() => expect(post).toHaveBeenCalledOnce());
    await vi.waitFor(() => expect(page.hasPendingWrites).toBe(false));
    expect(post.mock.calls[0][0]).toBe('/referenceCards');
    expect(post.mock.calls[0][1]).toMatchObject({ code: 'NEW', description: 'New' });
    expect(post.mock.calls[0][1]).not.toHaveProperty('systemId');
    page.handleInlineAction({ actionKey: 'header:changed', payload: { fieldKey: 'description', value: 'Edited', previousValue: 'New' } });
    expect(patch).not.toHaveBeenCalled();
    page.handleInlineAction({ actionKey: 'cmd:save' });
    await vi.waitFor(() => expect(patch).toHaveBeenCalledOnce());
    expect(patch.mock.calls[0][0]).toBe('/referenceCards/created-header');
    expect(patch.mock.calls[0][1]).toEqual({ description: 'Edited' });
    fixture.destroy();
  });

  it('Document: saves a new line through declared Header-Line keys without backend ownership', async () => {
    const { fixture, page, post } = mount('document');
    await vi.waitFor(() => expect(page.inlineDocumentWindowConfig?.contentReady).toBe(true));
    fixture.detectChanges();
    const grid = fixture.debugElement.query(By.directive(DocumentLines)).componentInstance as DocumentLines;
    const draft = grid.rows.find(row => row['__entryPlaceholder'])!;
    grid.updateCellValue(grid.columns.find(column => column.id === 'description')!, draft, 'Reference line');
    expect(post).not.toHaveBeenCalled();
    page.handleInlineAction({ actionKey: 'cmd:save' });
    await vi.waitFor(() => expect(post).toHaveBeenCalledOnce());
    expect(post.mock.calls[0][0]).toBe('/referenceLines');
    expect(post.mock.calls[0][1]).toMatchObject({
      description: 'Reference line',
      documentNumber: 'DOC-1',
      documentType: 'reference',
    });
    expect(post.mock.calls[0][1]).not.toHaveProperty('systemId');
    fixture.destroy();
  });

  it('Worksheet: loads related rows and PATCHes an edited row, without Header writes', async () => {
    const { fixture, page, get, patch, post } = mount('worksheet');
    await vi.waitFor(() => expect(page.inlineDocumentWindowConfig?.lineRows?.some(row => row['systemId'] === 'line-1')).toBe(true));
    fixture.detectChanges();
    expect(get.mock.calls.some(([url]) => String(url).includes('/referenceWorksheetRows'))).toBe(true);
    const grid = fixture.debugElement.query(By.directive(DocumentLines)).componentInstance as DocumentLines;
    const row = grid.rows.find(row => row['systemId'] === 'line-1')!;
    grid.updateCellValue(grid.columns.find(column => column.id === 'description')!, row, 'Changed worksheet row');
    await vi.waitFor(() => expect(patch).toHaveBeenCalledOnce());
    expect(patch.mock.calls[0][0]).toBe('/referenceWorksheetRows/line-1');
    expect(patch.mock.calls[0][1]).toEqual({ description: 'Changed worksheet row' });
    expect(post).not.toHaveBeenCalled();
    fixture.destroy();
  });

  it('Setup: hydrates the singleton and saves a changed field via PUT', async () => {
    const { fixture, page, put, post } = mount('setup');
    await vi.waitFor(() => expect(page.inlineDocumentWindowConfig?.contentReady).toBe(true));
    expect(page.inlineDocumentWindowConfig?.headerData?.['description']).toBe('Before');
    page.handleInlineAction({ actionKey: 'header:changed', payload: { fieldKey: 'description', value: 'Updated setup', previousValue: 'Before' } });
    await vi.waitFor(() => expect(put).toHaveBeenCalledOnce());
    expect(put.mock.calls[0][0]).toBe('/referenceSetup');
    expect(put.mock.calls[0][1]).toEqual({ description: 'Updated setup' });
    expect(post).not.toHaveBeenCalled();
    fixture.destroy();
  });
});
