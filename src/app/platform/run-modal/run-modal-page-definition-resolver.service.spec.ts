import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RuntimeValueMapperService } from '../data/runtime-value-mapper.service';
import { PageModule, RunModalConfigResolver } from './run-modal-config.token';
import { RunModalPageDefinitionResolverService } from './run-modal-page-definition-resolver.service';

describe('RunModal page-definition resolver', () => {
  const create = (resolver: RunModalConfigResolver) =>
    new RunModalPageDefinitionResolverService(resolver, new RuntimeValueMapperService());

  it('normalizes and resolves a registered page while preserving the module instance', async () => {
    const module: PageModule = { purchaseOrderListConfig: { pageId: 'Purchase-Order' } };
    const load = vi.fn(async () => module);
    const value = await create(load).resolve('  PURCHASE-ORDER  ');
    expect(load).toHaveBeenCalledOnce();
    expect(load).toHaveBeenCalledWith('purchase-order');
    expect(value).toEqual({ pageId: 'purchase-order', module });
    expect(value?.module).toBe(module);
  });

  it('rejects blank requests before loading any registration', async () => {
    const load = vi.fn(async () => ({ page: { pageId: 'purchase-order' } }));
    expect(await create(load).resolve('  ')).toBeUndefined();
    expect(load).not.toHaveBeenCalled();
  });

  it('rejects modules that do not declare the requested page', async () => {
    const module = { list: { pageId: 'sales-order' }, other: { status: true } };
    expect(await create(async () => module).resolve('purchase-order')).toBeUndefined();
  });

  it('ignores unrelated primitive and null exports when checking registrations', async () => {
    const module = { ignored: null, text: 'purchase-order', nested: [{ pageId: 'purchase-order' }], valid: { pageId: 'purchase-order' } };
    const result = await create(async () => module).resolve('purchase-order');
    expect(result?.module).toBe(module);
  });

  it('rejects unresolved modules and handles loader failure without opening a page', async () => {
    expect(await create(async () => undefined).resolve('purchase-order')).toBeUndefined();
    expect(await create(async () => { throw new Error('registry unavailable'); }).resolve('purchase-order')).toBeUndefined();
  });

  it('requires an exact normalized page-id match, not a substring', async () => {
    const module = { child: { pageId: 'purchase-order-lines' } };
    expect(await create(async () => module).resolve('purchase-order')).toBeUndefined();
  });
});
