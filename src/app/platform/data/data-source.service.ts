import { Inject, Injectable, InjectionToken, Optional } from '@angular/core';
import { Observable, of, throwError, map } from 'rxjs';
import { finalize, shareReplay, tap } from 'rxjs/operators';
import { DataSourceConfig } from '../models/data-source-config.model';
import { EntityContractService } from './entity-contract.service';

export interface DataRestService {
  get(endpoint: string): Observable<unknown>;
  post(endpoint: string, payload: unknown): Observable<unknown>;
  patch(endpoint: string, payload: unknown, ifMatch?: string): Observable<unknown>;
  delete(endpoint: string): Observable<unknown>;
}

export const DATA_REST_SERVICE = new InjectionToken<DataRestService>('RestService');

export interface DataSourceLoadOptions {
  skip?: number;
  top?: number;
  forceRefresh?: boolean;
  useCache?: boolean;
}

type CachedListResponse = {
  response: unknown;
  cachedAt: number;
};

const DEFAULT_LIST_CACHE_TTL_MS = 5 * 60 * 1000;

@Injectable({
  providedIn: 'root'
})
export class DataSourceService {
  private readonly listCache = new Map<string, CachedListResponse>();
  private readonly inFlightLists = new Map<string, Observable<unknown>>();
  private readonly inFlightRecords = new Map<string, Observable<unknown>>();

  constructor(
    @Optional() @Inject(DATA_REST_SERVICE) private readonly restService: DataRestService | null,
    private readonly contractService: EntityContractService
  ) {}

  loadList(config: DataSourceConfig, options?: DataSourceLoadOptions): Observable<unknown> {
    const endpoint = this.getListEndpoint(config, options);

    if (!endpoint) {
      return this.missingEndpoint();
    }

    if (!this.restService) {
      return this.restServiceUnavailable();
    }

    const cached = this.listCache.get(endpoint);
    if (!options?.forceRefresh && options?.useCache === true && cached && Date.now() - cached.cachedAt <= DEFAULT_LIST_CACHE_TTL_MS) {
      return of(cached.response);
    }

    if (cached) {
      this.listCache.delete(endpoint);
    }

    const cachedRequest = this.inFlightLists.get(endpoint);
    if (cachedRequest) {
      return cachedRequest;
    }

    const request$ = this.restService.get(endpoint).pipe(
      map((response) => this.normalizeListResponse(config, response)),
      tap((response) => {
        this.listCache.set(endpoint, {
          response,
          cachedAt: Date.now()
        });
      }),
      finalize(() => {
        this.inFlightLists.delete(endpoint);
      }),
      shareReplay({ bufferSize: 1, refCount: false })
    );

    this.inFlightLists.set(endpoint, request$);
    return request$;
  }

  getCachedList(
    config: DataSourceConfig,
    options?: DataSourceLoadOptions,
    maxAgeMs = DEFAULT_LIST_CACHE_TTL_MS
  ): unknown | undefined {
    const endpoint = this.getListEndpoint(config, options);
    const cached = this.listCache.get(endpoint);

    if (!cached) {
      return undefined;
    }

    if (Date.now() - cached.cachedAt > maxAgeMs) {
      this.listCache.delete(endpoint);
      return undefined;
    }

    return cached.response;
  }

  loadById(config: DataSourceConfig, id: unknown): Observable<unknown> {
    const endpoint = this.getEndpoint(config);

    if (!endpoint) {
      return this.missingEndpoint();
    }

    if (id === null || id === undefined || id === '') {
      return throwError(() => new Error('ERP data source id is required'));
    }

    if (!this.restService) {
      return this.restServiceUnavailable();
    }

    const recordEndpoint = config.transport === 'laravel'
      ? `${endpoint}/${encodeURIComponent(String(id))}`
      : `${endpoint}(${this.formatId(id)})`;
    const cachedRequest = this.inFlightRecords.get(recordEndpoint);
    if (cachedRequest) {
      return cachedRequest;
    }

    const request$ = this.restService.get(recordEndpoint).pipe(
      map((response) => this.normalizeRecordResponse(config, response)),
      finalize(() => {
        this.inFlightRecords.delete(recordEndpoint);
      }),
      shareReplay({ bufferSize: 1, refCount: false }),
    );

    this.inFlightRecords.set(recordEndpoint, request$);
    return request$;
  }

  create(config: DataSourceConfig, payload: unknown): Observable<unknown> {
    const endpoint = this.getEndpoint(config);
    if (!endpoint) {
      return this.missingEndpoint();
    }

    if (!this.restService) {
      return this.restServiceUnavailable();
    }

    if (config.supportsCreate === false) {
      return throwError(() => new Error('Create is not supported by this business API.'));
    }
    const source = this.contractService.sanitizePayload(config, 'create', payload);
    const sanitizedPayload = config.transport === 'laravel'
      ? this.laravelPayload(source, config.createFields)
      : source;
    this.clearListCacheForEndpoint(endpoint);
    this.clearInFlightRecordRequestsForEndpoint(endpoint);
    return this.restService.post(endpoint, sanitizedPayload).pipe(
      map((response) => this.normalizeRecordResponse(config, response)),
    );
  }

  update(config: DataSourceConfig, id: unknown, payload: unknown, rowVersion?: number): Observable<unknown> {
    const endpoint = this.getEndpoint(config);
    if (!endpoint) {
      return this.missingEndpoint();
    }

    if (id === null || id === undefined || id === '') {
      return throwError(() => new Error('ERP data source id is required'));
    }

    if (!this.restService) {
      return this.restServiceUnavailable();
    }

    if (config.supportsUpdate === false) {
      return throwError(() => new Error('Update is not supported by this business API.'));
    }
    if (config.transport === 'laravel') {
      if (!Number.isSafeInteger(rowVersion) || (rowVersion ?? 0) < 1) {
        return throwError(() => new Error('Reload this record before saving; its version is missing.'));
      }
      const values = this.laravelPayload(payload, config.updateFields, true);
      if (!Object.keys(values).length) {
        return throwError(() => new Error('No permitted changes were supplied.'));
      }
      this.clearListCacheForEndpoint(endpoint);
      this.clearInFlightRecordRequestsForEndpoint(endpoint);
      return this.restService.patch(
        `${endpoint}/${encodeURIComponent(String(id))}`,
        values,
        `"${rowVersion}"`,
      ).pipe(map((response) => this.normalizeRecordResponse(config, response)));
    }
    const sanitizedPayload = this.contractService.sanitizePayload(config, 'update', payload);
    this.clearListCacheForEndpoint(endpoint);
    this.clearInFlightRecordRequestsForEndpoint(endpoint);
    return this.restService.patch(`${endpoint}(${this.formatId(id)})`, sanitizedPayload, '*');
  }

  delete(config: DataSourceConfig, id: unknown): Observable<unknown> {
    const endpoint = this.getEndpoint(config);
    if (!endpoint) {
      return this.missingEndpoint();
    }

    if (id === null || id === undefined || id === '') {
      return throwError(() => new Error('ERP data source id is required'));
    }

    if (!this.restService) {
      return this.restServiceUnavailable();
    }

    if (config.supportsDelete === false) {
      return throwError(() => new Error('Delete is not supported by this business API.'));
    }
    this.clearListCacheForEndpoint(endpoint);
    this.clearInFlightRecordRequestsForEndpoint(endpoint);
    const url = config.transport === 'laravel'
      ? `${endpoint}/${encodeURIComponent(String(id))}`
      : `${endpoint}(${this.formatId(id)})`;
    return this.restService.delete(url);
  }

  private getEndpoint(config: DataSourceConfig): string {
    return config.endpoint?.trim() ?? '';
  }

  private getListEndpoint(config: DataSourceConfig, options?: DataSourceLoadOptions): string {
    const endpoint = this.getEndpoint(config);
    if (config.transport === 'laravel') {
      if (config.navigation?.style === 'rest') {
        return endpoint; // Nested Laravel collections return {data: []} without pagination.
      }
      const top = Math.min(config.maxPageSize ?? 200, Math.max(1, options?.top ?? config.pageSize ?? 20));
      const page = Math.floor(Math.max(0, options?.skip ?? 0) / top) + 1;
      const query = new URLSearchParams({ page: String(page), perPage: String(top) });
      const filter = config.defaultFilter?.trim();
      if (filter) {
        const match = /^([a-zA-Z][a-zA-Z0-9_]*)\\s+eq\\s+'([^']+)'$/i.exec(filter);
        if (!match || !(config.filterFields ?? []).includes(match[1])) {
          throw new Error('This filter is not supported by the configured ERP API.');
        }
        query.set(match[1], match[2]);
      }
      return `${endpoint}${endpoint.includes('?') ? '&' : '?'}${query.toString()}`;
    }
    const queryParts: string[] = [];

    if (config.defaultFilter) {
      queryParts.push(`$filter=${encodeURIComponent(config.defaultFilter)}`);
    }

    if (config.defaultSort) {
      queryParts.push(`$orderby=${encodeURIComponent(config.defaultSort)}`);
    }

    const top = options?.top ?? config.pageSize;
    const skip = options?.skip;

    if (top) {
      queryParts.push(`$top=${top}`);
    }

    if (skip) {
      queryParts.push(`$skip=${skip}`);
    }

    if (!queryParts.length) {
      return endpoint;
    }

    return `${endpoint}${endpoint.includes('?') ? '&' : '?'}${queryParts.join('&')}`;
  }

  private normalizeListResponse(config: DataSourceConfig, response: unknown): unknown {
    if (config.transport !== 'laravel') return response;
    if (!this.isObject(response) || !Array.isArray(response['data'])) {
      throw new Error('Invalid ERP collection response: expected {data: []}.');
    }
    return { value: response['data'], meta: response['meta'] };
  }

  private normalizeRecordResponse(config: DataSourceConfig, response: unknown): unknown {
    if (config.transport !== 'laravel') return response;
    if (!this.isObject(response) || !this.isObject(response['data'])) {
      throw new Error('Invalid ERP record response: expected {data: {...}}.');
    }
    return response['data'];
  }

  private laravelPayload(source: unknown, allow?: string[], includeEmpty = false): Record<string, unknown> {
    if (!this.isObject(source)) return {};
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(source)) {
      if (key.startsWith('__') || (allow && !allow.includes(key)) || value === undefined) continue;
      if (!includeEmpty && (value === '' || value === null)) continue;
      result[key] = value;
    }
    return result;
  }

  private isObject(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  private formatId(id: unknown): string {
    if (typeof id === 'number' || typeof id === 'boolean') {
      return String(id);
    }

    if (typeof id === 'string') {
      const normalized = id.trim();
      if (this.isGuid(normalized)) {
        return normalized;
      }

      return `'${normalized.replace(/'/g, "''")}'`;
    }

    return `'${String(id).replace(/'/g, "''")}'`;
  }

  private isGuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
  }

  private clearListCacheForEndpoint(endpoint: string): void {
    const normalizedEndpoint = endpoint.trim();
    if (!normalizedEndpoint.length) {
      return;
    }

    for (const key of this.listCache.keys()) {
      if (key === normalizedEndpoint || key.startsWith(`${normalizedEndpoint}?`)) {
        this.listCache.delete(key);
      }
    }
  }

  private clearInFlightRecordRequestsForEndpoint(endpoint: string): void {
    const normalizedEndpoint = endpoint.trim();
    if (!normalizedEndpoint.length) {
      return;
    }

    for (const key of this.inFlightRecords.keys()) {
      if (key.startsWith(`${normalizedEndpoint}(`) || key.startsWith(`${normalizedEndpoint}/`)) {
        this.inFlightRecords.delete(key);
      }
    }
  }

  private missingEndpoint(): Observable<never> {
    return throwError(() => new Error('ERP data source endpoint is required'));
  }

  private restServiceUnavailable(): Observable<never> {
    return throwError(() => new Error('Existing RestService provider is not available to ERP data source service'));
  }

}
