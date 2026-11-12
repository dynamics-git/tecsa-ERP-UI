import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, Subject } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SessionService } from '../../../core/services/session.service';
import { providePlatformGovernance } from '../../../core/providers/platform-governance.provider';
import { usersHeaderConfig, usersListConfig } from '../../../features/administration/users/users.config';
import { purchaseRequisitionHeaderConfig, purchaseRequisitionListConfig } from '../../../features/purchasing/purchase-requisition/purchase-requisition.config';
import { DATA_REST_SERVICE } from '../../data/data-source.service';
import { DocumentPage } from './document-page';

afterEach(() => TestBed.resetTestingModule());

describe('Shared record autosave ownership', () => {
  for (const config of [
    { list: usersListConfig, header: usersHeaderConfig, field: 'name', record: { systemId: 'user-1', userName: 'ayan', name: 'Before', email: 'ayan@example.com', isActive: true, systemRowVersion: 1 } },
    { list: purchaseRequisitionListConfig, header: purchaseRequisitionHeaderConfig, field: 'purpose', record: { systemId: 'pr-1', number: 'PR00001', documentType: 'purchase_requisition', status: 'open', requestDate: '2026-11-11', purpose: 'Before', systemRowVersion: 1 } },
  ]) {
    it.each([false, true])(`${config.list.pageId} coalesces pending edits and does not retry a failed write (failed=%s)`, async failed => {
      const responses: Subject<unknown>[] = [];
      const patch = vi.fn((_path: string, _body: unknown, _version?: string) => {
        const response = new Subject<unknown>();
        responses.push(response);
        return response;
      });
      const get = vi.fn(() => of({ data: { ...config.record } }));
      const post = vi.fn();
      TestBed.configureTestingModule({ imports: [DocumentPage], providers: [provideRouter([]), ...providePlatformGovernance(),
        { provide: DATA_REST_SERVICE, useValue: { get, patch, post } }] });
      TestBed.inject(SessionService).SuperAdmin = true;
      const fixture = TestBed.createComponent(DocumentPage);
      fixture.componentRef.setInput('documentOnly', true);
      fixture.componentRef.setInput('initialRecord', { ...config.record });
      fixture.componentRef.setInput('listConfig', config.list);
      fixture.componentRef.setInput('headerConfig', config.header);
      fixture.detectChanges();
      await vi.waitFor(() => expect(fixture.componentInstance.popupLoading).toBe(false));
      const page = fixture.componentInstance;
      const reads = get.mock.calls.length;
      const edit = (value: string, previousValue: string) => page.handleInlineAction({ actionKey: 'header:changed', payload: { fieldKey: config.field, value, previousValue } });
      edit('First', 'Before');
      await vi.waitFor(() => expect(patch).toHaveBeenCalledTimes(1));
      edit('Second', 'First');
      edit('Latest', 'Second');
      page.handleInlineAction({ actionKey: 'cmd:autosave' });
      expect(page.hasPendingWrites).toBe(true);
      if (failed) {
        responses[0].error({status: 412, error: {message: 'Record changed'}});
        await vi.waitFor(() => expect(page.hasPendingWrites).toBe(false));
        expect(patch).toHaveBeenCalledTimes(1);
        expect(page.hasUnsavedChanges).toBe(true);
        expect(page.inlineDocumentWindowConfig?.headerData?.[config.field]).toBe('Latest');
        expect(page.inlineDocumentWindowConfig?.statusMessage?.tone).toBe('error');
        fixture.destroy();
        return;
      }
      responses[0].next({ data: { ...config.record, [config.field]: 'First', systemRowVersion: 2 } });
      responses[0].complete();
      await vi.waitFor(() => expect(patch).toHaveBeenCalledTimes(2));
      expect(patch.mock.calls[1][1]).toEqual({ [config.field]: 'Latest' });
      expect(patch.mock.calls[1][2]).toBe('"2"');
      responses[1].next({ data: { ...config.record, [config.field]: 'Latest', systemRowVersion: 3 } });
      responses[1].complete();
      await vi.waitFor(() => expect(page.hasPendingWrites).toBe(false));
      expect(patch).toHaveBeenCalledTimes(2);
      expect(page.hasUnsavedChanges).toBe(false);
      expect(page.inlineDocumentWindowConfig?.headerData?.[config.field]).toBe('Latest');
      expect(get).toHaveBeenCalledTimes(reads);
      expect(post).not.toHaveBeenCalled();
      fixture.destroy();
    });
  }
});
