import { Inject, Injectable, InjectionToken, Optional } from '@angular/core';
import { Observable, defer, firstValueFrom, from, of } from 'rxjs';
import { finalize, map, shareReplay, catchError } from 'rxjs/operators';
import { SessionService } from '../../core/services/session.service';
import { WorkspaceContext } from '../../core/services/workspace-context';
import { DataSourceConfig } from '../models/data-source-config.model';
import { EntityContractService } from './entity-contract.service';

export interface DataRestService {
  get(endpoint: string): Observable<unknown>;
  post(endpoint: string, payload: unknown): Observable<unknown>;
  put?(endpoint: string, payload: unknown, ifMatch?: string): Observable<unknown>;
  patch(endpoint: string, payload: unknown, ifMatch?: string): Observable<unknown>;
  delete(endpoint: string, ifMatch?: string): Observable<unknown>;
}
export const DATA_REST_SERVICE = new InjectionToken<DataRestService>('RestService');
export interface DataSourceLoadOptions {
  skip?: number; top?: number; cursor?: string; forceRefresh?: boolean; useCache?: boolean;
}
export interface DataPage { value: Record<string, unknown>[]; meta: Record<string, unknown>; }

/** Shared REST, concurrency and company isolation boundary for all page types. */
@Injectable({ providedIn: 'root' })
export class DataSourceService {
  private readonly lists = new Map<string, { response: unknown; at: number }>();
  private readonly requests = new Map<string, Observable<unknown>>();
  private readonly versions = new Map<string, string>();
  private readonly writes = new Map<string, Promise<unknown>>();
  private scope = '';
  private readonly missingSingletons = new Set<string>();

  constructor(
    @Optional() @Inject(DATA_REST_SERVICE) private readonly rest: DataRestService | null,
    private readonly contracts: EntityContractService,
    private readonly session: SessionService,
    private readonly workspace: WorkspaceContext,
  ) {}

  loadList(config: DataSourceConfig, options: DataSourceLoadOptions = {}): Observable<unknown> {
    if (config.singleton) return this.loadSingleton(config);
    const endpoint = this.listEndpoint(config, options);
    const key = this.key(endpoint);
    const cached = this.getCachedList(config, options);
    if (options.useCache && !options.forceRefresh && cached !== undefined) return of(cached);
    return this.read(key, () => this.client.get(endpoint).pipe(map(response => {
      if (key !== this.key(endpoint)) throw new Error('Your company or session changed. Reopen the page.');
      const outer = this.asRecord(response);
      const rows = Array.isArray(response) ? response : outer?.['data'] ?? outer?.['value'];
      if (!Array.isArray(rows)) throw new Error('Unexpected ERP collection response.');
      const page: DataPage = { value: rows.filter((row): row is Record<string, unknown> => !!this.asRecord(row)), meta: this.asRecord(outer?.['meta']) ?? {} };
      page.value.forEach(row => {
        const id = row[config.keyField ?? 'systemId'];
        if (this.present(id)) this.remember(this.recordEndpoint(config, id), row);
      });
      if (options.useCache) this.lists.set(key, { response: page, at: Date.now() });
      return page;
    })));
  }

  getCachedList(config: DataSourceConfig, options?: DataSourceLoadOptions, maxAgeMs = 300000): unknown {
    const cached = this.lists.get(this.key(this.listEndpoint(config, options)));
    return cached && Date.now() - cached.at <= maxAgeMs ? cached.response : undefined;
  }
  loadSingleton(config: DataSourceConfig): Observable<unknown> {
    const endpoint = this.endpoint(config);
    const key = this.key(endpoint);
    return this.read(key, () => this.client.get(endpoint).pipe(map(response => {
      if (key !== this.key(endpoint)) throw new Error('Your company or session changed. Reopen the page.');
      this.missingSingletons.delete(key);
      return this.record(response, endpoint);
    }), catchError(error => {
      if (error?.status === 404 && key === this.key(endpoint)) this.missingSingletons.add(key);
      throw error;
    })));
  }
  loadById(config: DataSourceConfig, id: unknown): Observable<unknown> {
    const endpoint = config.singleton ? this.endpoint(config) : this.recordEndpoint(config, id);
    const key = this.key(endpoint);
    return this.read(key, () => this.client.get(endpoint).pipe(map(response => {
      if (key !== this.key(endpoint)) throw new Error('Your company or session changed. Reopen the page.');
      return this.record(response, endpoint);
    })));
  }
  create(config: DataSourceConfig, payload: unknown): Observable<unknown> { return this.mutate(config, undefined, payload, 'create'); }
  update(config: DataSourceConfig, id: unknown, payload: unknown, rowVersion?: unknown): Observable<unknown> { return this.mutate(config, id, payload, 'update', rowVersion); }
  delete(config: DataSourceConfig, id: unknown, rowVersion?: unknown): Observable<unknown> { return this.mutate(config, id, undefined, 'delete', rowVersion); }

  /** Explicit domain command; never inferred from a label and never auto-retried. */
  execute(config: DataSourceConfig, id: unknown, command: string, payload: unknown = {}): Observable<unknown> {
    return defer(() => {
      if (!/^[A-Za-z][A-Za-z0-9]*$/.test(command)) throw new Error('Invalid command.');
      const endpoint = this.recordEndpoint(config, id);
      const identity = this.key(endpoint);
      return this.enqueue(endpoint, async () => {
        const response = await firstValueFrom(this.client.post(`${endpoint}/${command}`, payload));
        if (identity !== this.key(endpoint)) throw new Error('Your company or session changed. Reopen the page.');
        this.lists.clear();
        return this.record(response, endpoint);
      });
    });
  }
  relation(config: DataSourceConfig, header: Record<string, unknown>): DataSourceConfig {
    const navigation = config.navigation;
    if (!navigation) return config;
    const id = navigation.parentIdFields?.map(field => header[field]).find(value => this.present(value));
    if (!this.present(id)) throw new Error('Save the header before editing lines.');
    return { ...config, navigation: undefined, endpoint: `${this.recordEndpoint({ endpoint: navigation.parentEndpoint, addressStyle: config.addressStyle }, id)}/${navigation.childCollection}` };
  }
  canWrite(config: DataSourceConfig, record: Record<string, unknown>): boolean {
    const rule = config.writableStates;
    return !rule || !this.present(record[config.keyField ?? 'systemId']) || rule.values.includes(record[rule.field]);
  }
  private mutate(config: DataSourceConfig, id: unknown, body: unknown, operation: 'create' | 'update' | 'delete', rowVersion?: unknown): Observable<unknown> {
    return defer(() => {
      if ((operation === 'create' && config.supportsCreate === false) || (operation === 'update' && config.supportsUpdate === false) || (operation === 'delete' && (config.supportsDelete === false || config.singleton))) throw new Error(`This resource does not support ${operation}.`);
      const endpoint = operation === 'create' || config.singleton ? this.endpoint(config) : this.recordEndpoint(config, id);
      const identity = this.key(endpoint);
      return this.enqueue(endpoint, async () => {
        if (rowVersion !== undefined && (!Number.isSafeInteger(Number(rowVersion)) || Number(rowVersion) < 1)) throw new Error('Reload the record: its row version is invalid.');
        const version = rowVersion !== undefined ? `"${Number(rowVersion)}"` : this.versions.get(identity);
        if (operation !== 'create' && !version && !(config.singleton && this.missingSingletons.has(identity))) throw new Error('Reload the record before saving: its row version is missing.');
        const payload = operation === 'delete' ? undefined : this.contracts.sanitizePayload(config, operation, body);
        const request = operation === 'delete' ? this.client.delete(endpoint, version)
          : config.singleton ? this.client.put?.(endpoint, payload, version)
          : operation === 'create' ? this.client.post(endpoint, payload) : this.client.patch(endpoint, payload, version);
        if (!request) throw new Error('The configured data provider does not support PUT.');
        try {
          const response = await firstValueFrom(request);
          if (identity !== this.key(endpoint)) throw new Error('Your company or session changed. Reopen the page.');
          this.lists.clear();
          if (operation === 'delete') { this.versions.delete(identity); return response; }
          const record = this.record(response, endpoint);
          this.missingSingletons.delete(identity);
          if (operation === 'create' && !config.singleton) this.remember(this.recordEndpoint(config, record[config.keyField ?? 'systemId']), record);
          return record;
        } catch (error) {
          if (error && typeof error === 'object' && 'status' in error && error.status === 412) this.versions.delete(identity);
          throw error;
        }
      });
    });
  }
  private enqueue(endpoint: string, job: () => Promise<unknown>): Observable<unknown> {
    return defer(() => {
      const key = this.key(endpoint);
      const context = this.context();
      const previous = this.writes.get(key) ?? Promise.resolve();
      const next = previous.catch(() => undefined).then(() => {
        if (context !== this.context()) throw new Error('Your company or session changed. Reopen the page.');
        return job();
      });
      this.writes.set(key, next);
      void next.finally(() => { if (this.writes.get(key) === next) this.writes.delete(key); }).catch(() => undefined);
      return from(next);
    });
  }
  private read(key: string, factory: () => Observable<unknown>): Observable<unknown> {
    const existing = this.requests.get(key);
    if (existing) return existing;
    const context = this.context();
    const request = defer(factory).pipe(map(result => {
      if (context !== this.context()) throw new Error('Your company or session changed. Reopen the page.');
      return result;
    }), finalize(() => this.requests.delete(key)), shareReplay({ bufferSize: 1, refCount: true }));
    this.requests.set(key, request);
    return request;
  }
  private record(response: unknown, endpoint: string): Record<string, unknown> {
    const outer = this.asRecord(response);
    const record = this.asRecord(outer?.['data']) ?? this.asRecord(outer?.['value']) ?? outer;
    if (!record) throw new Error('Unexpected ERP record response.');
    this.remember(endpoint, record);
    return record;
  }
  private remember(endpoint: string, record: Record<string, unknown>): void {
    const version = Number(record['systemRowVersion']);
    if (Number.isSafeInteger(version) && version > 0) this.versions.set(this.key(endpoint), `"${version}"`);
  }
  private recordEndpoint(config: DataSourceConfig, id: unknown): string {
    if (!this.present(id)) throw new Error('ERP record identifier is missing.');
    const endpoint = this.endpoint(config);
    return config.addressStyle === 'odata' ? `${endpoint}(${String(id)})` : `${endpoint}/${encodeURIComponent(String(id))}`;
  }
  private endpoint(config: DataSourceConfig): string {
    const endpoint = config.endpoint.trim().replace(/\/$/, '');
    if (!endpoint || !endpoint.startsWith('/') || endpoint.startsWith('//') || /[?#]/.test(endpoint)) throw new Error('Declare a relative ERP resource path without query parameters.');
    return endpoint;
  }
  private listEndpoint(config: DataSourceConfig, options: DataSourceLoadOptions = {}): string {
    const [path, query = ''] = config.endpoint.split('?');
    const params = new URLSearchParams(query);
    if (config.defaultFilter) params.set('$filter', config.defaultFilter);
    if (config.defaultSort && config.paging !== 'cursor') params.set('$orderby', config.defaultSort);
    params.set('$top', String(options.top ?? config.pageSize ?? 20));
    if (config.paging === 'cursor') params.set('cursor', options.cursor ?? 'start');
    else if (options.skip) params.set('$skip', String(options.skip));
    return `${this.endpoint({ ...config, endpoint: path })}?${params}`;
  }
  private context(): string { return `${this.workspace.slug}|${this.session.Company}|${this.session.UserId}|${this.session.AccessToken}`; }
  private key(endpoint: string): string {
    const context = this.context();
    if (this.scope !== context) {
      this.scope = context;
      this.lists.clear(); this.versions.clear(); this.requests.clear(); this.writes.clear(); this.missingSingletons.clear();
    }
    return `${context}|${endpoint}`;
  }
  private get client(): DataRestService { if (!this.rest) throw new Error('ERP data provider is not configured.'); return this.rest; }
  private asRecord(value: unknown): Record<string, unknown> | undefined { return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : undefined; }
  private present(value: unknown): boolean { return value !== null && value !== undefined && String(value).trim().length > 0; }
}
