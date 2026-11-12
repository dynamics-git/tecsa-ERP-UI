import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { firstValueFrom, of, Subject } from 'rxjs';
import { SessionService } from '../../core/services/session.service';
import { DATA_REST_SERVICE, DataSourceService } from './data-source.service';

describe('Shared data cache session identity', () => {
  let session: SessionService;
  let source: DataSourceService;
  let get: ReturnType<typeof vi.fn>;
  const config = { endpoint: '/fixtureChoices' };

  beforeEach(() => {
    localStorage.clear();
    get = vi.fn(() => of({ data: Array.from({ length: 25 }, (_, id) => ({ systemId: String(id) })) }));
    TestBed.configureTestingModule({ providers: [provideRouter([]), { provide: DATA_REST_SERVICE, useValue: { get } }] });
    session = TestBed.inject(SessionService);
    session.User = { systemId: 'fixture-user' };
    session.Company = 'fixture-company';
    session.AccessToken = 'fixture-token';
    source = TestBed.inject(DataSourceService);
  });

  afterEach(() => { vi.restoreAllMocks(); TestBed.resetTestingModule(); localStorage.clear(); });

  it('does not parse or serialize the permission matrix while reading and caching dropdown records', async () => {
    const permissions = Array.from({ length: 1000 }, (_, id) => ({ pageId: 'page-' + id, canRead: true }));
    const stored = JSON.stringify(permissions);
    session.Permissions = permissions;
    const parse = vi.spyOn(JSON, 'parse');
    const stringify = vi.spyOn(JSON, 'stringify');
    await firstValueFrom(source.loadList(config, { useCache: true }));
    await firstValueFrom(source.loadList(config, { useCache: true }));
    expect(get).toHaveBeenCalledTimes(1);
    expect(parse.mock.calls.some(([value]) => value === stored)).toBe(false);
    expect(stringify.mock.calls.some(([value]) => Array.isArray(value) && value.length === permissions.length)).toBe(false);
  });

  it('invalidates cached choices when stored permissions change, including changes from another tab', async () => {
    session.Permissions = [{ pageId: 'fixture', canRead: true }];
    await firstValueFrom(source.loadList(config, { useCache: true }));
    const permissionsKey = Object.keys(localStorage).find(key => key.endsWith('app-permissions'))!;
    expect(permissionsKey).toBeTruthy();
    localStorage.setItem(permissionsKey, JSON.stringify([{ pageId: 'fixture', canRead: false }]));
    await firstValueFrom(source.loadList(config, { useCache: true }));
    expect(get).toHaveBeenCalledTimes(2);
  });

  it('rejects an in-flight response when grants change before it returns', async () => {
    const pending = new Subject<unknown>();
    get.mockReturnValue(pending);
    const response = firstValueFrom(source.loadList(config, { useCache: true }));
    const rejected = expect(response).rejects.toThrow('company or session changed');
    session.Permissions = [{ pageId: 'fixture', canRead: false }];
    pending.next({ data: [] }); pending.complete();
    await rejected;
  });
});
