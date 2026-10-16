import { Injectable } from '@angular/core';
import { Observable, map, throwError } from 'rxjs';
import { RestService } from '../../core/services/rest.service';

/**
 * Laravel's company-scoped procurement contract. Unlike the legacy BC-shaped
 * DataSourceService this API uses REST path segments, data/meta envelopes and
 * server-assigned document/line numbers.
 *
 * Authorization and company membership are enforced by Laravel. RestService
 * supplies the verified company scope and the active user's bearer token.
 */
export type PurchaseRequisitionStatus =
  | 'open' | 'pending_approval' | 'approved' | 'rejected' | 'cancelled';
export type PurchaseOrderStatus = 'open' | 'released' | 'cancelled';
export type ProcurementLineType = 'item' | 'gl_account';

export interface ProcurementPage<T> {
  records: T[];
  meta: { currentPage: number; perPage: number; total: number; lastPage: number };
}

export interface PurchaseRequisition {
  systemId: string;
  systemRowVersion: number;
  number: string;
  requestDate: string;
  requiredDate: string | null;
  purpose: string | null;
  requestedByUserId: string;
  locationId: string | null;
  status: PurchaseRequisitionStatus;
  lineCount: number;
  estimatedTotal: string;
  purchaseOrderCount: number;
  conversionStatus: 'not_converted' | 'partially_converted' | 'fully_converted';
}

export interface PurchaseRequisitionLine {
  systemId: string;
  systemRowVersion: number;
  purchaseRequisitionId: string;
  lineNo: number;
  lineType: ProcurementLineType;
  itemId: string | null;
  itemNo: string | null;
  glAccountId: string | null;
  glAccountNo: string | null;
  description: string;
  quantity: string;
  convertedQuantity: string;
  remainingQuantity: string;
  estimatedUnitCost: string;
  estimatedAmount: string;
  requiredDate: string | null;
}

export interface PurchaseOrder {
  systemId: string;
  systemRowVersion: number;
  number: string;
  sourceRequisitionId: string;
  sourceRequisitionNumber?: string;
  vendorId: string;
  vendorNo: string;
  vendorName: string;
  status: PurchaseOrderStatus;
  lineCount: number;
  amountTotal: string;
  receiptStatus: 'not_received' | 'partially_received' | 'fully_received';
}

export interface PurchaseOrderLine {
  systemId: string;
  purchaseOrderId: string;
  sourceRequisitionLineId: string;
  sourceRequisitionLineNo: number;
  lineType: ProcurementLineType;
  quantity: string;
  directUnitCost: string;
  lineAmount: string;
  quantityReceived: string;
  outstandingQuantity: string;
}

export interface RequisitionQuery {
  page?: number;
  perPage?: number;
  search?: string;
  status?: PurchaseRequisitionStatus;
}

export interface OrderQuery {
  page?: number;
  perPage?: number;
  search?: string;
  status?: PurchaseOrderStatus;
  sourceRequisitionId?: string;
}

export interface RequisitionHeaderInput {
  number?: string;
  selectedNoSeriesId?: string;
  requestDate?: string;
  requiredDate?: string | null;
  purpose?: string | null;
  locationId?: string | null;
  dimensions?: { dimensionId: string; dimensionValueId: string }[];
}

export interface RequisitionLineInput {
  lineType: ProcurementLineType;
  itemId?: string;
  glAccountId?: string;
  unitOfMeasureId?: string;
  locationId?: string | null;
  quantity: string;
  estimatedUnitCost?: string;
  requiredDate?: string | null;
  dimensions?: { dimensionId: string; dimensionValueId: string }[];
}

export interface ConversionInput {
  vendorId: string;
  number?: string;
  selectedNoSeriesId?: string;
  orderDate?: string;
  externalDocumentNo?: string;
  lines: {
    requisitionLineId: string;
    quantity: string;
    directUnitCost?: string;
  }[];
}

type RecordValue = Record<string, unknown>;

@Injectable({ providedIn: 'root' })
export class ProcurementApiService {
  constructor(private readonly rest: RestService) {}

  listRequisitions(query: RequisitionQuery = {}): Observable<ProcurementPage<PurchaseRequisition>> {
    return this.rest.get(this.withQuery('/purchaseRequisitions', query)).pipe(
      map(response => this.page<PurchaseRequisition>(response)),
    );
  }

  getRequisition(id: string): Observable<PurchaseRequisition> {
    return this.record<PurchaseRequisition>(this.rest.get(this.requisitionPath(id)));
  }

  createRequisition(input: RequisitionHeaderInput): Observable<PurchaseRequisition> {
    return this.record<PurchaseRequisition>(this.rest.post('/purchaseRequisitions', input));
  }

  updateRequisition(id: string, input: RequisitionHeaderInput, rowVersion: number): Observable<PurchaseRequisition> {
    return this.record<PurchaseRequisition>(
      this.rest.patch(this.requisitionPath(id), input, this.etag(rowVersion)),
    );
  }

  getRequisitionLines(id: string): Observable<PurchaseRequisitionLine[]> {
    return this.list<PurchaseRequisitionLine>(this.rest.get(`${this.requisitionPath(id)}/lines`));
  }

  addRequisitionLine(id: string, input: RequisitionLineInput): Observable<PurchaseRequisitionLine> {
    return this.record<PurchaseRequisitionLine>(
      this.rest.post(`${this.requisitionPath(id)}/lines`, input),
    );
  }

  updateRequisitionLine(id: string, lineId: string, input: Partial<RequisitionLineInput>, rowVersion: number): Observable<PurchaseRequisitionLine> {
    return this.record<PurchaseRequisitionLine>(
      this.rest.patch(`${this.requisitionPath(id)}/lines/${encodeURIComponent(lineId)}`, input, this.etag(rowVersion)),
    );
  }

  submitRequisition(id: string, comment?: string): Observable<PurchaseRequisition> {
    return this.requisitionAction(id, 'submit', comment);
  }

  approveRequisition(id: string, comment?: string): Observable<PurchaseRequisition> {
    return this.requisitionAction(id, 'approve', comment);
  }

  rejectRequisition(id: string, comment: string): Observable<PurchaseRequisition> {
    if (!comment.trim()) {
      return throwError(() => new Error('A rejection comment is required.'));
    }
    return this.requisitionAction(id, 'reject', comment);
  }

  reopenRequisition(id: string, comment?: string): Observable<PurchaseRequisition> {
    return this.requisitionAction(id, 'reopen', comment);
  }

  cancelRequisition(id: string, comment?: string): Observable<PurchaseRequisition> {
    return this.requisitionAction(id, 'cancel', comment);
  }

  convertToPurchaseOrder(requisitionId: string, input: ConversionInput): Observable<PurchaseOrder> {
    if (!input.vendorId.trim() || !input.lines.length) {
      return throwError(() => new Error('Choose a vendor and at least one requisition line.'));
    }
    const ids = new Set<string>();
    for (const line of input.lines) {
      if (!line.requisitionLineId.trim() || ids.has(line.requisitionLineId) ||
          !this.positiveDecimal(line.quantity) ||
          (line.directUnitCost !== undefined && !this.nonnegativeDecimal(line.directUnitCost))) {
        return throwError(() => new Error('Invalid conversion lines or quantities.'));
      }
      ids.add(line.requisitionLineId);
    }
    // Only Laravel may allocate the PO number and perform quantity/approval validation.
    return this.record<PurchaseOrder>(
      this.rest.post(`${this.requisitionPath(requisitionId)}/convertToPurchaseOrder`, input),
    );
  }

  listPurchaseOrders(query: OrderQuery = {}): Observable<ProcurementPage<PurchaseOrder>> {
    return this.rest.get(this.withQuery('/purchaseOrders', query)).pipe(
      map(response => this.page<PurchaseOrder>(response)),
    );
  }

  getPurchaseOrder(id: string): Observable<PurchaseOrder> {
    return this.record<PurchaseOrder>(this.rest.get(`/purchaseOrders/${encodeURIComponent(id)}`));
  }

  getPurchaseOrderLines(id: string): Observable<PurchaseOrderLine[]> {
    return this.list<PurchaseOrderLine>(this.rest.get(`/purchaseOrders/${encodeURIComponent(id)}/lines`));
  }

  releasePurchaseOrder(id: string, comment?: string): Observable<PurchaseOrder> {
    return this.orderAction(id, 'release', comment);
  }

  reopenPurchaseOrder(id: string, comment?: string): Observable<PurchaseOrder> {
    return this.orderAction(id, 'reopen', comment);
  }

  cancelPurchaseOrder(id: string, comment?: string): Observable<PurchaseOrder> {
    return this.orderAction(id, 'cancel', comment);
  }

  private requisitionPath(id: string): string {
    return `/purchaseRequisitions/${encodeURIComponent(id)}`;
  }

  private requisitionAction(
    id: string, action: 'submit' | 'approve' | 'reject' | 'reopen' | 'cancel', comment?: string,
  ): Observable<PurchaseRequisition> {
    return this.record<PurchaseRequisition>(
      this.rest.post(`${this.requisitionPath(id)}/${action}`, comment ? { comment } : {}),
    );
  }

  private orderAction(
    id: string, action: 'release' | 'reopen' | 'cancel', comment?: string,
  ): Observable<PurchaseOrder> {
    return this.record<PurchaseOrder>(
      this.rest.post(`/purchaseOrders/${encodeURIComponent(id)}/${action}`, comment ? { comment } : {}),
    );
  }

  private record<T>(source: Observable<unknown>): Observable<T> {
    return source.pipe(map(response => {
      const data = this.envelope(response);
      if (!this.isRecord(data) || typeof data['systemId'] !== 'string') {
        throw new Error('Unexpected Laravel document response.');
      }
      return data as unknown as T;
    }));
  }

  private list<T>(source: Observable<unknown>): Observable<T[]> {
    return source.pipe(map(response => {
      const data = this.envelope(response);
      if (!Array.isArray(data)) {
        throw new Error('Unexpected Laravel line collection response.');
      }
      return data as T[];
    }));
  }

  private page<T>(response: unknown): ProcurementPage<T> {
    const data = this.envelope(response);
    if (!Array.isArray(data)) {
      throw new Error('Unexpected Laravel paginated response.');
    }
    const meta = this.isRecord(response) && this.isRecord(response['meta']) ? response['meta'] : {};
    return {
      records: data as T[],
      meta: {
        currentPage: Number(meta['currentPage'] ?? 1),
        perPage: Number(meta['perPage'] ?? data.length),
        total: Number(meta['total'] ?? data.length),
        lastPage: Number(meta['lastPage'] ?? 1),
      },
    };
  }

  private envelope(response: unknown): unknown {
    return this.isRecord(response) ? response['data'] : undefined;
  }

  private isRecord(value: unknown): value is RecordValue {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  private etag(version: number): string {
    if (!Number.isSafeInteger(version) || version < 1) {
      throw new Error('Reload the record before saving: its row version is missing.');
    }
    return `"${version}"`;
  }

  private withQuery(path: string, query: RequisitionQuery | OrderQuery): string {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && String(value).trim()) {
        params.set(key, String(value));
      }
    }
    const suffix = params.toString();
    return suffix ? `${path}?${suffix}` : path;
  }

  private positiveDecimal(value: string): boolean {
    return /^\d{1,14}(?:\.\d{1,6})?$/.test(value) && Number(value) > 0;
  }

  private nonnegativeDecimal(value: string): boolean {
    return /^\d{1,14}(?:\.\d{1,6})?$/.test(value);
  }
}
