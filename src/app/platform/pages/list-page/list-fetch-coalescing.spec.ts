import { Subject } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { DocumentPageListLifecycleContext, DocumentPageListLifecycleService } from '../document-page-list-lifecycle.service';

describe('List in-flight read coalescing', () => {
  function context() {
    const replies = [new Subject<unknown>(), new Subject<unknown>()];
    let loading = false;
    let filter = '';
    let reads = 0;
    const load = vi.fn(() => replies[reads++]);
    const ctx: DocumentPageListLifecycleContext = {
      listDataSource: { endpoint: '/fixtures', keyField: 'systemId', pageSize: 25 },
      listLoadingScope: 'fixtures', listFilterScope: 'fixtures', listTitle: 'Fixtures',
      rows: [], hasMore: true, pendingFirstPageReload: false, checkedRowKeys: new Set(),
      get loading() { return loading; },
      buildFilter: () => filter, hydrateTargetsFromRecords: () => undefined,
      loadList: load, toRecords: response => (response as { value: unknown[] }).value,
      getErrorMessage: () => 'Read failed', detectChanges: () => undefined,
      isScopeLoading: () => loading, setScopeMessage: () => undefined,
      beginScopeLoading: () => { loading = true; }, endScopeLoading: () => { loading = false; },
    };
    return { ctx, replies, load, setFilter: (value: string) => { filter = value; } };
  }

  it('does not queue a redundant ordinary load behind an in-flight list read', () => {
    const service = new DocumentPageListLifecycleService();
    const { ctx, replies, load } = context();
    service.loadFirstPage(ctx);
    service.loadFirstPage(ctx);
    service.loadFirstPage(ctx);
    expect(ctx.pendingFirstPageReload).toBe(false);
    replies[0].next({ value: [{ systemId: 'one' }], meta: { total: 1 } });
    expect(load).toHaveBeenCalledOnce();
    expect(ctx.rows).toEqual([{ systemId: 'one' }]);
    expect(ctx.loading).toBe(false);
    ctx.listLoadSubscription?.unsubscribe();
  });

  it('coalesces filter/data invalidation into one forced read using the latest filter', () => {
    const service = new DocumentPageListLifecycleService();
    const { ctx, replies, load, setFilter } = context();
    service.loadFirstPage(ctx);
    setFilter("code eq 'latest'");
    service.loadFirstPage(ctx, true);
    service.loadFirstPage(ctx, true);
    replies[0].next({ value: [{ systemId: 'old' }], meta: { total: 1 } });
    expect(load).toHaveBeenCalledTimes(2);
    expect(load.mock.calls[1]).toEqual([
      expect.objectContaining({ defaultFilter: "code eq 'latest'" }),
      expect.objectContaining({ forceRefresh: true, skip: 0 }),
    ]);
    replies[1].next({ value: [{ systemId: 'new' }], meta: { total: 1 } });
    expect(ctx.rows).toEqual([{ systemId: 'new' }]);
    expect(ctx.pendingFirstPageReload).toBe(false);
    expect(ctx.loading).toBe(false);
    ctx.listLoadSubscription?.unsubscribe();
  });
});
