import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, Subject } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SessionService } from '../../../core/services/session.service';
import { providePlatformGovernance } from '../../../core/providers/platform-governance.provider';
import { DATA_REST_SERVICE } from '../../data/data-source.service';
import { DynamicForm } from '../../../shared/ui/dynamic-form/dynamic-form';
import { By } from '@angular/platform-browser';
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
    const pendingCaption = new Subject<unknown>();
    const get = vi.fn((endpoint: string) => {
      if (endpoint.startsWith('/fixtures/header-1')) return of({ data: { ...header } });
      if (endpoint.startsWith('/fixtureLines?')) return of({ data: [line], meta: { total: 1 } });
      if (endpoint === '/vendors/V-1') return pendingCaption;
      if (endpoint.startsWith('/vendors?')) return of({data: [{code: 'V-1', name: 'Vendor One'}]});
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
        { key: 'vendorCode', label: 'Vendor', type: 'lookup', lookup: { endpoint: '/vendors', valueField: 'code', displayField: 'name' } },
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
    await vi.waitFor(() => expect(get.mock.calls.filter(([endpoint]) => endpoint === '/vendors/V-1')).toHaveLength(1));
    expect(get.mock.calls.filter(([endpoint]) => endpoint.startsWith('/vendors?'))).toHaveLength(0);
    expect(active?.headerData['__display_vendorCode']).toBeUndefined();

    pendingCaption.next({data: {systemId: 'V-1', code: 'V-1', name: 'Vendor One'}});pendingCaption.complete();
    await vi.waitFor(() => {
      fixture.detectChanges();
      const form = fixture.debugElement.query(By.directive(DynamicForm)).componentInstance as DynamicForm;
      expect(form.lookupLabel(form.sections[0].fields[1])).toBe('Vendor One');
    });
    const form = fixture.debugElement.query(By.directive(DynamicForm)).componentInstance as DynamicForm;
    form.openLookup(form.sections[0].fields[1]);
    expect(get.mock.calls.some(([endpoint]) => endpoint.startsWith('/legacyVendors'))).toBe(false);
    expect(get.mock.calls.filter(([endpoint]) => endpoint.startsWith('/vendors?'))).toHaveLength(1);
    fixture.destroy();
  });
});
