import { Injectable, inject } from '@angular/core';
import { firstValueFrom, Subject } from 'rxjs';
import { timeout } from 'rxjs/operators';
import { DataSourceConfig } from '../models/data-source-config.model';
import { DocumentWindowConfig } from '../models/document-window-config.model';
import { PopupMode, PopupSize } from '../models/popup-config.model';
import { RunModalHostData } from '../models/run-modal-host-data.model';
import { DataSourceService, DataPage } from '../data/data-source.service';
import { ApiErrorService } from '../data/api-error.service';
import { RUNTIME_TIMEOUT_POLICY } from '../data/runtime-timeout-policy.token';
import { ListFilterStateService } from '../pages/list-filter-state.service';
import { RunModalConfigModule, RunModalContext } from './run-modal-config.token';
import { RunModalConfigAssemblerService } from './run-modal-config-assembler.service';
import { RunModalPageDefinitionResolverService } from './run-modal-page-definition-resolver.service';
import { RunModalStackService } from './run-modal-stack.service';
import { RunModalBindingStateService } from './run-modal-binding-state.service';
import { SessionService } from '../../core/services/session.service';

export interface RunModalRequest {
  pageId: string; context?: RunModalContext; mode?: PopupMode; size?: PopupSize;
  target?: 'entry' | 'list'; allowNested?: boolean; popupId?: string;
}
type ListBinding = { pageId: string; module: RunModalConfigModule; source: DataSourceConfig; context: RunModalContext; rows: unknown[]; loading: boolean; hasMore: boolean; cursor?: string; generation: number };

/** Window navigation only. DocumentPage owns editing for every entry window. */
@Injectable({ providedIn: 'root' })
export class RunModalService {
  private readonly stack = inject(RunModalStackService);
  private readonly definitions = inject(RunModalPageDefinitionResolverService);
  private readonly assembler = inject(RunModalConfigAssemblerService);
  private readonly data = inject(DataSourceService);
  private readonly filters = inject(ListFilterStateService);
  private readonly errors = inject(ApiErrorService);
  private readonly policy = inject(RUNTIME_TIMEOUT_POLICY);
  private readonly state = inject(RunModalBindingStateService);
  private readonly session = inject(SessionService);
  private readonly lists = new Map<string, ListBinding>();
  private readonly parents = new Map<string, string>();
  private failure = '';
  private readonly entryPages = new Map<string, string>();
  readonly entriesChanged$ = new Subject<string>();

  constructor() {
    this.stack.stack$.subscribe(stack => {
      const ids = new Set(stack.map(popup => popup.id));
      for (const id of this.lists.keys()) if (!ids.has(id)) this.lists.delete(id);
    });
  }

  async open(request: RunModalRequest): Promise<boolean> {
    const definition = await this.definitions.resolve(request.pageId);
    const config = definition ? this.assembler.pickListPageConfig({ module: definition.module }) : undefined;
    if (!definition || !config?.dataSource) { this.failure = `config-not-found:${request.pageId}`; return false; }
    const permitted = this.session.SuperAdmin || this.session.Permissions.some((value: unknown) => {
      const grant = value as Record<string, unknown>;
      return grant?.['pageId'] === definition.pageId && grant['canRead'] === true;
    });
    if (!permitted) { this.failure = 'permission-denied'; return false; }
    const id = request.popupId ?? `run-modal-${definition.pageId}-${crypto.randomUUID()}`;
    const context = request.context ?? {};
    const target = config.dataSource.singleton ? 'entry' : request.target ?? 'list';
    if (target === 'entry') {
      const record = context['headerData'] && typeof context['headerData'] === 'object' ? context['headerData'] as Record<string, unknown> : {};
      const opened = this.stack.open({ id, title: config.title, mode: request.mode ?? 'page', size: request.size ?? 'full', allowNested: request.allowNested ?? true, closeOnBackdrop: false,
        data: { runtimePage: { pageId: definition.pageId, module: definition.module, record } } satisfies RunModalHostData });
      if (opened && typeof context['parentPopupId'] === 'string') this.parents.set(id, context['parentPopupId']);
      if (opened) this.entryPages.set(id, definition.pageId);
      this.failure = opened ? '' : 'popup-open-blocked';
      return opened;
    }
    const source = this.contextualSource(config.dataSource, context);
    this.filters.initializeFromConfig(id, config, source.defaultFilter);
    const binding: ListBinding = { pageId: definition.pageId, module: definition.module, source, context, rows: [], loading: false, hasMore: true, generation: 0 };
    const opened = this.stack.open({ id, title: config.title, mode: request.mode ?? 'page', size: request.size ?? 'full', allowNested: request.allowNested ?? true,
      data: { runModalList: { pageId: definition.pageId, config, rows: [], loading: true, hasMore: false } } satisfies RunModalHostData });
    if (!opened) { this.failure = 'popup-open-blocked'; return false; }
    this.failure = '';
    this.lists.set(id, binding);
    void this.loadList(id, true);
    return true;
  }

  async openEntryFromList(popupId: string, row: unknown): Promise<boolean> {
    const binding = this.lists.get(popupId);
    if (!binding) return false;
    return this.open({ pageId: binding.pageId, target: 'entry', context: { headerData: row, parentPopupId: popupId }, allowNested: true });
  }
  async handleListCommand(id: string, event: { actionKey: string; payload?: unknown }): Promise<boolean> {
    const binding = this.lists.get(id);
    if (!binding) return false;
    if (event.actionKey === 'new') return this.openEntryFromList(id, {});
    if (event.actionKey === 'sortChanged') {
      binding.source = { ...binding.source, defaultSort: String((event.payload as { sort: string }).sort) };
    } else if (event.actionKey !== 'refresh' && !this.filters.applyCommand(id, event.actionKey, event.payload)) return false;
    await this.loadList(id, true);
    return true;
  }
  async loadNextListPage(id: string): Promise<void> {
    if (this.lists.get(id)?.hasMore) await this.loadList(id, false);
  }
  handlePopupAction(_id: string, _config: DocumentWindowConfig, _event: { actionKey: string; payload?: unknown }): boolean { return false; }
  releasePopup(id: string): void {
    this.state.releasePopup(id);
    this.lists.delete(id);
    const parent = this.parents.get(id);
    this.parents.delete(id);
    const page = this.entryPages.get(id);
    this.entryPages.delete(id);
    if (page) this.entriesChanged$.next(page);
    if (parent) void this.loadList(parent, true);
  }
  getLastOpenFailureReason(): string { return this.failure; }

  private async loadList(id: string, reset: boolean): Promise<void> {
    const binding = this.lists.get(id);
    if (!binding || (binding.loading && !reset)) return;
    const generation = ++binding.generation;
    binding.loading = true;
    this.patch(id, { loading: true, errorMessage: undefined });
    try {
      const source = { ...binding.source, defaultFilter: this.filters.buildFilter(id) };
      const size = source.pageSize ?? 20;
      const page = await firstValueFrom(this.data.loadList(source, { top: size, skip: reset ? 0 : binding.rows.length, cursor: reset ? undefined : binding.cursor }).pipe(timeout<unknown>(this.policy.hydrationTimeoutMs))) as DataPage;
      if (generation !== binding.generation || !this.lists.has(id)) return;
      binding.rows = reset ? page.value : [...binding.rows, ...page.value];
      binding.cursor = typeof page.meta['nextCursor'] === 'string' ? page.meta['nextCursor'] : undefined;
      binding.hasMore = source.paging === 'cursor' ? !!binding.cursor : typeof page.meta['total'] === 'number' ? binding.rows.length < page.meta['total'] : page.value.length === size;
      this.patch(id, { rows: binding.rows, hasMore: binding.hasMore, loading: false });
    } catch (error) {
      if (generation === binding.generation) this.patch(id, { loading: false, errorMessage: this.errors.toMessage(error, 'Unable to load list.') });
    } finally { if (generation === binding.generation) binding.loading = false; }
  }
  private patch(id: string, patch: Record<string, unknown>): void {
    this.stack.update(id, popup => {
      const data = popup.data as RunModalHostData;
      return { ...popup, data: { ...data, runModalList: { ...data.runModalList, ...patch } } };
    });
  }
  private contextualSource(source: DataSourceConfig, context: RunModalContext): DataSourceConfig {
    if (source.navigation) return this.data.relation(source, (context['activeLine'] ?? context['headerData'] ?? {}) as Record<string, unknown>);
    if (!source.parentKeyField) return source;
    const record = (context['headerData'] ?? context['activeLine'] ?? {}) as Record<string, unknown>;
    const value = record[source.contextDocumentNoField ?? source.documentNoField ?? source.parentKeyField];
    if (value === undefined || value === null || value === '') throw new Error('The related record context is missing.');
    const predicate = `${source.parentKeyField} eq '${String(value).replace(/'/g, "''")}'`;
    return { ...source, defaultFilter: source.defaultFilter ? `(${source.defaultFilter}) and (${predicate})` : predicate };
  }
}
