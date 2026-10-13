import { Inject, Injectable, InjectionToken, Optional } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
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

    const recordEndpoint = `${endpoint}(${this.formatId(id)})`;
    const cachedRequest = this.inFlightRecords.get(recordEndpoint);
    if (cachedRequest) {
      return cachedRequest;
    }

    const request$ = this.restService.get(recordEndpoint).pipe(
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

    const sanitizedPayload = this.contractService.sanitizePayload(config, 'create', payload);
    this.clearListCacheForEndpoint(endpoint);
    this.clearInFlightRecordRequestsForEndpoint(endpoint);
    return this.restService.post(endpoint, sanitizedPayload);
  }

  update(config: DataSourceConfig, id: unknown, payload: unknown): Observable<unknown> {
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

    this.clearListCacheForEndpoint(endpoint);
    this.clearInFlightRecordRequestsForEndpoint(endpoint);
    return this.restService.delete(`${endpoint}(${this.formatId(id)})`);
  }

  private getEndpoint(config: DataSourceConfig): string {
    return config.endpoint?.trim() ?? '';
  }

  private getListEndpoint(config: DataSourceConfig, options?: DataSourceLoadOptions): string {
    const endpoint = this.getEndpoint(config);
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
      if (key.startsWith(`${normalizedEndpoint}(`)) {
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
