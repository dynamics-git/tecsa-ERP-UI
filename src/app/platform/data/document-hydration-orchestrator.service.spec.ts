import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SessionService } from '../../core/services/session.service';
import { DataSourceConfig } from '../models/data-source-config.model';
import { DATA_REST_SERVICE, DataSourceService } from './data-source.service';
import { DocumentHydrationOrchestratorService } from './document-hydration-orchestrator.service';

describe('Document line pagination through the shared data source', () => {
  const config: DataSourceConfig = {
    endpoint: '/fixtureHeaders',
    keyField: 'systemId',
    pageSize: 2,
    navigation: {
      parentEndpoint: '/fixtureHeaders',
      parentIdFields: ['systemId'],
      childCollection: 'lines',
    },
  };
  const header = { systemId: 'header-1' };
  let get: ReturnType<typeof vi.fn>;
  let source: DataSourceService;
  let hydration: DocumentHydrationOrchestratorService;

  beforeEach(() => {
    get = vi.fn(() => of({ data: [], meta: { total: 0 } }));
    TestBed.configureTestingModule({
      providers: [
        {
          provide: SessionService,
          useValue: { Company: 'A', UserId: 'fixture-user', AccessToken: 'fixture-token' },
        },
        { provide: DATA_REST_SERVICE, useValue: { get } },
      ],
    });
    source = TestBed.inject(DataSourceService);
    hydration = TestBed.inject(DocumentHydrationOrchestratorService);
  });

  afterEach(() => TestBed.resetTestingModule());

  it.each([{}, { total: 0 }, { total: 1 }])(
    'finishes an empty collection with metadata %j without requesting that page again',
    async meta => {
      get.mockReturnValue(of({ data: [], meta }));
      const loadList = source.loadList.bind(source);
      let reads = 0;
      vi.spyOn(source, 'loadList').mockImplementation((sourceConfig, options) => {
        // Bound the regression: the old implementation otherwise loops over its cache forever.
        if (++reads > 1) throw new Error('The empty page was requested again.');
        return loadList(sourceConfig, options);
      });
      await expect(hydration.loadLineRowsForHeader(config, header)).resolves.toEqual([]);
      expect(reads).toBe(1);
      expect(get).toHaveBeenCalledOnce();
    },
  );

  it('preserves loaded lines when a later empty page has a stale positive total', async () => {
    const rows = [{ systemId: 'line-1' }, { systemId: 'line-2' }];
    get.mockReturnValueOnce(of({ data: rows, meta: { total: 5 } }));
    get.mockReturnValue(of({ data: [], meta: { total: 5 } }));
    const loadList = source.loadList.bind(source);
    let reads = 0;
    vi.spyOn(source, 'loadList').mockImplementation((sourceConfig, options) => {
      if (++reads > 2) throw new Error('The empty page was requested again.');
      return loadList(sourceConfig, options);
    });
    await expect(hydration.loadLineRowsForHeader(config, header)).resolves.toEqual(rows);
    expect(reads).toBe(2);
    expect(get).toHaveBeenCalledTimes(2);
    expect(new URL(get.mock.calls[1][0], 'http://fixture').searchParams.get('$skip')).toBe('2');
  });

  it.each([{}, { total: 3 }])('still loads every normal page with metadata %j', async meta => {
    const rows = [{ systemId: 'line-1' }, { systemId: 'line-2' }, { systemId: 'line-3' }];
    get.mockReturnValueOnce(of({ data: rows.slice(0, 2), meta }));
    get.mockReturnValueOnce(of({ data: rows.slice(2), meta }));
    await expect(hydration.loadLineRowsForHeader(config, header)).resolves.toEqual(rows);
    expect(get).toHaveBeenCalledTimes(2);
  });

  it('reuses a confirmed empty collection without a new request or loading notification', async () => {
    const onRequest = vi.fn();
    await hydration.loadLineRowsForHeader(config, header, { onRequest });
    expect(onRequest).toHaveBeenCalledOnce();
    onRequest.mockClear();
    await expect(hydration.loadLineRowsForHeader(config, header, { onRequest })).resolves.toEqual([]);
    expect(get).toHaveBeenCalledOnce();
    expect(onRequest).not.toHaveBeenCalled();
  });

  it('propagates a failed line request instead of presenting it as an empty collection', async () => {
    get.mockReturnValue(throwError(() => new Error('Line request failed')));
    await expect(hydration.loadLineRowsForHeader(config, header)).rejects.toThrow('Line request failed');
    expect(get).toHaveBeenCalledOnce();
  });
});
