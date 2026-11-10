import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { By } from '@angular/platform-browser';
import { firstValueFrom, of, Subject } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { providePlatformGovernance } from '../../../core/providers/platform-governance.provider';
import { SessionService } from '../../../core/services/session.service';
import {
  noSeriesHeaderConfig,
  noSeriesLineConfig,
  noSeriesListConfig,
} from '../../../features/administration/no-series/no-series.config';
import {
  purchaseRequisitionHeaderConfig,
  purchaseRequisitionLineConfig,
  purchaseRequisitionListConfig,
} from '../../../features/purchasing/purchase-requisition/purchase-requisition.config';
import { DATA_REST_SERVICE, DataSourceService } from '../../data/data-source.service';
import { DocumentLines } from '../../document/document-lines/document-lines';
import { ListPage } from '../list-page/list-page';
import { usersHeaderConfig, usersLineConfig, usersListConfig } from '../../../features/administration/users/users.config';

describe('Document line layout while the initial request is pending', () => {
  afterEach(() => TestBed.resetTestingModule());

  const pages = [
    {
      name: 'No. Series',
      list: noSeriesListConfig,
      header: noSeriesHeaderConfig,
      line: noSeriesLineConfig,
      record: { systemId: 'series-1', systemRowVersion: 1, code: 'PURCH-ORD', description: 'Orders' },
      isLines: (endpoint: string) => endpoint.includes('/series-1/lines'),
      savedLine: { systemId: 'line-1', systemRowVersion: 1, lineNo: 10000, startingNo: 'PO00001' },
    },
    {
      name: 'Purchase Requisition',
      list: purchaseRequisitionListConfig,
      header: purchaseRequisitionHeaderConfig,
      line: purchaseRequisitionLineConfig,
      record: {
        systemId: 'pr-1', systemRowVersion: 1, number: 'PR00001',
        documentType: 'purchase_requisition', status: 'open', requestDate: '2026-10-30',
      },
      isLines: (endpoint: string) => endpoint.startsWith('/purchaseRequisitionLines'),
      savedLine: {
        systemId: 'line-1', systemRowVersion: 1, lineNo: 10000,
        lineType: 'item', description: 'Saved line', quantity: '1', estimatedUnitCost: '0',
      },
    },
  ];

  it('shows one skeleton until Users permission lines and selected Name are ready', async () => {
    const captions = new Subject<unknown>();
    const record = {systemId: 'user-1', systemRowVersion: 1, userName: 'ayan', name: 'Ayan Rahman', email: 'ayan@tecsa.com.my', isActive: true, lastLoginAt: null};
    const assignment = {systemId: 'assignment-1', systemRowVersion: 1, userName: 'ayan', permissionSetCode: 'REQ-ENTRY', companyCode: 'TECSA', isActive: true};
    const get = vi.fn((endpoint: string) => endpoint.startsWith('/userPermissionSets')
      ? of({data: [assignment], meta: {total: 1}})
      : endpoint.startsWith('/permissionSets') || endpoint.startsWith('/permissionCompanies')
        ? captions : endpoint.startsWith('/users?') ? of({data: [record], meta: {total: 1, recordShape: 'complete'}}) : of({data: record}));
    const patch = vi.fn();
    TestBed.configureTestingModule({imports: [ListPage], providers: [provideRouter([]), ...providePlatformGovernance(),
      {provide: DATA_REST_SERVICE, useValue: {get, patch}}]});
    TestBed.inject(SessionService).SuperAdmin = true;
    await firstValueFrom(TestBed.inject(DataSourceService).loadList(usersListConfig.dataSource, {useCache: true}));
    const fixture = TestBed.createComponent(ListPage);
    fixture.componentRef.setInput('documentOnly', true);
    fixture.componentRef.setInput('initialRecord', record);
    fixture.componentRef.setInput('listConfig', usersListConfig);
    fixture.componentRef.setInput('headerConfig', usersHeaderConfig);
    fixture.componentRef.setInput('lineConfig', usersLineConfig);
    fixture.detectChanges();
    const page = fixture.componentInstance;
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(captions.observers.length).toBeGreaterThan(0);
    });
    expect(page.inlineDocumentWindowConfig?.contentReady).toBe(false);
    expect(fixture.nativeElement.querySelector('.entry-complete-skeleton')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.entry-work').style.visibility).toBe('hidden');
    expect(get.mock.calls.some(([endpoint]) => endpoint === '/users/user-1')).toBe(false);
    expect(patch).not.toHaveBeenCalled();

    captions.next({data: [{code: 'REQ-ENTRY', name: 'Requisition Entry'}, {code: 'TECSA', name: 'TecSA'}], meta: {total: 2}});
    captions.complete();
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(page.inlineDocumentWindowConfig?.contentReady).toBe(true);
      expect(page.inlineDocumentWindowConfig?.lineRows?.some(row => row['systemId'] === assignment.systemId)).toBe(true);
    });
    const row = page.inlineDocumentWindowConfig!.lineRows!.find(row => row['systemId'] === assignment.systemId)!;
    const editor = fixture.debugElement.query(By.directive(DocumentLines)).componentInstance as DocumentLines;
    expect(editor.disabled).toBe(false);
    expect(editor.lookupDisplay(usersLineConfig.columns[0], row)).toBe('REQ-ENTRY');
    expect(row['permissionSetName']).toBe('Requisition Entry');
    expect(row['permissionSetCode']).toBe('REQ-ENTRY');
    expect(patch).not.toHaveBeenCalled();
    fixture.destroy();
  });

  it('does not load persisted Lines or show a loader for an unsaved New Card', () => {
    const get = vi.fn(() => of({ data: [], meta: { total: 0 } }));
    TestBed.configureTestingModule({
      imports: [ListPage],
      providers: [
        provideRouter([]), ...providePlatformGovernance(),
        { provide: DATA_REST_SERVICE, useValue: { get } },
      ],
    });
    TestBed.inject(SessionService).SuperAdmin = true;
    const fixture = TestBed.createComponent(ListPage);
    fixture.componentRef.setInput('documentOnly', true);
    fixture.componentRef.setInput('initialRecord', {});
    fixture.componentRef.setInput('listConfig', usersListConfig);
    fixture.componentRef.setInput('headerConfig', usersHeaderConfig);
    fixture.componentRef.setInput('lineConfig', usersLineConfig);
    fixture.detectChanges();

    const page = fixture.componentInstance;
    expect(page.inlineDocumentWindowConfig?.contentReady).not.toBe(false);
    expect(page.popupLoading).toBe(false);
    expect(get).not.toHaveBeenCalled();

    // Even a refresh on a locally created Header must not query child data.
    (page as unknown as { refreshActiveLines(): void }).refreshActiveLines();
    fixture.detectChanges();
    expect(get).not.toHaveBeenCalled();
    expect(page.popupLoading).toBe(false);
    expect(page.inlineDocumentWindowConfig?.contentReady).not.toBe(false);
    fixture.destroy();
  });

  for (const page of pages) {
    it.each([false, true])(
      `${page.name} keeps full Card hidden behind skeleton, then shows the response (hasLines=%s)`,
      async hasLines => {
        const pending = new Subject<unknown>();
        const get = vi.fn((endpoint: string) => page.isLines(endpoint)
          ? pending : of({ data: structuredClone(page.record) }));
        const post = vi.fn(() => of({}));
        const patch = vi.fn(() => of({}));
        TestBed.configureTestingModule({
          imports: [ListPage],
          providers: [
            provideRouter([]), ...providePlatformGovernance(),
            { provide: DATA_REST_SERVICE, useValue: { get, post, patch } },
          ],
        });
        TestBed.inject(SessionService).SuperAdmin = true;
        const fixture = TestBed.createComponent(ListPage);
        fixture.componentRef.setInput('documentOnly', true);
        fixture.componentRef.setInput('initialRecord', structuredClone(page.record));
        fixture.componentRef.setInput('listConfig', page.list);
        fixture.componentRef.setInput('headerConfig', page.header);
        fixture.componentRef.setInput('lineConfig', page.line);
        fixture.detectChanges();
        await vi.waitFor(() => expect(get.mock.calls.some(([endpoint]) => page.isLines(endpoint))).toBe(true));
        fixture.detectChanges();

        const editor = fixture.debugElement.query(By.directive(DocumentLines)).componentInstance as DocumentLines;
        const rowCount = () => fixture.nativeElement.querySelectorAll('app-document-lines tbody tr').length;
        const state = fixture.componentInstance;
        expect(state.popupLoading).toBe(true);
        expect(state.popupLoadingMessage).toBe('Loading lines...');
        expect(fixture.nativeElement.querySelector('.entry-work').style.visibility).toBe('hidden');
        expect(fixture.nativeElement.querySelector('.entry-complete-skeleton')).not.toBeNull();
        expect(rowCount()).toBe(8);
        expect(editor.disabled).toBe(true);
        expect(state.inlineDocumentWindowConfig!.lineRows!.every(row => row['__entryPlaceholder'])).toBe(true);
        expect(post).not.toHaveBeenCalled();
        expect(patch).not.toHaveBeenCalled();

        pending.next({ data: hasLines ? [page.savedLine] : [], meta: { total: hasLines ? 1 : 0 } });
        pending.complete();
        await fixture.whenStable();
        await vi.waitFor(() => expect(state.popupLoading).toBe(false));
        fixture.detectChanges();
        expect(rowCount()).toBe(8);
        expect(editor.disabled).toBe(false);
        expect(state.inlineDocumentWindowConfig!.contentReady).toBe(true);
        expect(fixture.nativeElement.querySelector('.entry-complete-skeleton')).toBeNull();
        const savedRows = state.inlineDocumentWindowConfig!.lineRows!.filter(row => !row['__entryPlaceholder']);
        expect(savedRows).toHaveLength(hasLines ? 1 : 0);
        if (hasLines) expect(savedRows[0]['systemId']).toBe('line-1');
        expect(post).not.toHaveBeenCalled();
        expect(patch).not.toHaveBeenCalled();
        fixture.destroy();
      },
    );
  }
});
