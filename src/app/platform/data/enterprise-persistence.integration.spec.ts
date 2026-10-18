import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DataSourceService, DATA_REST_SERVICE, DataRestService } from './data-source.service';
import { EntryHydrationOrchestratorService } from './entry-hydration-orchestrator.service';
import { customerListConfig } from '../../features/sales/customer/customer.config';
import {
  purchaseRequisitionLineConfig, purchaseRequisitionListConfig,
} from '../../features/purchasing/purchase-requisition/purchase-requisition.config';

describe('Generic Laravel master and document persistence', () => {
  const id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const lineId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  const get = vi.fn<DataRestService['get']>();
  const post = vi.fn<DataRestService['post']>();
  const patch = vi.fn<DataRestService['patch']>();
  const remove = vi.fn<DataRestService['delete']>();
  let data: DataSourceService;

  beforeEach(() => {
    vi.clearAllMocks();
    get.mockImplementation(() => of({ data: [] }));
    post.mockImplementation(() => of({ data: {} }));
    patch.mockImplementation(() => of({ data: {} }));
    remove.mockImplementation(() => of({}));
    TestBed.configureTestingModule({
      providers: [
        DataSourceService, EntryHydrationOrchestratorService,
        { provide: DATA_REST_SERVICE, useValue: {
          get, post, patch, delete: remove,
        } satisfies DataRestService },
      ],
    });
    data = TestBed.inject(DataSourceService);
  });

  it('loads the Customer list and card through the existing company-scoped API', async () => {
    const customer = { systemId: id, number: 'C0001', name: 'Customer A', systemRowVersion: 1 };
    get.mockReturnValueOnce(of({ data: [customer], meta: { currentPage: 1 } }));
    expect(await firstValueFrom(data.loadList(customerListConfig.dataSource, { skip: 0, top: 25 })))
      .toMatchObject({ value: [customer] });
    expect(get).toHaveBeenCalledWith('/customers?page=1&perPage=25');
    get.mockReturnValueOnce(of({ data: customer }));
    expect(await firstValueFrom(data.loadById(customerListConfig.dataSource, id))).toEqual(customer);
    expect(get).toHaveBeenCalledWith(`/customers/${id}`);
  });

  it('creates Customer without client-controlled identity, company or number series', async () => {
    const customer = { systemId: id, number: 'C0001', name: 'A', systemRowVersion: 1 };
    post.mockReturnValueOnce(of({ data: customer }));
    expect(await firstValueFrom(data.create(customerListConfig.dataSource, {
      name: 'A', email: '', systemId: 'spoofed', companyId: 'wrong',
    }))).toEqual(customer);
    expect(post).toHaveBeenCalledWith('/customers', { name: 'A' });
  });

  it('autosaves permitted Customer changes using its exact If-Match row version', async () => {
    const revised = { systemId: id, name: 'B', systemRowVersion: 2 };
    patch.mockReturnValueOnce(of({ data: revised }));
    expect(await firstValueFrom(data.update(customerListConfig.dataSource, id, { name: 'B' }, 1)))
      .toEqual(revised);
    expect(patch).toHaveBeenCalledWith(`/customers/${id}`, { name: 'B' }, '"1"');
  });

  it('does not fabricate autosave success for missing or stale versions', async () => {
    await expect(firstValueFrom(data.update(customerListConfig.dataSource, id, { name: 'B' })))
      .rejects.toThrow('version');
    patch.mockReturnValueOnce(throwError(() => ({ status: 412 })));
    await expect(firstValueFrom(data.update(customerListConfig.dataSource, id, { name: 'B' }, 1)))
      .rejects.toMatchObject({ status: 412 });
  });

  it('disables Customer deletion because the backend has no DELETE /customers route', async () => {
    await expect(firstValueFrom(data.delete(customerListConfig.dataSource, id)))
      .rejects.toThrow('Delete is not supported');
    expect(remove).not.toHaveBeenCalled();
  });

  it('creates a new PR independently of any old PO UI', async () => {
    const pr = { systemId: id, number: 'PR-0001', status: 'open', systemRowVersion: 1 };
    post.mockReturnValueOnce(of({ data: pr }));
    expect(await firstValueFrom(data.create(purchaseRequisitionListConfig.dataSource, {
      purpose: 'New laptops', requestedByUserId: 'spoofed',
    }))).toEqual(pr);
    expect(post).toHaveBeenCalledWith('/purchaseRequisitions', { purpose: 'New laptops' });
  });

  it('supports nested PR line CRUD using backend-assigned line numbers', async () => {
    const config = { ...purchaseRequisitionLineConfig.dataSource,
      endpoint: `/purchaseRequisitions/${id}/lines` };
    const line = { systemId: lineId, lineType: 'item', quantity: '2.000000', systemRowVersion: 1 };
    post.mockReturnValueOnce(of({ data: line }));
    expect(await firstValueFrom(data.create(config, {
      lineType: 'item', itemId: id, quantity: 2, lineNo: 10000, systemId: 'spoofed',
    }))).toEqual(line);
    expect(post).toHaveBeenCalledWith(`/purchaseRequisitions/${id}/lines`,
      { lineType: 'item', itemId: id, quantity: 2 });
    get.mockReturnValueOnce(of({ data: line }));
    expect(await firstValueFrom(data.loadById(config, lineId))).toEqual(line);
    patch.mockReturnValueOnce(of({ data: { ...line, quantity: '3.000000', systemRowVersion: 2 } }));
    await firstValueFrom(data.update(config, lineId, { quantity: 3 }, 1));
    expect(patch).toHaveBeenCalledWith(
      `/purchaseRequisitions/${id}/lines/${lineId}`, { quantity: 3 }, '"1"');
    await firstValueFrom(data.delete(config, lineId));
    expect(remove).toHaveBeenCalledWith(`/purchaseRequisitions/${id}/lines/${lineId}`);
  });

  it('hydrates nested PR lines from the parent system UUID, not the document number', async () => {
    const line = { systemId: lineId, lineNo: 10000, description: 'Laptop' };
    get.mockReturnValueOnce(of({ data: [line] }));
    const hydration = TestBed.inject(EntryHydrationOrchestratorService);
    expect(await hydration.loadLineRowsForHeader(purchaseRequisitionLineConfig.dataSource, {
      systemId: id, number: 'PR-0001',
    })).toEqual([line]);
    expect(get).toHaveBeenCalledWith(`/purchaseRequisitions/${id}/lines`);
  });
});
