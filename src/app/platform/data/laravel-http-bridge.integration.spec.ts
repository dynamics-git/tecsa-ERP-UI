import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting, TestRequest } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { dataRestProvider } from '../../core/api/rest.provider';
import { PageCatalogService } from '../../core/services/page-catalog.service';
import { SessionService } from '../../core/services/session.service';
import { WorkspaceContext } from '../../core/services/workspace-context';
import { DataSourceService } from './data-source.service';

/**
 * UI -> real RestService/HttpClient adapter -> HTTP transport boundary.
 * The HTTP fixture has EntityController's actual Laravel data/ETag/204 shape.
 * This test deliberately does not substitute a mocked DATA_REST_SERVICE.
 *
 * The backend's companion EntityRuntimeTest runs the same HTTP contract
 * against a real disposable PostgreSQL database. This is not a live
 * cross-repository browser test.
 */
describe('Laravel HTTP contract through the production Angular REST adapter', () => {
  const base = environment.apiBaseUrl.replace(/\/$/, '');
  const companyA = '11111111-1111-4111-8111-111111111111';
  const companyB = '22222222-2222-4222-8222-222222222222';
  const rowId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const source = { endpoint: '/sourceCodes', keyField: 'systemId' };
  let http: HttpTestingController;
  let data: DataSourceService;
  let session: {
    Company: string;
    UserId: string;
    AccessToken: string;
    Permissions: unknown[];
    SuperAdmin: boolean;
    logout: ReturnType<typeof vi.fn>;
  };

  const record = (version: number, description = 'Before') => ({
    systemId: rowId,
    systemRowVersion: version,
    companyId: companyA,
    code: 'REFERENCE',
    description,
    isActive: true,
  });
  const resource = (company = companyA) => `${base}/companies/${company}/sourceCodes`;

  /** Mutations are queued; wait for the actual HttpClient request, not a timer. */
  async function receive(method: string, path: string): Promise<TestRequest> {
    let request: TestRequest | undefined;
    await vi.waitFor(() => {
      if (request) return;
      const matches = http.match(req => req.method === method && req.url.split('?')[0] === path);
      if (matches.length !== 1) throw new Error(`Expected one pending ${method} ${path}, got ${matches.length}`);
      request = matches[0];
    });
    return request!;
  }

  beforeEach(() => {
    session = {
      Company: companyA,
      UserId: 'reference-user',
      AccessToken: 'isolated-token',
      Permissions: [],
      SuperAdmin: false,
      logout: vi.fn(),
    };
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        dataRestProvider,
        { provide: SessionService, useValue: session },
        { provide: WorkspaceContext, useValue: { slug: '' } },
        { provide: PageCatalogService, useValue: { read: () => undefined } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    data = TestBed.inject(DataSourceService);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    try {
      http.verify();
    } finally {
      vi.restoreAllMocks();
      TestBed.resetTestingModule();
    }
  });

  it('round-trips Laravel list, detail cache, create, PATCH with If-Match, and DELETE 204', async () => {
    const listPromise = firstValueFrom(data.loadList(source, { top: 20, useCache: true }));
    const listRequest = await receive('GET', resource());
    expect(listRequest.request.urlWithParams).toContain('%24top=20');
    expect(listRequest.request.headers.get('Authorization')).toBe('Bearer isolated-token');
    listRequest.flush({ data: [record(1)], meta: { total: 1, recordShape: 'complete' } });
    const list = await listPromise;
    expect(list).toMatchObject({ value: [{ code: 'REFERENCE', systemRowVersion: 1 }], meta: { total: 1 } });

    // The server explicitly labels the list row complete: no second GET.
    const editor = await firstValueFrom(data.loadById(source, rowId, { useCache: true })) as Record<string, unknown>;
    expect(editor).toMatchObject(record(1));
    http.expectNone(req => req.method === 'GET' && req.url.endsWith('/sourceCodes/' + rowId));

    const createPromise = firstValueFrom(data.create(source, { code: ' NEW ', description: 'Created' }));
    const createRequest = await receive('POST', resource());
    expect(createRequest.request.headers.get('Authorization')).toBe('Bearer isolated-token');
    expect(createRequest.request.body).toEqual({ code: ' NEW ', description: 'Created' });
    createRequest.flush({
      data: { ...record(1, 'Created'), systemId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', code: 'NEW' },
    }, { status: 201, statusText: 'Created', headers: { ETag: '"1"' } });
    expect(await createPromise).toMatchObject({ code: 'NEW', systemRowVersion: 1 });

    const updatePromise = firstValueFrom(data.updateRecord(source, rowId, { description: 'Changed' }, editor));
    const updateRequest = await receive('PATCH', resource() + '/' + rowId);
    expect(updateRequest.request.headers.get('If-Match')).toBe('"1"');
    expect(updateRequest.request.body).toEqual({ description: 'Changed' });
    updateRequest.flush({ data: record(2, 'Changed') }, { headers: { ETag: '"2"' } });
    expect(await updatePromise).toMatchObject({ description: 'Changed', systemRowVersion: 2 });
    expect(editor['systemRowVersion']).toBe(2);

    const deletePromise = firstValueFrom(data.delete(source, rowId, editor['systemRowVersion']));
    const deleteRequest = await receive('DELETE', resource() + '/' + rowId);
    expect(deleteRequest.request.headers.get('If-Match')).toBe('"2"');
    deleteRequest.flush(null, { status: 204, statusText: 'No Content' });
    expect(await deletePromise).toBeNull();
    expect(session.logout).not.toHaveBeenCalled();
    http.expectNone(req => req.url.includes('/auth/context'));
  });

  it('preserves dirty edits on Laravel 412 and never blindly retries a stale PATCH', async () => {
    const editor = { ...record(1), description: 'Typed but unsaved' };
    const first = firstValueFrom(data.updateRecord(source, rowId, { description: editor.description }, editor));
    const updateRequest = await receive('PATCH', resource() + '/' + rowId);
    expect(updateRequest.request.headers.get('If-Match')).toBe('"1"');
    updateRequest.flush({ message: 'Record changed' }, { status: 412, statusText: 'Precondition Failed' });
    await expect(first).rejects.toMatchObject({ status: 412 });
    expect(editor.description).toBe('Typed but unsaved');
    await expect(firstValueFrom(data.updateRecord(source, rowId, { description: 'Unsafe retry' }, editor)))
      .rejects.toMatchObject({ status: 412 });
    http.expectNone(req => req.method === 'PATCH');
    expect(session.logout).not.toHaveBeenCalled();
    http.expectNone(req => req.url.includes('/auth/context'));
  });

  it('uses the newly selected company for its next Page GET, without a context API fetch', async () => {
    const first = firstValueFrom(data.loadList(source, { useCache: true }));
    (await receive('GET', resource())).flush({ data: [record(1)], meta: { total: 1, recordShape: 'complete' } });
    await first;
    session.Company = companyB;
    const second = firstValueFrom(data.loadList(source, { useCache: true }));
    const next = await receive('GET', resource(companyB));
    expect(next.request.headers.get('Authorization')).toBe('Bearer isolated-token');
    next.flush({ data: [], meta: { total: 0, recordShape: 'complete' } });
    expect(await second).toMatchObject({ value: [] });
    http.expectNone(req => req.url.includes('/auth/context'));
  });
});
