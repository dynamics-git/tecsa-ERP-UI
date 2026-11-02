import { describe, expect, it, vi } from 'vitest';
import { firstValueFrom, of } from 'rxjs';
import { SessionService } from '../../core/services/session.service';
import { WorkspaceContext } from '../../core/services/workspace-context';
import { DataSourceService } from './data-source.service';
import { EntityContractService } from './entity-contract.service';

function setup() {
  const row = { systemId: 'company-record', systemRowVersion: 1, code: 'TEST', name: 'Test' };
  const rest = {
    get: vi.fn(() => of({ data: { ...row } })),
    post: vi.fn(() => of({ data: { ...row } })),
    patch: vi.fn((_endpoint: string, payload: object) => {
      Object.assign(row, payload, { systemRowVersion: row.systemRowVersion + 1 });
      return of({ data: { ...row } });
    }),
    delete: vi.fn(() => of(null)),
  };
  const session = {
    Company: 'working-company',
    UserId: 'user',
    AccessToken: 'token',
    Permissions: [],
    SuperAdmin: true,
  } as unknown as SessionService;
  const data = new DataSourceService(rest, new EntityContractService(), session, {
    slug: 'workspace',
  } as WorkspaceContext);
  return { data, rest };
}

describe('Global company resource mutation bookkeeping', () => {
  it('completes create, cached-record updates, reopen and delete without reporting committed writes as failures', async () => {
    const { data, rest } = setup();
    const source = { endpoint: '/companies' };
    const created = await firstValueFrom(data.create(source, { code: 'TEST', name: 'Test' }));
    expect(created).toMatchObject({ systemId: 'company-record', systemRowVersion: 1 });
    expect(
      await firstValueFrom(data.update(source, 'company-record', { name: 'Updated' }, 1)),
    ).toMatchObject({ name: 'Updated', systemRowVersion: 2 });
    expect(
      await firstValueFrom(data.update(source, 'company-record', { displayName: 'Display' }, 2)),
    ).toMatchObject({ displayName: 'Display', systemRowVersion: 3 });
    expect(
      await firstValueFrom(data.loadById(source, 'company-record', { forceRefresh: true })),
    ).toMatchObject({ name: 'Updated', displayName: 'Display' });
    expect(await firstValueFrom(data.delete(source, 'company-record', 3))).toBeNull();
    expect(rest.post).toHaveBeenCalledOnce();
    expect(rest.patch).toHaveBeenCalledTimes(2);
    expect(rest.delete).toHaveBeenCalledWith('/companies/company-record', '"3"');
    expect(data.getResourceRevision(source)).toBe(4);
  });

  it('distinguishes a global company record from a company-scoped resource prefix', () => {
    const { data } = setup();
    expect(data.sameResource('/companies/company-record', '/companies')).toBe(true);
    expect(data.sameResource('/companies/scope/items/item-record', '/items')).toBe(true);
    expect(data.sameResource('/companies/scope/items', '/companies')).toBe(false);
    expect(data.sameResource('/items(item-record)', '/items')).toBe(true);
    expect(
      data.sameResource(
        '/purchaseRequisitions/header/notes/note',
        '/purchaseRequisitions/header/notes',
      ),
    ).toBe(true);
  });
});
