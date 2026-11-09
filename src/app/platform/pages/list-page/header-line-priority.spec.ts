import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SessionService } from '../../../core/services/session.service';
import { providePlatformGovernance } from '../../../core/providers/platform-governance.provider';
import { DATA_REST_SERVICE } from '../../data/data-source.service';
import { DocumentHydrationOrchestratorService } from '../../data/document-hydration-orchestrator.service';
import { ListPage } from './list-page';

afterEach(() => {
  vi.restoreAllMocks();
  TestBed.resetTestingModule();
});

describe('Header / Lines load priority', () => {
  it('publishes Header and starts Lines before optional header lookup captions complete', async () => {
    const header = {
      systemId: 'header-1', systemRowVersion: 1, code: 'PO-1', vendorCode: 'V-1',
    };
    const line = { systemId: 'line-1', systemRowVersion: 1, headerCode: 'PO-1', description: 'First line' };
    const get = vi.fn((endpoint: string) => {
      if (endpoint.startsWith('/fixtures/header-1')) return of({ data: { ...header } });
      if (endpoint.startsWith('/fixtureLines?')) return of({ data: [line], meta: { total: 1 } });
      throw new Error('Unexpected read: ' + endpoint);
    });
    TestBed.configureTestingModule({
      imports: [ListPage],
      providers: [
        provideRouter([]),
        ...providePlatformGovernance(),
        { provide: DATA_REST_SERVICE, useValue: { get } },
      ],
    });
    TestBed.inject(SessionService).SuperAdmin = true;

    let resolveCaption!: (record: Record<string, unknown>) => void;
    const pendingCaption = new Promise<Record<string, unknown>>(resolve => { resolveCaption = resolve; });
    const captions = vi.spyOn(
      TestBed.inject(DocumentHydrationOrchestratorService), 'resolveHeaderLookups',
    ).mockReturnValue(pendingCaption);

    const fixture = TestBed.createComponent(ListPage);
    fixture.componentRef.setInput('documentOnly', true);
    fixture.componentRef.setInput('initialRecord', { ...header });
    fixture.componentRef.setInput('listConfig', {
      pageId: 'fixtures', pageType: 'card', title: 'Fixtures',
      dataSource: { endpoint: '/fixtures', keyField: 'systemId' },
    });
    fixture.componentRef.setInput('headerConfig', {
      sections: [{ id: 'general', title: 'General', fields: [
        { key: 'code', label: 'Code' },
        { key: 'vendorCode', label: 'Vendor', lookup: { endpoint: '/vendors', valueField: 'code', displayField: 'name' } },
      ] }],
    });
    fixture.componentRef.setInput('lineConfig', {
      dataSource: { endpoint: '/fixtureLines', keyField: 'systemId', lineFKProp: 'headerCode', headerPKProp: 'code' },
      columns: [{ id: 'description', label: 'Description', type: 'text' }],
      editable: true,
    });
    fixture.detectChanges();

    await vi.waitFor(() => expect(get).toHaveBeenCalledWith(expect.stringMatching(/^\/fixtureLines\?/)));
    const active = (fixture.componentInstance as unknown as {
      activeDocumentWindowConfig?: {
        headerData: Record<string, unknown>;
        lineRows: Array<Record<string, unknown>>;
      };
    }).activeDocumentWindowConfig;
    expect(active?.headerData['code']).toBe('PO-1');
    expect(active?.lineRows.some(row => row['description'] === 'First line')).toBe(true);
    await vi.waitFor(() => expect(captions).toHaveBeenCalledOnce());
    expect(active?.headerData['__display_vendorCode']).toBeUndefined();

    resolveCaption({ ...header, __display_vendorCode: 'Vendor One' });
    await vi.waitFor(() => expect(active?.headerData['__display_vendorCode']).toBe('Vendor One'));
    fixture.destroy();
  });
});
