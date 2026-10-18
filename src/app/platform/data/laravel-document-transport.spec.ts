import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { purchaseOrderLineConfig, purchaseOrderListConfig } from '../../features/purchasing/purchase-order/purchase-order.config';
import { EntryHydrationOrchestratorService } from './entry-hydration-orchestrator.service';
import { DataSourceService, DATA_REST_SERVICE, DataRestService } from './data-source.service';

describe('Reusable Laravel document transport for Purchase Order', () => {
  const recordId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const lineId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  const get = vi.fn<DataRestService['get']>();
  const post = vi.fn<DataRestService['post']>();
  const patch = vi.fn<DataRestService['patch']>();
  const remove = vi.fn<DataRestService['delete']>();
  let data: DataSourceService;
  let hydration: EntryHydrationOrchestratorService;

  beforeEach(() => {
    vi.clearAllMocks();
    get.mockImplementation(() => of({ data: [] }));
    post.mockImplementation(() => of({ data: {} }));
    patch.mockImplementation(() => of({ data: {} }));
    remove.mockImplementation(() => of({}));
    TestBed.configureTestingModule({
      providers: [
        DataSourceService,
        EntryHydrationOrchestratorService,
        { provide: DATA_REST_SERVICE, useValue: {
          get, post, patch, delete: remove,
        } satisfies DataRestService },
      ],
    });
    data = TestBed.inject(DataSourceService);
    hydration = TestBed.inject(EntryHydrationOrchestratorService);
  });

  it('paginates Laravel PO list without sending obsolete OData query parameters', async () => {
    const first = { systemId: recordId, number: 'PO-0001', systemRowVersion: 4 };
    get.mockReturnValueOnce(of({ data: [first], meta: { currentPage: 1, perPage: 20, total: 1, lastPage: 1 } }));
    expect(await firstValueFrom(data.loadList(purchaseOrderListConfig.dataSource, { skip: 0, top: 20 })))
      .toEqual({ value: [first] });
    expect(get).toHaveBeenCalledWith('/purchaseOrders?page=1&perPage=20');
    get.mockReturnValueOnce(of({ data: [], meta: { currentPage: 2 } }));
    await firstValueFrom(data.loadList(purchaseOrderListConfig.dataSource, { skip: 20, top: 20 }));
    expect(get).toHaveBeenCalledWith('/purchaseOrders?page=2&perPage=20');
  });

  it('loads an individual Laravel record using slash routes and unwraps its data', async () => {
    const order = { systemId: recordId, number: 'PO-0001', systemRowVersion: 4 };
    get.mockReturnValueOnce(of({ data: order }));
    expect(await firstValueFrom(data.loadById(purchaseOrderListConfig.dataSource, recordId))).toEqual(order);
    expect(get).toHaveBeenCalledWith(`/purchaseOrders/${recordId}`);
  });

  it('loads existing PO lines through the parent route rather than old document number filters', async () => {
    const line = { systemId: lineId, lineNo: 10000, description: 'A', systemRowVersion: 2 };
    get.mockReturnValueOnce(of({ data: [line] }));
    const result = await hydration.loadLineRowsForHeader(
      purchaseOrderLineConfig.dataSource,
      { systemId: recordId, number: 'PO-0001' },
    );
    expect(result).toEqual([line]);
    expect(get).toHaveBeenCalledWith(`/purchaseOrders/${recordId}/lines`);
  });

  it('autosaves allowed header fields using the exact row-version ETag', async () => {
    const revised = { systemId: recordId, systemRowVersion: 5, externalDocumentNo: 'EXT-22' };
    patch.mockReturnValueOnce(of({ data: revised }));
    const result = await firstValueFrom(data.update(
      purchaseOrderListConfig.dataSource, recordId,
      { externalDocumentNo: 'EXT-22' }, 4,
    ));
    expect(result).toEqual(revised);
    expect(patch).toHaveBeenCalledWith(
      `/purchaseOrders/${recordId}`, { externalDocumentNo: 'EXT-22' }, '"4"',
    );
  });

  it('autosaves existing lines with a row version on the correct child route', async () => {
    const source = { ...purchaseOrderLineConfig.dataSource,
      endpoint: `/purchaseOrders/${recordId}/lines` };
    const revised = { systemId: lineId, systemRowVersion: 3, quantity: '3.000000' };
    patch.mockReturnValueOnce(of({ data: revised }));
    const result = await firstValueFrom(data.update(source, lineId, { quantity: '3.000000' }, 2));
    expect(result).toEqual(revised);
    expect(patch).toHaveBeenCalledWith(
      `/purchaseOrders/${recordId}/lines/${lineId}`,
      { quantity: '3.000000' }, '"2"',
    );
  });

  it('rejects stale/missing row versions before performing any write', async () => {
    await expect(firstValueFrom(data.update(
      purchaseOrderListConfig.dataSource, recordId, { externalDocumentNo: 'X' },
    ))).rejects.toThrow('row version');
    await expect(firstValueFrom(data.update(
      purchaseOrderListConfig.dataSource, recordId, { externalDocumentNo: 'X' }, 0,
    ))).rejects.toThrow('row version');
    expect(patch).not.toHaveBeenCalled();
  });

  it('blocks server-owned or legacy BC payload fields before patching', async () => {
    await expect(firstValueFrom(data.update(
      purchaseOrderListConfig.dataSource, recordId, { vendorNo: 'V-001' }, 3,
    ))).rejects.toThrow('cannot be changed');
    await expect(firstValueFrom(data.update(
      purchaseOrderLineConfig.dataSource, lineId, { lineType: 'item' }, 3,
    ))).rejects.toThrow('cannot be changed');
    expect(patch).not.toHaveBeenCalled();
  });

  it('prevents direct PO creation, header deletion and line creation/deletion', async () => {
    await expect(firstValueFrom(data.create(purchaseOrderListConfig.dataSource, {})))
      .rejects.toThrow('approved business workflow');
    await expect(firstValueFrom(data.delete(purchaseOrderListConfig.dataSource, recordId)))
      .rejects.toThrow('not supported');
    await expect(firstValueFrom(data.create(purchaseOrderLineConfig.dataSource, {})))
      .rejects.toThrow('approved business workflow');
    await expect(firstValueFrom(data.delete(purchaseOrderLineConfig.dataSource, lineId)))
      .rejects.toThrow('not supported');
    expect(post).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
  });

  it('reports server failures instead of manufacturing a successful save', async () => {
    patch.mockReturnValueOnce(throwError(() => ({ status: 412, error: { message: 'Version conflict' } })));
    await expect(firstValueFrom(data.update(
      purchaseOrderListConfig.dataSource, recordId, { externalDocumentNo: 'X' }, 1,
    ))).rejects.toMatchObject({ status: 412 });
    get.mockReturnValueOnce(of({ value: [{ number: 'Old response' }] }));
    await expect(firstValueFrom(data.loadList(purchaseOrderListConfig.dataSource)))
      .rejects.toThrow('Unexpected Laravel list data');
  });
});
