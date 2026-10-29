import { DocumentConfigDataService } from '../data/document-config-data.service';
import { Injectable, inject, signal } from '@angular/core';
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
export interface SavedEntryChange { pageId: string; source: DataSourceConfig; before: Record<string, unknown>; saved?: Record<string, unknown>; }
export interface BackgroundSaveOwner {
  state(): {pending: boolean; dirty: boolean; record: Record<string, unknown>; message?: string; uncertain: boolean};
  verify(): Promise<string>;
  resumed(): void;
}
interface SaveNotice { id: string; pageId: string; label: string; state: 'saving'|'saved'|'error'|'unknown'; message: string; checking?: boolean; valid(): boolean; }

type ListBinding = { pageId: string; module: RunModalConfigModule; source: DataSourceConfig; context: RunModalContext; rows: unknown[]; loading: boolean; hasMore: boolean; cursor?: string; generation: number };

/** Window navigation only. DocumentPage owns editing for every entry window. */
@Injectable({ providedIn: 'root' })
export class RunModalService {
  private readonly stack = inject(RunModalStackService);
  private readonly definitions = inject(RunModalPageDefinitionResolverService);
  private readonly assembler = inject(RunModalConfigAssemblerService);
  private readonly data = inject(DataSourceService);
  private readonly configData = inject(DocumentConfigDataService);
  private readonly filters = inject(ListFilterStateService);
  private readonly errors = inject(ApiErrorService);
  private readonly policy = inject(RUNTIME_TIMEOUT_POLICY);
  private readonly state = inject(RunModalBindingStateService);
  private readonly session = inject(SessionService);
  private readonly lists = new Map<string, ListBinding>();
  private readonly parents = new Map<string, string>();
  private failure = '';
  private readonly entryPages = new Map<string, string>();
  private readonly entryRevisions = new Map<string, { source: DataSourceConfig; revision: number; before: Record<string, unknown> }>();
  readonly entriesChanged$ = new Subject<SavedEntryChange>();
  private windows: import('../models/popup-config.model').PopupConfig[] = [];
  private readonly deferredSaves = new Map<string, {record: Record<string, unknown>; owner: BackgroundSaveOwner; hidden: boolean; timer: ReturnType<typeof setTimeout>; valid(): boolean}>();
  private readonly notices = signal<SaveNotice[]>([]);
  backgroundFor(pageId: string): SaveNotice[] { return this.notices().filter(item => item.pageId === pageId && item.valid()); }
  isRecordBackground(record: Record<string,unknown> | undefined): boolean { return [...this.deferredSaves.values()].some(save=>save.record===record && save.hidden); }
  isBackground(id: string): boolean { return this.deferredSaves.get(id)?.hidden === true; }
  isVisibleTop(id: string): boolean { return this.windows.filter(window => !this.isBackground(window.id)).at(-1)?.id === id; }
  private notice(id: string, patch: Partial<SaveNotice>): void { this.notices.update(items => items.map(item => item.id === id ? {...item,...patch} : item)); }
  dismissSaveNotice(id: string): void { this.notices.update(items => items.filter(item => item.id !== id)); }

  keepSaving(record: Record<string, unknown> | undefined, owner: BackgroundSaveOwner): boolean {
    const window = this.windows.find(window => (window.data as RunModalHostData)?.runtimePage?.record === record);
    if (!window || !record) return false;
    const valid = this.data.captureWriteScope();
    const initial = this.entryRevisions.get(window.id);
    if (!initial) return false;
    const timer = setTimeout(() => {
      if (!valid()) { this.entryPages.delete(window.id); this.entryRevisions.delete(window.id); this.parents.delete(window.id); this.releaseDeferred(window.id); this.dismissSaveNotice(window.id); this.stack.close(window.id); return; }
      if (this.deferredSaves.get(window.id)?.hidden && owner.state().pending) this.notice(window.id,{state:'unknown',message:'Save confirmation is taking longer than expected. Check the server status before retrying.'});
    }, this.policy.requestTimeoutMs);
    this.deferredSaves.set(window.id,{record,owner,hidden:false,timer,valid});
    const label = String(owner.state().record[initial.source.headerPKProp ?? 'number'] ?? owner.state().record['code'] ?? window.title ?? initial.before[initial.source.keyField ?? 'systemId'] ?? 'Record');
    this.notices.update(items => [...items.filter(item => item.id !== window.id),{id:window.id,pageId:this.entryPages.get(window.id)!,label,state:'saving',message:'Saving changes…',valid}]);
    return true;
  }
  detachSavingWindow(id: string): boolean {
    const save = this.deferredSaves.get(id);
    if (!save) return false;
    save.hidden = true;
    this.stack.update(id, window => ({...window,data:{...(window.data as RunModalHostData),backgroundSave:true}}));
    this.notifyBackground(save.record);
    return true;
  }
  notifyBackground(record: Record<string, unknown> | undefined): void {
    // Finish the existing response/merge handler before evaluating its final state.
    queueMicrotask(() => {
      for (const [id,save] of this.deferredSaves) {
        if (save.record !== record) continue;
        if (!save.valid()) { this.releaseDeferred(id); this.entryPages.delete(id); this.entryRevisions.delete(id); this.parents.delete(id); this.dismissSaveNotice(id); this.stack.close(id); continue; }
        if (!save.hidden) { save.owner.resumed(); continue; }
        const state = save.owner.state();
        if (state.pending) continue;
        clearTimeout(save.timer);
        if (state.dirty) {
          this.notice(id,{state:state.uncertain?'unknown':'error',message:state.uncertain?'Save outcome is unknown. Check the server status before retrying.':state.message || 'Changes could not be saved.'});
        } else {
          this.notice(id,{state:'saved',message:'Changes saved'});
          this.releasePopup(id, structuredClone(state.record));
          this.stack.close(id);
          setTimeout(() => this.dismissSaveNotice(id),6000);
        }
      }
    });
  }
  resumeSave(id: string): void {
    const save=this.deferredSaves.get(id);if(!save || !save.valid())return;
    clearTimeout(save.timer);save.hidden=false;save.owner.resumed();this.dismissSaveNotice(id);
    this.stack.update(id,window=>({...window,data:{...(window.data as RunModalHostData),backgroundSave:false}}));
  }
  async verifySave(id: string): Promise<void> {
    const save=this.deferredSaves.get(id);if(!save || !save.valid() || this.notices().find(item=>item.id===id)?.checking)return;
    this.notice(id,{checking:true});
    try { const message=await save.owner.verify();if(save.valid())this.notice(id,{message}); }
    catch { if(save.valid())this.notice(id,{message:'Server status could not be checked. Your edits are retained; no save was retried.'}); }
    finally { this.notice(id,{checking:false}); }
  }
  private releaseDeferred(id: string): void { const save=this.deferredSaves.get(id);if(save)clearTimeout(save.timer);this.deferredSaves.delete(id); }

  constructor() {
    this.stack.stack$.subscribe(stack => {
      this.windows = stack;
      const ids = new Set(stack.map(popup => popup.id));
      for (const id of this.deferredSaves.keys()) if (!ids.has(id)) {
        this.releaseDeferred(id); this.entryPages.delete(id); this.entryRevisions.delete(id); this.parents.delete(id); this.dismissSaveNotice(id);
      }
      for (const id of this.lists.keys()) if (!ids.has(id)) { this.lists.delete(id); this.filters.release(id); }
    });
  }

  async open(request: RunModalRequest): Promise<boolean> {
    const definition = await this.definitions.resolve(request.pageId);
    const config = definition ? this.assembler.pickListPageConfig({ module: definition.module }) : undefined;
    if (!definition || !config?.dataSource) { this.failure = `config-not-found:${request.pageId}`; return false; }
    const permitted = this.session.SuperAdmin || this.session.Permissions.some((value: unknown) => {
      const grant = value as Record<string, unknown>;
      return grant?.['pageId'] === (config.permissionPageId ?? definition.pageId) && grant['canRead'] === true;
    });
    if (!permitted) { this.failure = 'permission-denied'; return false; }
    const id = request.popupId ?? `run-modal-${definition.pageId}-${crypto.randomUUID()}`;
    const context = request.context ?? {};
    if (context['recordMappingComplete'] === false) { this.failure = 'related-record-missing'; return false; }
    const target = config.pageType === 'worksheet' || config.dataSource.singleton ? 'entry' : request.target ?? 'list';
    if (target === 'entry') {
      const candidate = config.pageType === 'worksheet' ? context['activeLine'] ?? context['headerData'] : context['headerData'];
      const record = candidate && typeof candidate === 'object' ? candidate as Record<string, unknown> : {};
      if (config.pageType === 'worksheet' && config.dataSource.navigation) {
        try { this.data.relation(config.dataSource, record); }
        catch { this.failure = 'parent-context-missing'; return false; }
      }
      const existing = [...this.deferredSaves].find(([key,save]) => this.entryRevisions.get(key)?.source.endpoint === config.dataSource!.endpoint && save.valid() && String(save.record[config.dataSource!.keyField ?? 'systemId']) === String(record[config.dataSource!.keyField ?? 'systemId']) && record[config.dataSource!.keyField ?? 'systemId'] != null);
      if (existing) { if (!existing[1].owner.state().pending) this.resumeSave(existing[0]); return true; }
      const opened = this.stack.open({ id, title: config.title, mode: request.mode ?? 'page', size: request.size ?? 'full', allowNested: request.allowNested ?? true, closeOnBackdrop: false,
        data: { runtimePage: { pageId: definition.pageId, module: definition.module, record } } satisfies RunModalHostData });
      if (opened && typeof context['parentPopupId'] === 'string') this.parents.set(id, context['parentPopupId']);
      if (opened) {
        this.entryPages.set(id, definition.pageId);
        this.entryRevisions.set(id, { source: config.dataSource, revision: this.data.getResourceRevision(config.dataSource), before: structuredClone(record) });
      }
      this.failure = opened ? '' : 'popup-open-blocked';
      return opened;
    }
    const source = this.contextualSource(config.dataSource, context);
    this.filters.initializeFromConfig(id, config, source.defaultFilter);
    const binding: ListBinding = { pageId: definition.pageId, module: definition.module, source, context, rows: [], loading: false, hasMore: true, generation: 0 };
    const opened = this.stack.open({ id, title: config.title, mode: request.mode ?? 'page', size: request.size ?? 'full', allowNested: request.allowNested ?? true,
      data: { runModalList: { pageId: definition.pageId, config, rows: [], loading: true, hasMore: false } } satisfies RunModalHostData });
    if (!opened) { this.filters.release(id); this.failure = 'popup-open-blocked'; return false; }
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
    await this.loadList(id, true, event.actionKey === 'refresh');
    return true;
  }
  async loadNextListPage(id: string): Promise<void> {
    if (this.lists.get(id)?.hasMore) await this.loadList(id, false);
  }
  handlePopupAction(_id: string, _config: DocumentWindowConfig, _event: { actionKey: string; payload?: unknown }): boolean { return false; }
  releasePopup(id: string, confirmed?: Record<string, unknown>): void {
    this.releaseDeferred(id);
    this.state.releasePopup(id);
    this.lists.delete(id);
    this.filters.release(id);
    const parent = this.parents.get(id);
    this.parents.delete(id);
    const page = this.entryPages.get(id);
    this.entryPages.delete(id);
    const initial = this.entryRevisions.get(id);
    this.entryRevisions.delete(id);
    const changed = initial && this.data.getResourceRevision(initial.source) !== initial.revision;
    if (!page || !changed || !initial) return;
    const key=initial.source.keyField ?? 'systemId';
    const saved=confirmed ?? (initial.before[key] == null ? undefined : this.data.getCachedRecord(initial.source,initial.before[key],Infinity));
    this.entriesChanged$.next({pageId:page,source:initial.source,before:initial.before,saved});
    const binding=parent ? this.lists.get(parent) : undefined;
    if(parent && binding){
      if(saved && binding.source.endpoint===initial.source.endpoint && this.configData.canSynchronizeListRecord(binding.rows,initial.before,saved,binding.source,this.filters.buildFilter(parent))){
        binding.rows=binding.rows.map(row=>row && typeof row==='object' && String((row as Record<string,unknown>)[key])===String(saved[key]) ? this.configData.mergeListRecord(saved,row as Record<string,unknown>) : row);
        this.patch(parent,{rows:binding.rows});
      }else void this.loadList(parent,true);
    }
  }
  getLastOpenFailureReason(): string { return this.failure; }

  private async loadList(id: string, reset: boolean, forceRefresh = false): Promise<void> {
    const binding = this.lists.get(id);
    if (!binding || (binding.loading && !reset)) return;
    const generation = ++binding.generation;
    binding.loading = true;
    this.patch(id, { loading: true, errorMessage: undefined });
    try {
      const source = { ...binding.source, defaultFilter: this.filters.buildFilter(id) };
      const size = source.pageSize ?? 20;
      const page = await firstValueFrom(this.data.loadList(source, { top: size, skip: reset ? 0 : binding.rows.length, cursor: reset ? undefined : binding.cursor, useCache: true, maxAgeMs: 30000, forceRefresh }).pipe(timeout<unknown>(this.policy.hydrationTimeoutMs))) as DataPage;
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
    if (!source.lineFKProp) return source;
    const record = (context['headerData'] ?? context['activeLine'] ?? {}) as Record<string, unknown>;
    const value = record[source.contextHeaderPKProp ?? source.headerPKProp ?? source.lineFKProp];
    if (value === undefined || value === null || value === '') throw new Error('The related record context is missing.');
    const clauses = [`${source.lineFKProp} eq '${String(value).replace(/'/g, "''")}'`];
    for (const [field, headerField] of Object.entries(source.parentFieldMap ?? {})) {
      const mapped = record[headerField];
      if (mapped === undefined || mapped === null || mapped === '') throw new Error('The related record context is missing.');
      const literal = typeof mapped === 'number' || typeof mapped === 'boolean' ? String(mapped) : `'${String(mapped).replace(/'/g, "''")}'`;
      clauses.push(`${field} eq ${literal}`);
    }
    const predicate = clauses.join(' and ');
    return { ...source, defaultFilter: source.defaultFilter ? `(${source.defaultFilter}) and (${predicate})` : predicate };
  }
}
