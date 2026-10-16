import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { SessionService } from '../../core/services/session.service';
import { ProcurementApiService } from './procurement-api.service';

describe('Laravel procurement API contract', () => {
  let api: ProcurementApiService;
  let http: HttpTestingController;
  let session: SessionService;
  const companyId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const requisitionId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  const lineId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
  const orderId = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
  const base = `/api/v1/companies/${companyId}`;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    session = TestBed.inject(SessionService);
    session.AccessToken = 'test-sanctum-token';
    session.Company = companyId;
    api = TestBed.inject(ProcurementApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  it('loads requisitions using Laravel page/status parameters and data/meta envelope', async () => {
    const result = firstValueFrom(api.listRequisitions({ page: 2, perPage: 20, status: 'approved' }));
    const request = http.expectOne(`${base}/purchaseRequisitions?page=2&perPage=20&status=approved`);
    expect(request.request.method).toBe('GET');
    expect(request.request.headers.get('Authorization')).toBe('Bearer test-sanctum-token');
    request.flush({ data: [{ systemId: requisitionId, number: 'PR-001' }],
      meta: { currentPage: 2, perPage: 20, total: 21, lastPage: 2 } });
    expect((await result).records[0].number).toBe('PR-001');
    expect((await result).meta.total).toBe(21);
  });

  it('creates requisition header without client-owned status or number series consumption', async () => {
    const result = firstValueFrom(api.createRequisition({ purpose: 'IT equipment', requestDate: '2026-10-17' }));
    const req = http.expectOne(`${base}/purchaseRequisitions`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ purpose: 'IT equipment', requestDate: '2026-10-17' });
    req.flush({ data: { systemId: requisitionId, number: 'PR-0001', status: 'open' } });
    expect((await result).number).toBe('PR-0001');
  });

  it('uses the row-version ETag for document edits rather than an unguarded wildcard', async () => {
    const result = firstValueFrom(api.updateRequisition(requisitionId, { purpose: 'Updated' }, 7));
    const req = http.expectOne(`${base}/purchaseRequisitions/${requisitionId}`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.headers.get('If-Match')).toBe('"7"');
    expect(req.request.body).toEqual({ purpose: 'Updated' });
    req.flush({ data: { systemId: requisitionId, systemRowVersion: 8 } });
    expect((await result).systemRowVersion).toBe(8);
  });

  it('creates lines on the requisition child route and leaves line numbering to Laravel', async () => {
    const result = firstValueFrom(api.addRequisitionLine(requisitionId,
      { lineType: 'item', itemId: lineId, quantity: '2.5' }));
    const req = http.expectOne(`${base}/purchaseRequisitions/${requisitionId}/lines`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ lineType: 'item', itemId: lineId, quantity: '2.5' });
    req.flush({ data: { systemId: lineId, lineNo: 10000 } });
    expect((await result).lineNo).toBe(10000);
  });

  it('submits for approval but does not infer approval from submission', async () => {
    const operation = firstValueFrom(api.submitRequisition(requisitionId));
    const req = http.expectOne(`${base}/purchaseRequisitions/${requisitionId}/submit`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({});
    req.flush({ data: { systemId: requisitionId, status: 'pending_approval' } });
    expect((await operation).status).toBe('pending_approval');
  });

  it('rejects an empty rejection comment before sending a mutation', async () => {
    await expect(firstValueFrom(api.rejectRequisition(requisitionId, ' ')))
      .rejects.toThrow('rejection comment');
    http.expectNone(`${base}/purchaseRequisitions/${requisitionId}/reject`);
  });

  it('converts selected approved requisition lines to a separately identified PO', async () => {
    const conversion = { vendorId: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
      lines: [{ requisitionLineId: lineId, quantity: '2.000000' }] };
    const operation = firstValueFrom(api.convertToPurchaseOrder(requisitionId, conversion));
    const req = http.expectOne(`${base}/purchaseRequisitions/${requisitionId}/convertToPurchaseOrder`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(conversion);
    req.flush({ data: { systemId: orderId, sourceRequisitionId: requisitionId, number: 'PO-0001' } });
    expect((await operation).sourceRequisitionId).toBe(requisitionId);
  });

  it('refuses invalid conversion quantities and duplicate lines locally', async () => {
    const input = { vendorId: 'vendor-id', lines: [
      { requisitionLineId: lineId, quantity: '2' },
      { requisitionLineId: lineId, quantity: '1' },
    ] };
    await expect(firstValueFrom(api.convertToPurchaseOrder(requisitionId, input))).rejects.toThrow();
    http.expectNone(`${base}/purchaseRequisitions/${requisitionId}/convertToPurchaseOrder`);
  });

  it('loads PO lines from REST path and preserves source requisition line provenance', async () => {
    const operation = firstValueFrom(api.getPurchaseOrderLines(orderId));
    const req = http.expectOne(`${base}/purchaseOrders/${orderId}/lines`);
    expect(req.request.method).toBe('GET');
    req.flush({ data: [{ systemId: lineId, sourceRequisitionLineId: lineId, quantity: '2.000000' }] });
    expect((await operation)[0].sourceRequisitionLineId).toBe(lineId);
  });

  it('fails closed when Laravel returns an unexpected response shape', async () => {
    const operation = firstValueFrom(api.getRequisition(requisitionId));
    http.expectOne(`${base}/purchaseRequisitions/${requisitionId}`).flush({ value: [] });
    await expect(operation).rejects.toThrow('Unexpected Laravel document response');
  });
});
