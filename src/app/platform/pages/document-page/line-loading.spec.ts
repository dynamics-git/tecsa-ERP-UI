import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { By } from '@angular/platform-browser';
import { of, Subject } from 'rxjs';
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
import { DATA_REST_SERVICE } from '../../data/data-source.service';
import { DocumentLines } from '../../document/document-lines/document-lines';
import { ListPage } from '../list-page/list-page';

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

  for (const page of pages) {
    it.each([false, true])(
      `${page.name} keeps blank rows visible and locked, then shows the response (hasLines=%s)`,
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
        expect(fixture.nativeElement.querySelector('.entry-work').style.visibility).not.toBe('hidden');
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
