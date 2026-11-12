import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SessionService } from '../../../core/services/session.service';
import { providePlatformGovernance } from '../../../core/providers/platform-governance.provider';
import { DATA_REST_SERVICE } from '../../data/data-source.service';
import { DocumentHydrationOrchestratorService } from '../../data/document-hydration-orchestrator.service';
import { ListPage } from './list-page';

afterEach(() => { vi.restoreAllMocks(); TestBed.resetTestingModule(); });

describe('List data before secondary lookup captions', () => {
  const row = { systemId: 'record-1', code: 'A', vendorCode: 'V1', description: 'Original', systemRowVersion: 1 };
  function open() {
    const get = vi.fn(() => of({ data: [{ ...row }], meta: { total: 1 } }));
    const patch = vi.fn();
    TestBed.configureTestingModule({ imports: [ListPage], providers: [provideRouter([]), ...providePlatformGovernance(),
      { provide: DATA_REST_SERVICE, useValue: { get, patch } },
    ] });
    TestBed.inject(SessionService).SuperAdmin = true;
    let finish!: (records: Record<string, unknown>[]) => void;
    const pending = new Promise<Record<string, unknown>[]>(resolve => { finish = resolve; });
    const lookup = vi.spyOn(TestBed.inject(DocumentHydrationOrchestratorService), 'resolveListLookups').mockReturnValue(pending);
    const fixture = TestBed.createComponent(ListPage);
    fixture.componentRef.setInput('listConfig', { pageId: 'fixtures', pageType: 'card', title: 'Fixtures',
      dataSource: { endpoint: '/fixtures', keyField: 'systemId' },
      dataSurface: { columns: [{ field: 'code', label: 'Code' }, { field: 'vendorCode', label: 'Vendor' }] },
    });
    fixture.componentRef.setInput('headerConfig', { sections: [{ id: 'general', title: 'General', fields: [
      { key: 'code', label: 'Code' },
      { key: 'vendorCode', label: 'Vendor', lookup: { endpoint: '/vendors', valueField: 'code', displayField: 'name' } },
    ] }] });
    fixture.detectChanges();
    return { fixture, page: fixture.componentInstance, lookup, finish, patch, get };
  }

  it('publishes API records and clears the list loader while captions are still pending', async () => {
    const { fixture, page, lookup, finish, patch, get } = open();
    expect(page.rows).toHaveLength(1);
    expect(page.loading).toBe(false);
    await vi.waitFor(() => expect(lookup).toHaveBeenCalledOnce());
    finish([{ ...row, __display_vendorCode: 'Supplier one' }]);
    await vi.waitFor(() => expect((page.rows[0] as Record<string, unknown>)['__display_vendorCode']).toBe('Supplier one'));
    expect(page.rows).toHaveLength(1);
    expect(get).toHaveBeenCalledOnce();
    expect(patch).not.toHaveBeenCalled();
    fixture.destroy();
  });

  it('does not overwrite a changed lookup identity with a late caption', async () => {
    const { fixture, page, lookup, finish } = open();
    await vi.waitFor(() => expect(lookup).toHaveBeenCalledOnce());
    (page.rows[0] as Record<string, unknown>)['vendorCode'] = 'V2';
    finish([{ ...row, __display_vendorCode: 'Old supplier' }]);
    await new Promise(resolve => setTimeout(resolve, 0));
    expect((page.rows[0] as Record<string, unknown>)['vendorCode']).toBe('V2');
    expect((page.rows[0] as Record<string, unknown>)['__display_vendorCode']).toBeUndefined();
    fixture.destroy();
  });

  it('does not replace newer list rows when an older lookup completes', async () => {
    const { fixture, page, lookup, finish } = open();
    await vi.waitFor(() => expect(lookup).toHaveBeenCalledOnce());
    page.rows = [{ ...row, systemId: 'new-record', vendorCode: 'V2' }];
    finish([{ ...row, __display_vendorCode: 'Old supplier' }]);
    await new Promise(resolve => setTimeout(resolve, 0));
    expect((page.rows[0] as Record<string, unknown>)['systemId']).toBe('new-record');
    expect((page.rows[0] as Record<string, unknown>)['__display_vendorCode']).toBeUndefined();
    fixture.destroy();
  });
});
