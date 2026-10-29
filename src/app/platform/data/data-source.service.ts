import { FieldConfig, FieldLookupConfig } from '../models/field-config.model';
import { lookupQuery } from './lookup-dependencies';
import { Inject, Injectable, InjectionToken, Optional, ErrorHandler } from '@angular/core';
import { Observable, defer, firstValueFrom, from, of } from 'rxjs';
import { finalize, map, shareReplay, catchError, timeout } from 'rxjs/operators';
import { SessionService } from '../../core/services/session.service';
import { WorkspaceContext } from '../../core/services/workspace-context';
import { DataSourceConfig, DataWriteContext } from '../models/data-source-config.model';
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
  maxAgeMs?: number;
  /** Called only when this read must await the server rather than a fresh cache hit. */
  onRequest?: () => void;
  /** Lookups need continuation, not an exact count of an entire master table. */
  count?: boolean;
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
  private readonly conflictedRecords = new WeakSet<Record<string, unknown>>();
  private readonly records = new Map<string, { value: Record<string, unknown>; at: number }>();
  private readGeneration = 0;
  /** Keep a multi-request mutation within its original company, user and workspace. */
  captureWriteScope(): () => boolean {
    const original = this.context();
    return () => this.context() === original;
  }
  /** Identifies the current read/access generation for prepared view snapshots. */
  getReadGeneration(): number { this.key('/'); return this.readGeneration; }
  invalidateReadCache(): void { this.contracts.clearMetadata(); this.metadataLoadedAt = 0; this.metadataRequest = undefined; this.readGeneration++; this.records.clear(); this.lists.clear(); this.requests.clear(); }
  private cacheRecord(key: string, value: Record<string, unknown>, at = Date.now()): void {
    if (this.records.size >= 100) this.records.delete(this.records.keys().next().value!);
    this.records.set(key, { value: structuredClone(value), at });
  }
  private readonly resourceRevisions = new Map<string, number>();
  private resourcePath(endpoint: string): string {
    const path = endpoint.split('?')[0].replace(/^\/companies\/[^/]+/, '');
    // Collaboration changes do not modify the parent master or its lookup captions.
    const collaboration = path.match(/^(.+\/(?:notes|attachments))(?:\/[^/]+)?$/);
    return collaboration?.[1] ?? '/' + path.split('/').filter(Boolean)[0].split('(')[0];
  }
  private revisionKey(endpoint: string): string { return this.key(this.resourcePath(endpoint)); }
  getResourceRevision(config: DataSourceConfig): number { return this.resourceRevisions.get(this.revisionKey(config.endpoint)) ?? 0; }
  private recordMutation(endpoint: string, related: string[] = []): void {
    // Access configuration changes must revoke every cached read immediately.
    if (/permission|user|role/i.test(this.resourcePath(endpoint))) this.invalidateReadCache();
    if (this.resourceRevisions.size >= 1000) { this.invalidateReadCache(); this.resourceRevisions.clear(); }
    for (const resource of [endpoint, ...related]) {
      const path = this.resourcePath(resource);
      const revision = this.revisionKey(resource);
      this.resourceRevisions.set(revision, (this.resourceRevisions.get(revision) ?? 0) + 1);
      for (const cache of [this.records, this.lists, this.requests])
        for (const key of cache.keys())
          if (this.resourcePath(key.slice(this.scope.length + 1)) === path) cache.delete(key);
    }
  }
  private readonly missingSingletons = new Set<string>();

  constructor(
    @Optional() @Inject(DATA_REST_SERVICE) private readonly rest: DataRestService | null,
    private readonly contracts: EntityContractService,
    private readonly session: SessionService,
    private readonly workspace: WorkspaceContext,
    @Optional() private readonly hookErrors?: ErrorHandler,
  ) {}

  private metadataRequest?: Observable<boolean>;
  private metadataLoadedAt = 0;
  /** Optional discovery; an outage preserves explicit legacy configuration. */
  loadCoreMetadata(): Observable<boolean> {
    this.key('/apiCapabilities');
    if (!this.session.Company || !this.rest) return of(false);
    if (this.metadataRequest) return this.metadataRequest;
    if (Date.now() - this.metadataLoadedAt < 30000) return of(true);
    this.contracts.clearMetadata();
    this.metadataLoadedAt = 0;
    const context = this.context();
    const generation = this.readGeneration;
    const request = defer(() => this.client.get(this.endpoint({endpoint:'/apiCapabilities'}))).pipe(timeout(5000), map(response => {
      if (context !== this.context() || generation !== this.readGeneration) return false;
      const accepted = this.contracts.acceptMetadata(response);
      if (accepted) this.metadataLoadedAt = Date.now();
      return accepted;
    }), catchError(() => of(false)), finalize(() => { if (this.metadataRequest === request) this.metadataRequest = undefined; }), shareReplay({bufferSize:1,refCount:true}));
    this.metadataRequest = request;
    return request;
  }
  usesGenericContract(source: DataSourceConfig): boolean { this.key(source.endpoint); return this.contracts.usesGenericContract(source); }
  assertEditedFields(source: DataSourceConfig, operation: 'create' | 'update', record: Record<string, unknown>, fields: Iterable<string>): void {
    this.key(source.endpoint);
    this.contracts.assertEditedFields(source, operation, record, fields);
  }
  operationAllowed(source: DataSourceConfig, operation: 'create' | 'update' | 'delete'): boolean | undefined {
    this.key(source.endpoint);
    const supported = this.contracts.operationAllowed(source, operation);
    if (supported === false) return false;
    const normalizePath = (value: string) => value.split('?')[0].replace(/\{[^}]+\}/g, '{}').replace(/^\/+|\/+$/g, '');
    const path = normalizePath(source.navigation
      ? source.navigation.parentEndpoint + '/{parent}/' + source.navigation.childCollection
      : source.endpoint);
    const permissions = this.session.Permissions.filter(value => value && typeof value === 'object' &&
      typeof (value as Record<string, unknown>)['apiPath'] === 'string' &&
      normalizePath((value as Record<string, unknown>)['apiPath'] as string) === path) as Record<string, unknown>[];
    if (!permissions.length) return supported;
    const flag = {create: 'canCreate', update: 'canUpdate', delete: 'canDelete'}[operation];
    return permissions.some(permission => permission[flag] === true);
  }
  actionAllowed(source: DataSourceConfig, action: string): boolean | undefined {
    this.key(source.endpoint);
    return this.contracts.actionAllowed(source, action);
  }
  resolveSourceContract(source: DataSourceConfig): DataSourceConfig { this.key(source.endpoint); return this.contracts.resolveSource(source); }
  resolveFieldContract(source: DataSourceConfig, field: FieldConfig): FieldConfig { this.key(source.endpoint); return this.contracts.resolveField(source, field); }

  loadList(config: DataSourceConfig, options: DataSourceLoadOptions = {}): Observable<unknown> {
    if (config.singleton) return this.loadSingleton(config, options);
    const endpoint = this.listEndpoint(config, options);
    const key = this.key(endpoint);
    const generation = this.readGeneration;
    const revision = this.getResourceRevision(config);
    const cached = this.getCachedList(config, options, options.maxAgeMs ?? 300000);
    if (options.useCache && !options.forceRefresh && cached !== undefined) return of(structuredClone(cached));
    options.onRequest?.();
    return this.read(key, () => this.client.get(endpoint).pipe(map(response => {
      if (key !== this.key(endpoint)) throw new Error('Your company or session changed. Reopen the page.');
      if (generation !== this.readGeneration || revision !== this.getResourceRevision(config)) throw new Error('Data changed while loading. Refresh to load the current record.');
      const outer = this.asRecord(response);
      const rows = Array.isArray(response) ? response : outer?.['data'] ?? outer?.['value'];
      if (!Array.isArray(rows)) throw new Error('Unexpected ERP collection response.');
      const page: DataPage = { value: rows.filter((row): row is Record<string, unknown> => !!this.asRecord(row)), meta: this.asRecord(outer?.['meta']) ?? {} };
      page.value.forEach(row => {
        const id = row[config.keyField ?? 'systemId'];
        if (this.present(id)) {
          const recordKey = this.recordEndpoint(config, id);
          this.remember(recordKey, row);
          // Only the trusted API's explicit complete-record contract may seed detail reads.
          if (options.useCache && page.meta['recordShape'] === 'complete' && Number.isSafeInteger(Number(row['systemRowVersion'])) && Number(row['systemRowVersion']) > 0)
            this.cacheRecord(this.key(recordKey), row);
        }
      });
      if (options.useCache) {
        if (this.lists.size >= 100) this.lists.delete(this.lists.keys().next().value!);
        this.lists.set(key, { response: structuredClone(page), at: Date.now() });
      }
      return page;
    })));
  }

  getCachedList(config: DataSourceConfig, options?: DataSourceLoadOptions, maxAgeMs = 300000): unknown {
    const cached = this.lists.get(this.key(this.listEndpoint(config, options)));
    return cached && Date.now() - cached.at <= maxAgeMs ? cached.response : undefined;
  }
  /** Reuse a fresh detail read or an explicitly complete collection row in the same access scope. */
  getCachedRecord(config: DataSourceConfig, id: unknown, maxAgeMs = 30000): Record<string, unknown> | undefined {
    const endpoint = config.singleton ? this.endpoint(config) : this.recordEndpoint(config, id);
    const key = this.key(endpoint);
    const cached = this.records.get(key);
    if (cached && Date.now() - cached.at < maxAgeMs) return structuredClone(cached.value);
    if (config.singleton) return undefined;
    // Detail entries are bounded. The current collection page may still contain an evicted row.
    const prefix = this.key(this.endpoint(config)) + '?';
    for (const [pageKey, entry] of this.lists) {
      if (!pageKey.startsWith(prefix) || Date.now() - entry.at >= maxAgeMs) continue;
      const page = entry.response as DataPage;
      if (page.meta['recordShape'] !== 'complete') continue;
      const row = page.value.find(value => String(value[config.keyField ?? 'systemId']) === String(id));
      if (!row || !Number.isSafeInteger(Number(row['systemRowVersion'])) || !(Number(row['systemRowVersion']) > 0)) continue;
      this.cacheRecord(key, row, entry.at);
      return structuredClone(row);
    }
    return undefined;
  }
  /** Retain derived view values on the existing trusted record entry, without changing its business data or age. */
  cachePreparedRecord(config: DataSourceConfig, id: unknown, prepared: Record<string, unknown>, fields: FieldConfig[]): void {
    const current = this.getCachedRecord(config, id, Infinity);
    if (!current || String(current['systemRowVersion']) !== String(prepared['systemRowVersion'])) return;
    const key = this.key(this.recordEndpoint(config, id));
    const entry = this.records.get(key);
    if (!entry) return;
    for (const field of fields) if (field.lookup)
      for (const name of [field.optionsDataKey ?? '__options_' + field.key, '__display_' + field.key, '__lookupStamp_' + field.key, '__lookupFailed_' + field.key, '__lookupRestricted_' + field.key])
        if (Object.prototype.hasOwnProperty.call(prepared, name)) current[name] = prepared[name];
    this.cacheRecord(key, current, entry.at);
  }
  loadSingleton(config: DataSourceConfig, options: DataSourceLoadOptions = {}): Observable<unknown> {
    const endpoint = this.endpoint(config);
    const key = this.key(endpoint);
    const generation = this.readGeneration;
    const revision = this.getResourceRevision(config);
    const cached = this.records.get(key);
    if (options.useCache && !options.forceRefresh && cached && Date.now() - cached.at < (options.maxAgeMs ?? 30000)) return of(structuredClone(cached.value));
    options.onRequest?.();
    return this.read(key, () => this.client.get(endpoint).pipe(map(response => {
      if (key !== this.key(endpoint)) throw new Error('Your company or session changed. Reopen the page.');
      if (generation !== this.readGeneration || revision !== this.getResourceRevision(config)) throw new Error('Data changed while loading. Refresh to load the current record.');
      this.missingSingletons.delete(key);
      const record = this.record(response, endpoint);
      if (options.useCache) this.cacheRecord(key, record);
      return record;
    }), catchError(error => {
      if (error?.status === 404 && key === this.key(endpoint) && generation === this.readGeneration) this.missingSingletons.add(key);
      throw error;
    })));
  }
  getCachedLookup(lookup: FieldLookupConfig, id: unknown, record: Record<string, unknown>, header: Record<string, unknown> = {}): Record<string, unknown> | undefined {
    const query = lookupQuery({...lookup, filter: undefined}, record, '', header);
    if (!this.present(id) || !query.ready || !query.endpoint) return undefined;
    // Collection-only lookups with filter dependencies must retain their constrained collection read.
    if (lookup.recordRead === 'collection' && query.filter) return undefined;
    return this.getCachedRecord({endpoint: query.endpoint, keyField: (lookup.valueField ?? 'systemId')}, id);
  }
  /** Selected lookup records follow the same company and parent scope as searches. */
  loadLookup(lookup: FieldLookupConfig, id: unknown, record: Record<string, unknown>, header: Record<string, unknown> = {}): Observable<unknown> {
    const query = lookupQuery({...lookup, filter: undefined}, record, '', header);
    if (!query.ready || !query.endpoint) return of(undefined);
    const cached = this.getCachedLookup(lookup, id, record, header);
    if (cached) return of(cached);
    if (lookup.recordRead !== 'collection') return this.loadById({endpoint: query.endpoint}, id, {useCache: true, maxAgeMs: 30000});
    const identity = (lookup.valueField ?? 'systemId') + " eq '" + String(id).replace(/'/g, "''") + "'";
    return this.loadList({endpoint: query.endpoint, defaultFilter: [query.filter, identity].filter(Boolean).map(value => '(' + value + ')').join(' and ')}, {top: 1, useCache: true, maxAgeMs: 30000, count: false}).pipe(map(response => {
      const selected = (response as DataPage).value[0];
      if (!selected) throw new Error('The selected lookup record is unavailable in this company and parent scope.');
      return selected;
    }));
  }
  loadById(config: DataSourceConfig, id: unknown, options: DataSourceLoadOptions = {}): Observable<unknown> {
    const endpoint = config.singleton ? this.endpoint(config) : this.recordEndpoint(config, id);
    const key = this.key(endpoint);
    const generation = this.readGeneration;
    const revision = this.getResourceRevision(config);
    const cached = options.useCache && !options.forceRefresh ? this.getCachedRecord(config, id, options.maxAgeMs) : undefined;
    if (cached) return of(cached);
    options.onRequest?.();
    return this.read(key, () => this.client.get(endpoint).pipe(map(response => {
      if (key !== this.key(endpoint)) throw new Error('Your company or session changed. Reopen the page.');
      if (generation !== this.readGeneration || revision !== this.getResourceRevision(config)) throw new Error('Data changed while loading. Refresh to load the current record.');
      const record = this.record(response, endpoint);
      if (options.useCache) this.cacheRecord(key, record);
      return record;
    })));
  }
  create(config: DataSourceConfig, payload: unknown): Observable<unknown> { return this.mutate(config, undefined, payload, 'create'); }
  update(config: DataSourceConfig, id: unknown, payload: unknown, rowVersion?: unknown): Observable<unknown> { return this.mutate(config, id, payload, 'update', rowVersion); }
  /** Read the version from this editor only when its queued write starts. */
  updateRecord(config: DataSourceConfig, id: unknown, payload: unknown, record: Record<string, unknown>): Observable<unknown> {
    return this.mutate(config, id, payload, 'update', undefined, record);
  }
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
        this.recordMutation(endpoint);
        this.invalidateReadCache();
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
  private notifyWriteHook(callback: (() => unknown) | undefined): void {
    if (!callback) return;
    const report = (error: unknown) => { try { if (this.hookErrors) this.hookErrors.handleError(error); else console.error(error); } catch { /* Observer failures must not turn a committed write into a failed save. */ } };
    try {
      const result = callback();
      if (result && typeof result === 'object' && 'then' in result) {
        void Promise.resolve(result).catch(report);
        report(new Error('Write hooks must be synchronous.'));
      }
    } catch (error) { report(error); }
  }
  private mutate(config: DataSourceConfig, id: unknown, body: unknown, operation: 'create' | 'update' | 'delete', rowVersion?: unknown, editor?: Record<string, unknown>): Observable<unknown> {
    return defer(() => {
      this.key(config.endpoint);
      config = this.contracts.resolveSource(config);
      if ((operation === 'create' && config.supportsCreate === false) || (operation === 'update' && config.supportsUpdate === false) || (operation === 'delete' && config.supportsDelete === false)) throw new Error(`This resource does not support ${operation}.`);
      const endpoint = operation === 'create' || config.singleton ? this.endpoint(config) : this.recordEndpoint(config, id);
      const identity = this.key(endpoint);
      return this.enqueue(endpoint, async () => {
        if (editor && this.conflictedRecords.has(editor)) throw Object.assign(new Error('This record changed on the server. Your edits are retained. Reload and reconcile them before saving.'), { status: 412 });
        const currentVersion = editor ? editor['systemRowVersion'] : rowVersion;
        if (currentVersion !== undefined && (!Number.isSafeInteger(Number(currentVersion)) || Number(currentVersion) < 1)) throw new Error('Reload the record: its row version is invalid.');
        const version = currentVersion !== undefined ? `"${Number(currentVersion)}"` : this.versions.get(identity);
        if (operation !== 'create' && !version && !(config.singleton && this.missingSingletons.has(identity))) throw new Error('Reload the record before saving: its row version is missing.');
        const payload = operation === 'delete' ? undefined : this.contracts.sanitizePayload(config, operation, body);
        const hookContext: DataWriteContext = Object.freeze({operation, endpoint:config.endpoint, id,
          payload: payload && typeof payload === 'object' ? Object.freeze(structuredClone(payload as Record<string,unknown>)) : undefined});
        const hooks = config.hooks;
        const before = operation==='create' ? hooks?.beforeCreate : operation==='update' ? hooks?.beforeUpdate : hooks?.beforeDelete;
        const after = operation==='create' ? hooks?.afterCreate : operation==='update' ? hooks?.afterUpdate : hooks?.afterDelete;
        try {
          const message = before?.(hookContext);
          if (message !== undefined) throw new Error(typeof message==='string' && message.trim() ? message : 'Before-write hook returned an invalid result.');
          if (identity !== this.key(endpoint)) throw new Error('Your company or session changed. Reopen the page.');
        const request = operation === 'delete' ? this.client.delete(endpoint, version)
          : (config.singleton || (operation === 'update' && this.contracts.updateMethod(config) === 'PUT')) ? this.client.put?.(endpoint, payload, version)
          : operation === 'create' ? this.client.post(endpoint, payload) : this.client.patch(endpoint, payload, version);
        if (!request) throw new Error('The configured data provider does not support PUT.');
          const response = await firstValueFrom(request);
          if (identity !== this.key(endpoint)) throw new Error('Your company or session changed. Reopen the page.');
          this.recordMutation(endpoint, config.invalidates);
          // Number allocation can change a separate series resource through server business policies.
          if (operation === 'create' && config.autoGenerateNumber) this.invalidateReadCache();
          if (operation === 'delete' || response == null) { this.versions.delete(identity); this.notifyWriteHook(after ? ()=>after({...hookContext,record:undefined}) : undefined); return response; }
          const record = this.record(response, endpoint);
          if (Number.isSafeInteger(Number(record['systemRowVersion'])) && Number(record['systemRowVersion'])>0) this.cacheRecord(this.key(operation==='create' && !config.singleton ? this.recordEndpoint(config,record[config.keyField ?? 'systemId']) : endpoint),record);
          if (editor) editor['systemRowVersion'] = record['systemRowVersion'];
          this.missingSingletons.delete(identity);
          if (operation === 'create' && !config.singleton) this.remember(this.recordEndpoint(config, record[config.keyField ?? 'systemId']), record);
          this.notifyWriteHook(after ? ()=>after({...hookContext,record:Object.freeze(structuredClone(record))}) : undefined);
          return record;
        } catch (error) {
          if (error && typeof error === 'object' && 'status' in error && error.status === 412) {
            this.versions.delete(identity);
            this.invalidateReadCache();
            if (editor) this.conflictedRecords.add(editor);
          }
          this.notifyWriteHook(hooks?.onError ? ()=>hooks.onError!({...hookContext,error}) : undefined);
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
    }), finalize(() => { if (this.requests.get(key) === request) this.requests.delete(key); }), shareReplay({ bufferSize: 1, refCount: true }));
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
  recordEndpoint(config: DataSourceConfig, id: unknown): string {
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
    if (options.count !== undefined) params.set('$count', String(options.count));
    if (config.paging === 'cursor') params.set('cursor', options.cursor ?? 'start');
    else if (options.skip) params.set('$skip', String(options.skip));
    return `${this.endpoint({ ...config, endpoint: path })}?${params}`;
  }
  private context(): string { return `${this.workspace.slug}|${this.session.Company}|${this.session.UserId}|${this.session.AccessToken}|${JSON.stringify(this.session.Permissions)}|${this.session.SuperAdmin}`; }
  private key(endpoint: string): string {
    const context = this.context();
    if (this.scope !== context) {
      this.scope = context;
      this.invalidateReadCache();
      this.resourceRevisions.clear(); this.versions.clear(); this.requests.clear(); this.writes.clear(); this.missingSingletons.clear();
    }
    return `${context}|${endpoint}`;
  }
  private get client(): DataRestService { if (!this.rest) throw new Error('ERP data provider is not configured.'); return this.rest; }
  private asRecord(value: unknown): Record<string, unknown> | undefined { return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : undefined; }
  private present(value: unknown): boolean { return value !== null && value !== undefined && String(value).trim().length > 0; }
}
