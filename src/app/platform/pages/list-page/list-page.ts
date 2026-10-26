import { ListGrid } from '../list-grid/list-grid';
import { RunModalHost } from '../../run-modal/run-modal-host/run-modal-host';
import { RecordDeleteService } from '../../data/record-delete.service';
import { UnsavedChangesService } from '../unsaved-changes.service';
import { clearDependentLookups } from '../../data/lookup-dependencies';
import { fieldIsRequired } from '../../models/field-state';
import { resolvePageIdentity, recordIdentityText } from '../../data/record-identity';
import { headerDataSourceDefaults, lineConfigDefaults } from '../../data/document-config-defaults';
import { HostListener, ChangeDetectorRef, Component, forwardRef, EventEmitter, Input, OnDestroy, OnInit, Output, inject, ViewChild } from '@angular/core';
import { Observable, Subscription, from, of, firstValueFrom } from 'rxjs';
import { catchError, map, timeout } from 'rxjs/operators';
import { switchMap } from 'rxjs/operators';
import { SessionService } from '../../../core/services/session.service';
import { AttachmentsConfig, DocumentWindowConfig, HeaderConfig, LineTotalsConfig, DocumentStatusMessage } from '../../models/document-window-config.model';
import { LineColumnConfig, LineConfig } from '../../models/line-config.model';
import { CommandConfig } from '../../models/command-config.model';
import { ListCommandSelectionMode, ListPageConfig } from '../../models/page-config.model';
import { DataSourceConfig } from '../../models/data-source-config.model';
import { GENERIC_MESSAGES } from '../../models/generic-messages';
import { ActionDispatcherService } from '../../../shared/ui/action-dispatcher.service';
import { ApiErrorService } from '../../data/api-error.service';
import { ConfirmationService } from '../../../shared/ui/confirmation.service';
import { DataPage, DataSourceService } from '../../data/data-source.service';
import { DraftCreateService } from '../../data/draft-create.service';
import { DocumentConfigDataService } from '../../data/document-config-data.service';
import { DocumentPayloadService } from '../../data/document-payload.service';
import { DocumentRecordService } from '../../data/document-record.service';
import { DocumentHydrationOrchestratorService } from '../../data/document-hydration-orchestrator.service';
import { DocumentResponseNormalizerService } from '../../data/document-response-normalizer.service';
import { DocumentStateService } from '../../data/document-state.service';
import { FieldValidationService } from '../../document/field-validation.service';
import { LineCalculationService } from '../../document/line-calculation.service';
import { LineCommandService } from '../../document/line-command.service';
import { LineMasterRegistry, LineMasterService } from '../../data/line-master.service';
import { ListFilterStateService } from '../list-filter-state.service';
import { MasterDataService } from '../../data/master-data.service';
import { PageCommandService } from '../page-command.service';
import { RunModalStackService } from '../../run-modal/run-modal-stack.service';
import { RUNTIME_TIMEOUT_POLICY } from '../../data/runtime-timeout-policy.token';
import {
  DocumentPageDataSourceResolverService,
  DocumentPageLineValueType,
  DocumentPageResolvedLineDataSource,
} from '../document-page-data-source-resolver.service';
import { DocumentPageCommandRoutingResolverService } from '../document-page-command-routing-resolver.service';
import { DocumentPageCommandAssemblerService } from '../document-page-command-assembler.service';
import { DocumentPageListLifecycleContext, DocumentPageListLifecycleService } from '../document-page-list-lifecycle.service';
import { RuntimeValueMapperService } from '../../data/runtime-value-mapper.service';
import { RunModalLoadingService } from '../../run-modal/run-modal-loading.service';
import { RunModalService, SavedEntryChange } from '../../run-modal/run-modal.service';
import { DocumentPageCommandPermissionService } from '../document-page-command-permission.service';
import { DocumentWindow } from '../../document/document-window/document-window';

type RequiredListConfig = ListPageConfig & { dataSource: DataSourceConfig };
type SelectOption = { label: string; value: string };
type ResolvedLineDataSource = {
  dataSource: DataSourceConfig;
  lineContextReady: boolean;
  reason?: string;
};

type CreateLineOptions = {
  ensureTrailingEmpty?: boolean;
  onSettled?: (success: boolean) => void;
};

export interface DocumentPageCommandEvent {
  actionKey: string;
  payload?: unknown;
  context: {
    pageId: string;
    selectedRow?: unknown;
    checkedRowKeys: string[];
    headerData?: Record<string, unknown>;
    lineRows?: Record<string, unknown>[];
  };
}

@Component({
  selector: 'app-list-page, app-document-page',
  standalone: true,
  imports: [ListGrid, forwardRef(() => RunModalHost), DocumentWindow],
  templateUrl: './list-page.html',
  styles: [':host { display: block; height: 100%; min-height: 0; }'],
})
export class ListPage implements OnInit, OnDestroy {
  private readonly actionDispatcher = inject(ActionDispatcherService);
  private readonly changeDetector = inject(ChangeDetectorRef);
  private readonly dataSource = inject(DataSourceService);
  private readonly draftCreate = inject(DraftCreateService);
  private readonly documentConfigData = inject(DocumentConfigDataService);
  private readonly documentPayload = inject(DocumentPayloadService);
  private readonly documentRecord = inject(DocumentRecordService);
  private readonly documentHydration = inject(DocumentHydrationOrchestratorService);
  private readonly documentResponseNormalizer = inject(DocumentResponseNormalizerService);
  private readonly documentState = inject(DocumentStateService);
  private readonly fieldValidation = inject(FieldValidationService);
  private readonly apiError = inject(ApiErrorService);
  private readonly lineMasters = inject(LineMasterService);
  private readonly lineCommands = inject(LineCommandService);
  private readonly lineCalculations = inject(LineCalculationService);
  private readonly deletes = inject(RecordDeleteService);
  private deleting = false;
  private readonly listFilterState = inject(ListFilterStateService);
  private readonly masterData = inject(MasterDataService);
  private readonly pageCommands = inject(PageCommandService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly popupStack = inject(RunModalStackService);
  private readonly runModalLoading = inject(RunModalLoadingService);
  private readonly runModal = inject(RunModalService);
  private readonly timeoutPolicy = inject(RUNTIME_TIMEOUT_POLICY);
  private readonly dataSourceResolver = inject(DocumentPageDataSourceResolverService);
  private readonly commandRoutingResolver = inject(DocumentPageCommandRoutingResolverService);
  private readonly commandAssembler = inject(DocumentPageCommandAssemblerService);
  private readonly listLifecycle = inject(DocumentPageListLifecycleService);
  private readonly valueMapper = inject(RuntimeValueMapperService);
  private readonly sessionService = inject(SessionService);
  private readonly subscriptions = new Subscription();
  private readonly unsavedNavigation = inject(UnsavedChangesService);
  get hasUnsavedChanges(): boolean { return this.dirty || this.dirtyWorksheet || this.invalidHeaderDrafts.size > 0; }
  get hasPendingWrites(): boolean { return this.deleting || this.savingEntry || this.autosavePending > 0 || this.worksheetPending > 0 || this.lineBatchPending; }
  private readonly commandPermission = inject(DocumentPageCommandPermissionService);
  private readonly worksheetChangedRows = new Set<Record<string, unknown>>();
  private worksheetPending = 0;
  private worksheetSource?: DataSourceConfig;
  get isWorksheetPage(): boolean { return this.listConfig.pageType === 'worksheet'; }
  get dirtyWorksheet(): boolean { return this.isWorksheetPage && (this.worksheetChangedRows.size > 0 || this.worksheetPending > 0); }
  private get permissionPageId(): string { return this.listConfig.permissionPageId ?? this.pageId; }
  @HostListener('window:beforeunload', ['$event']) protectWorksheet(event: BeforeUnloadEvent): void {
    if (this.hasUnsavedChanges || this.hasPendingWrites) { event.preventDefault(); event.returnValue = ''; }
  }
  canLeaveWorksheet(): boolean {
    if (!this.dirtyWorksheet) return true;
    this.setEntryStatus({tone: 'error', title: 'Unsaved changes', message: 'Complete or retry the changed rows before leaving.'});
    return false;
  }
  private worksheetAllowed(row: Record<string, unknown>): boolean {
    const source = this.worksheetSource ?? this.listConfig.dataSource;
    const operation = this.hasValue(this.resolvePersistedRecordId(row, source)) ? 'modify' : 'create';
    const mapped = source.permissions?.[operation === 'modify' ? 'update' : 'create'] ?? operation;
    return !this.commandPermission.applyOperation({label: 'Save', actionKey: 'save'}, this.permissionPageId, mapped).disabled && this.dataSource.canWrite(source, row);
  }
  private async loadWorksheet(reset = true, forceRefresh = false): Promise<void> {
    if (!this.lineConfig || this.popupLoading || this.dirtyWorksheet) return;
    try {
      this.worksheetSource = this.dataSource.relation(this.lineConfig.dataSource, this.initialRecord ?? {});
      if (!this.activeDocumentWindowConfig) this.openDocumentPopup({ ...(this.initialRecord ?? {}) }, []);
      this.startPopupLoading('Loading records...');
      const existing = reset ? [] : (this.activeDocumentWindowConfig?.lineRows ?? []).filter(row => this.hasValue(this.resolvePersistedRecordId(row, this.worksheetSource)));
      const size = this.worksheetSource.pageSize ?? 25;
      const page = await firstValueFrom(this.dataSource.loadList(this.worksheetSource, {top: size, skip: existing.length, cursor: reset ? undefined : this.nextCursor, forceRefresh, useCache: true, maxAgeMs: 30000}).pipe(timeout<unknown>(this.timeoutPolicy.hydrationTimeoutMs))) as DataPage;
      const records = await this.documentHydration.resolveLineLookups(page.value, this.lineConfig.columns, this.initialRecord ?? {}, () => true, () => this.startPopupLoading('Loading selected values...'));
      this.nextCursor = typeof page.meta['nextCursor'] === 'string' ? page.meta['nextCursor'] : undefined;
      this.hasMore = this.worksheetSource.paging === 'cursor' ? !!this.nextCursor : typeof page.meta['total'] === 'number' ? existing.length + records.length < page.meta['total'] : records.length === size;
      this.activeDocumentWindowConfig!.lineRows = this.buildLineRows(this.initialRecord ?? {}, [...existing, ...records]);
      this.activeLineRow = undefined; this.selectedLineIndexes = [];
      this.ensureTrailingEmptyRows();
      this.stopPopupLoading(); this.clearEntryStatus();
    } catch (error) {
      this.unknownSaveOutcome ||= this.isUncertainSave(error);
      this.stopPopupLoading();
      this.setEntryStatus({tone: 'error', title: 'Load failed', message: this.getErrorMessage(error)});
    }
    this.changeDetector.detectChanges();
  }
  loadMoreWorksheet(): void { if (this.hasMore) void this.loadWorksheet(false); }
  private saveWorksheet(): void {
    if (!this.lineConfig) return;
    for (const row of this.worksheetChangedRows) this.saveLineFields(row, this.lineConfig.columns.filter(column => !column.readonly).map(column => column.field ?? column.id));
  }
  private worksheetSaveFinished(row: Record<string, unknown>, saved: unknown): void {
    if (!this.isWorksheetPage) return;
    this.worksheetPending = Math.max(0, this.worksheetPending - 1);
    if (saved && !this.deferredLineSaveFields.has(row)) this.worksheetChangedRows.delete(row);
    this.dirty = this.dirtyWorksheet;
  }
  private readonly loadingInstanceId = crypto.randomUUID();
  private readonly loadedHeaderDropdownKeys = new Set<string>();
  private readonly loadingHeaderDropdownKeys = new Set<string>();
  private readonly loadedLineOptionKeys = new Set<string>();
  private readonly loadingLineOptionKeys = new Set<string>();

  @ViewChild(DocumentWindow) private documentWindow?: DocumentWindow;
  @Input() pageId = 'document';
  @Input() listConfig: RequiredListConfig = {} as RequiredListConfig;
  @Input() setupConfig?: RequiredListConfig;
  @Input() headerConfig: HeaderConfig = {dialogTitle: '', toolbarButtons: [], sections: []};
  @Input() lineConfig?: LineConfig;
  @Input() documentOnly = false;
  @Input() initialRecord?: Record<string, unknown>;
  @Output() closeRequested = new EventEmitter<void>();
  @Output() businessCommand = new EventEmitter<DocumentPageCommandEvent>();

  error?: string;
  hasMore = true;
  private nextCursor?: string;
  rows: unknown[] = [];
  selectedRow?: unknown;

  private listLoadSubscription?: Subscription;
  private filterReloadTimer?: ReturnType<typeof setTimeout>;
  private pendingFirstPageReload = false;
  private savingEntry = false;
  private unknownSaveOutcome = false;
  private dirty = false;
  private readonly invalidHeaderDrafts = new Set<string>();
  private autosavePending = 0;
  private lineBatchPending = false;
  private editSequence = 0;
  private readonly unsavedFields = new Map<Record<string, unknown>, Map<string, number>>();

  private trackUnsaved(record: Record<string, unknown>, fields: string[]): void {
    const edits = this.unsavedFields.get(record) ?? new Map<string, number>();
    for (const field of fields) edits.set(field, ++this.editSequence);
    this.unsavedFields.set(record, edits);
  }

  private beginAutosave(record: Record<string, unknown>, fields?: string[]): Map<string, number> {
    this.autosavePending++;
    return new Map([...(this.unsavedFields.get(record) ?? [])].filter(([field]) => !fields || fields.includes(field)));
  }

  private finishAutosave(record: Record<string, unknown>, sent: Map<string, number>, success: boolean): void {
    this.autosavePending = Math.max(0, this.autosavePending - 1);
    this.runModal.notifyBackground(this.initialRecord);
    if (!success) return;
    const edits = this.unsavedFields.get(record);
    for (const [field, revision] of sent) if (edits?.get(field) === revision) edits.delete(field);
    if (!edits?.size) this.unsavedFields.delete(record);
    if (!this.isWorksheetPage && !this.usesManualSaveMode()) {
      this.dirty = this.unsavedFields.size > 0 || this.autosavePending > 0;
    }
  }
  private mergeAutosaveResponse(record: Record<string, unknown>, saved: Record<string, unknown>): void {
    const pending = Object.fromEntries([...(this.unsavedFields.get(record)?.keys() ?? [])].map(field => [field, record[field]]));
    Object.assign(record, saved, pending);
  }
  private activeDocumentWindowConfig?: DocumentWindowConfig;
  private optionFieldMap: Record<string, SelectOption[]> = {};
  private headerDropdownRecords: Record<string, Record<string, unknown>[]> = {};
  private lineMasterRecordsByType: Record<string, Record<string, unknown>[]> = {};
  private lineMasterOptionsByType: Record<string, SelectOption[]> = {};
  private checkedRowKeys = new Set<string>();
  private pendingDraftCreateFromNew = false;
  private draftCreateInProgress = false;
  private autosaveDeferredUntilDraftCreate = false;
  private pendingListSyncRecord?: Record<string, unknown>;
  private activeLineRow?: Record<string, unknown>;
  private selectedLineIndexes: number[] = [];
  private readonly lineCreateInProgress = new WeakSet<Record<string, unknown>>();
  private readonly deferredLineSaveFields = new WeakMap<Record<string, unknown>, Set<string>>();

  constructor() {}

  get loading(): boolean {
    return this.runModalLoading.isScopeLoading(this.listLoadingScope);
  }

  get popupLoading(): boolean {
    return this.runModalLoading.isScopeLoading(this.popupLoadingScope);
  }

  get popupLoadingMessage(): string {
    return this.runModalLoading.getScopeMessage(this.popupLoadingScope) || 'Loading document...';
  }

  get listFilterScope(): string {
    return this.listConfig.pageId ?? this.listConfig.dataSurface?.id ?? this.pageId;
  }

  private get listLoadingScope(): string {
    return `section:page:list:${this.pageId}:${this.loadingInstanceId}`;
  }

  private get popupLoadingScope(): string {
    return `document:${this.pageId}:${this.loadingInstanceId}:popup`;
  }

  get listFilterStorageKey(): string {
    return this.listConfig.filterConfig?.storageKey ?? this.listFilterScope;
  }

  get isSetupPage(): boolean {
    const pageType = this.toText(this.listConfig.pageType).trim().toLowerCase();
    return pageType === 'setup' || pageType === 'worksheet';
  }

  ngOnInit(): void {
    this.unsavedNavigation.register(this,{changed:()=>this.hasUnsavedChanges,saving:()=>this.hasPendingWrites});
    if (!this.listConfig?.dataSource && this.setupConfig?.dataSource) {
      this.listConfig = this.setupConfig;
    }

    if (!this.listConfig?.dataSource) {
      throw new Error('ListPage requires listConfig or setupConfig with dataSource.');
    }

    this.pageId = this.listConfig.pageId ?? this.pageId;
    this.listConfig = { ...this.listConfig, dataSource: headerDataSourceDefaults(this.listConfig.dataSource, this.headerConfig) };
    const permission = this.sessionService.Permissions.find(value => this.isRecord(value) && (value['pageId'] === this.permissionPageId || value['PageId'] === this.permissionPageId));
    const query = this.isRecord(permission) && this.isRecord(permission['query']) ? permission['query'] : undefined;
    if (query && Array.isArray(query['fields']) && Array.isArray(query['search']) && this.listConfig.dataSurface) {
      const fields = new Set(query['fields']);
      const search = new Set(query['search']);
      this.listConfig = {...this.listConfig, dataSurface: {...this.listConfig.dataSurface, columns: this.listConfig.dataSurface.columns.map(column => {
        const key = column.field ?? column.id;
        return {...column, sortable: column.sortable ?? fields.has(key), filterable: column.filterable ?? fields.has(key), searchable: column.searchable ?? search.has(key)};
      })}};
    }
    if (this.lineConfig) this.lineConfig = lineConfigDefaults(this.lineConfig);

    if (this.documentOnly) {
      this.openEntry();
      return;
    }
    this.actionDispatcher.setPageCommands([...(this.listConfig.commands ?? []), ...(this.isWorksheetPage ? this.lineConfig?.toolbarButtons ?? [] : [])]);
    this.actionDispatcher.setPageContext({
      pageId: this.permissionPageId,
      title: this.listConfig.title,
      module: this.listConfig.module,
      company: this.listConfig.company,
      viewSuffix: this.listConfig.viewSuffix,
      views: this.listConfig.views,
      activeViewId: this.listConfig.activeViewId,
      tools: this.listConfig.tools,
      standardActions: this.listConfig.standardActions,
      dataSource: this.listConfig.dataSource,
    });
    this.listFilterState.initializeFromConfig(
      this.listFilterScope,
      this.listConfig,
      this.listConfig.dataSource.defaultFilter,
    );
    if (this.isInlineEntryPage) this.openEntry();
    else this.loadFirstPage();

    this.subscriptions.add(
      this.actionDispatcher.action$.subscribe((event) => this.handleCommand(event)),
    );
    this.subscriptions.add(this.runModal.entriesChanged$.subscribe(change => {
      if (!this.documentOnly && change.pageId===this.pageId && !this.isInlineEntryPage) void this.synchronizeSavedEntry(change).catch(error=>{this.error=this.getErrorMessage(error);this.changeDetector.detectChanges();});
    }));
  }

  ngOnDestroy(): void {
    this.unsavedNavigation.release(this);
    if (!this.documentOnly) this.listFilterState.release(this.listFilterScope);
    if (!this.documentOnly) {
      this.actionDispatcher.clearPageCommands();
      this.actionDispatcher.clearPageContext();
    }
    this.listLoadSubscription?.unsubscribe();
    this.stopListLoading();
    this.stopPopupLoading();
    this.clearFilterReloadTimer();
    this.documentState.clearAutosave(this.pageId);
    this.subscriptions.unsubscribe();
  }

  handlePopupAction(event: { popupId: string; actionKey: string; payload?: unknown }): void {
    this.documentState.handleEntryPopupAction(
      event,
      this.entryPopupId,
      {
        lineChanged: (payload) => this.handleLineChanged(payload),
        lineSelectionChanged: (payload) => this.handleLineSelectionChanged(payload),
        headerChanged: (payload) => this.handleHeaderChanged(payload),
        autosave: (payload) => this.handleAutosave(payload),
        command: (actionKey, payload) => this.handleEntryInteractionAction(actionKey, payload),
        commands: {
          save: () => this.queueLocalAutosave(),
          apply: () => this.queueLocalAutosave(),
          lineNew: () => this.appendNewLine('append'),
          lineInsert: () => this.appendNewLine('prepend'),
          command: (command, payload) => this.handleEntryCommand(command, payload),
        },
      },
      {
        documentWindowConfig: this.activeDocumentWindowConfig,
        lineConfig: this.lineConfig,
      },
    );
  }

  handlePopupClosed(event: { popupId: string; documentWindowConfig?: DocumentWindowConfig }): void {
    if (event.popupId !== this.entryPopupId) {
      return;
    }

    if (this.isRecord(event.documentWindowConfig?.headerData) && !this.pendingListSyncRecord) {
      this.pendingListSyncRecord = this.buildListSyncRecord(event.documentWindowConfig.headerData);
    }

    this.applyDeferredListSync();
  }

  get inlineDocumentWindowConfig(): DocumentWindowConfig | undefined {
    return this.activeDocumentWindowConfig;
  }

  get isInlineEntryPage(): boolean {
    const pageType = this.toText(this.listConfig.pageType).trim().toLowerCase();
    return pageType === 'worksheet' || pageType === 'setup';
  }

  get inlineEntryPopupId(): string {
    return this.entryPopupId;
  }

  handleCommand(event: { actionKey: string; payload?: unknown }): void {
    if (this.runModal.isRecordBackground(this.initialRecord)) return;
    if (this.deleting) return;
    if (this.isWorksheetPage) { this.handleEntryCommand(this.normalizeCommandAction(event.actionKey), event.payload); return; }
    if (this.listConfig.dataSource.singleton) {
      if (event.actionKey === 'refresh') this.refreshActiveEntry();
      return;
    }
    if (event.actionKey === 'sortChanged' && this.isRecord(event.payload)) {
      this.listConfig = { ...this.listConfig, dataSource: { ...this.listConfig.dataSource, defaultSort: String(event.payload['sort']) } };
      this.loadFirstPage(true);
      return;
    }
    if (this.listFilterState.applyCommand(this.listFilterScope, event.actionKey, event.payload)) {
      this.scheduleFilterReload();
      return;
    }

    this.pageCommands.handleListCommand(event, {
      refresh: () => this.loadFirstPage(true),
      createNew: () => this.openNewPreview(),
      delete: () => {
        void this.deleteSelectedRows();
      },
      command: (actionKey, payload) => this.handleCustomListCommand(actionKey, payload),
    });
  }

  handleCheckedKeysChanged(keys: string[]): void {
    this.checkedRowKeys = new Set(keys.filter((key) => key.trim().length > 0));
  }

  openRecord(row: unknown, preserveLoader = false): void {
    if (this.deleting) return;
    if (!this.documentOnly && !this.listConfig.dataSource.singleton) {
      void this.runModal.open({ pageId: this.pageId, target: 'entry', context: { headerData: this.isRecord(row) ? row : {} }, allowNested: true }).then(opened => {
        if (!opened) { this.error = this.runModal.getLastOpenFailureReason(); this.changeDetector.detectChanges(); }
      });
      this.stopPopupLoading();
      return;
    }
    const record = this.isRecord(row) ? row : this.buildNewHeaderSeed();
    const persisted = this.hasPersistedIdentity(record);
    this.pendingDraftCreateFromNew = !persisted && this.shouldCreateDraftOnInput();
    this.autosaveDeferredUntilDraftCreate = false;
    this.pendingListSyncRecord = undefined;
    this.openDocumentPopup(record, []);
    if (!persisted) { this.stopPopupLoading(); return; }
    if (this.activeDocumentWindowConfig) { this.activeDocumentWindowConfig.lineRows = []; this.activeDocumentWindowConfig.contentReady = false; }
    // Loading starts only when the shared read actually has to await the server.
    // Header, selected labels and child rows each retain their own request deadline.
    // Do not cut off a healthy multi-request hydration with one aggregate request timeout.
    this.subscriptions.add(this.loadHeaderRecord(record).subscribe({
      next: header => {
        const hydrated = this.applyHydratedHeaderRecord(header);
        this.hydrateOpenedDocumentLines(hydrated);
      },
      error: error => {
        this.stopPopupLoading();
        if (this.activeDocumentWindowConfig) this.activeDocumentWindowConfig.interactionLocked = true;
        this.setEntryStatus({ tone: 'error', title: 'Load failed', message: this.getErrorMessage(error) });
        this.changeDetector.detectChanges();
      },
    }));
  }
  private canHydrateOpenedDocumentLinesFromHeader(header: Record<string, unknown>): boolean {
    if (!this.lineConfig) {
      return false;
    }

    const resolved = this.resolveLineDataSourceForHeader(header);
    return resolved.lineContextReady;
  }

  private applyHydratedHeaderRecord(headerRecord: Record<string, unknown>): Record<string, unknown> {
    const currentConfig = this.activeDocumentWindowConfig;
    if (!currentConfig) {
      return this.buildHeaderData(headerRecord);
    }

    const nextHeaderData = this.buildHeaderData(headerRecord);
    currentConfig.contentReady = true;
    currentConfig.headerData = nextHeaderData;
    currentConfig.subtitle = '';
    currentConfig.title = this.getDocumentTitle(headerRecord);
    currentConfig.pageLabel = this.documentLabel;
    this.refreshEntryPolicy();
    this.changeDetector.detectChanges();
    return nextHeaderData;
  }

  private hydrateOpenedDocumentLines(headerData: Record<string, unknown>): void {
    if (!this.lineConfig) {
      this.finishCardLineLoading();
      return;
    }

    let lineLoadHandled = false;
    const finishLineLoad = (failed: boolean, error?: unknown): void => {
      if (lineLoadHandled) {
        return;
      }

      lineLoadHandled = true;
      this.finishCardLineLoading(failed, error);
    };

    this.subscriptions.add(
      this.loadLineRows(headerData)
        .subscribe({
          next: (response) => {
            const records = this.toRecords(response);
            const currentConfig = this.activeDocumentWindowConfig;
            if (!currentConfig?.headerData || !this.lineConfig) {
              return;
            }

            currentConfig.lineRows = this.buildLineRows(currentConfig.headerData, records);
            currentConfig.lineTotals = this.buildLineTotals(
              currentConfig.lineRows,
              currentConfig.headerData,
            );
            this.applyLineOptions(currentConfig.lineRows);
            this.changeDetector.detectChanges();


            finishLineLoad(false);
          },
          error: (error: unknown) => {
            finishLineLoad(true, error);
          },
          complete: () => {
            finishLineLoad(false);
          },
        }),
    );
  }

  private startCardLineLoading(): void {
    const currentConfig = this.activeDocumentWindowConfig;
    if (!currentConfig || !this.lineConfig) {
      return;
    }

    this.startPopupLoading('Loading lines...');
  }

  private finishCardLineLoading(failed = false, error?: unknown, subject = 'Lines'): void {
    const currentConfig = this.activeDocumentWindowConfig;
    if (!currentConfig) {
      this.stopPopupLoading();
      return;
    }

    this.stopPopupLoading();

    currentConfig.interactionLocked = failed;
    currentConfig.statusMessage = failed
      ? {
          tone: 'warning',
          title: `${subject} could not load`,
          message: this.apiError.toMessage(error, `${subject} could not load. Retry to load the latest data.`),
          blocking: false,
        }
      : undefined;
    this.changeDetector.detectChanges();
  }

  private scheduleOpenEntryOptionHydration(): void {
    this.hydrateOpenEntryOptions();
  }

  private hydrateOpenEntryOptions(): void {
    const documentWindowConfig = this.activeDocumentWindowConfig;
    if (!documentWindowConfig) {
      return;
    }

    this.subscriptions.add(
      this.loadLineMasterOptions()
        .pipe(
          switchMap((masters) =>
            this.loadConfiguredHeaderDropdownOptions().pipe(
              map((headerDropdownOptions) => ({ masters, headerDropdownOptions })),
            ),
          ),
        )
        .subscribe({
          next: ({ masters, headerDropdownOptions }) => {
            this.lineMasterRecordsByType = masters.lineMasterRecordsByType;
            this.lineMasterOptionsByType = masters.lineMasterOptionsByType;
            this.optionFieldMap = masters.optionFieldMap;
            this.setHeaderDropdownRecords(headerDropdownOptions);
            this.applyHeaderDropdownOptions(documentWindowConfig);
            this.applyLineOptions(documentWindowConfig.lineRows ?? []);
            this.changeDetector.detectChanges();
          },
          error: () => {},
        }),
    );
  }

  private loadHeaderRecord(row: Record<string, unknown>): Observable<Record<string, unknown>> {
    const pageType = this.toText(this.listConfig.pageType).trim().toLowerCase();
    if (pageType === 'worksheet' || pageType === 'setup') {
      return of(row);
    }

    const recordId = this.resolvePersistedRecordId(row, this.listConfig.dataSource);
    if (!this.hasValue(recordId)) {
      return of(row);
    }

    // An unchanged row already belongs to this open page's trusted read snapshot.
    // Closing its card does not discard that snapshot merely because a short HTTP TTL elapsed.
    const cached = this.dataSource.getCachedRecord(this.listConfig.dataSource, recordId, Infinity);
    const hasHeaderFields = cached && this.headerConfig.sections.flatMap(section => section.fields).every(field => Object.prototype.hasOwnProperty.call(cached, field.key));
    const sameSnapshot = cached && hasHeaderFields && row['systemRowVersion'] !== undefined
      && String(cached['systemRowVersion']) === String(row['systemRowVersion']);
    const header: Observable<Record<string, unknown>> = sameSnapshot
      ? of({...cached, ...Object.fromEntries(Object.entries(row).filter(([key]) => key.startsWith('__'))), ...Object.fromEntries(Object.entries(cached).filter(([key]) => key.startsWith('__'))), __fromReadSnapshot: true})
      : from(this.documentHydration.loadHeaderById(
          this.listConfig.dataSource, recordId, row, this.timeoutPolicy.hydrationTimeoutMs,
          () => this.startPopupLoading('Loading document...'),
        )).pipe(map(response => this.resolveHeaderRecordResponse(response, row)));
    return header.pipe(switchMap(record => from(this.documentHydration.resolveHeaderLookups(
      record, this.headerConfig.sections.flatMap(section => section.fields),
      () => this.startPopupLoading('Loading selected values...'),
    ))), map(prepared => {
      this.dataSource.cachePreparedRecord(this.listConfig.dataSource, recordId, prepared, this.headerConfig.sections.flatMap(section => section.fields));
      return prepared;
    }));
  }

  private resolveHeaderRecordResponse(
    response: unknown,
    fallback: Record<string, unknown>,
  ): Record<string, unknown> {
    return this.documentResponseNormalizer.normalizeSingleRecordResponse(response, fallback);
  }

  loadNextPage(): void {
    this.listLifecycle.loadNextPage(this.listLifecycleContext);
  }

  clearListError(): void {
    this.listLifecycle.clearListError(this.listLifecycleContext);
  }

  private get entryPopupId(): string {
    return `${this.pageId}-entry`;
  }

  private openEntry(): void {
    if (this.isWorksheetPage) { void this.loadWorksheet(); return; }
    if (!this.listConfig.dataSource.singleton) {
      this.openRecord(this.initialRecord ?? this.buildNewHeaderSeed());
      return;
    }
    const initialLoad = !this.activeDocumentWindowConfig;
    if (initialLoad) this.openDocumentPopup(this.buildNewHeaderSeed(), []);
    if (initialLoad && this.activeDocumentWindowConfig) this.activeDocumentWindowConfig.contentReady = false;
    let setupRecordLoaded = false;
    this.subscriptions.add(this.dataSource.loadSingleton(this.listConfig.dataSource, { useCache: true, maxAgeMs: 30000, onRequest: () => this.startPopupLoading('Loading setup...') }).pipe(
      timeout(this.timeoutPolicy.hydrationTimeoutMs),
      switchMap(record => {
        setupRecordLoaded = true;
        return from(this.documentHydration.resolveHeaderLookups(this.isRecord(record) ? record : {}, this.headerConfig.sections.flatMap(section => section.fields), () => this.startPopupLoading('Loading selected values...')));
      }),
    ).subscribe({
      next: record => {
        this.applyHydratedHeaderRecord(this.isRecord(record) ? record : {});
        this.stopPopupLoading();
      },
      error: error => {
        this.stopPopupLoading();
        if (!setupRecordLoaded && error?.status === 404) {
          if (this.activeDocumentWindowConfig) this.activeDocumentWindowConfig.contentReady = true;
        } else {
          if (this.activeDocumentWindowConfig) this.activeDocumentWindowConfig.interactionLocked = true;
          this.setEntryStatus({ tone: 'error', title: 'Load failed', message: this.getErrorMessage(error) });
        }
        this.changeDetector.detectChanges();
      },
    }));
  }

  handleInlineAction(event: { actionKey: string; payload?: unknown }): void {
    if (event.actionKey === 'header-draft') {
      const payload = event.payload as {fieldKey:string;invalid:boolean};
      if (payload.invalid) this.invalidHeaderDrafts.add(payload.fieldKey); else this.invalidHeaderDrafts.delete(payload.fieldKey);
      return;
    }
    this.handlePopupAction({ ...event, popupId: this.entryPopupId });
  }

  async requestClose(): Promise<void> {
    if (this.hasPendingWrites && !this.deleting) {
      if (this.runModal.keepSaving(this.initialRecord,{
        state:()=>({pending:this.hasPendingWrites,dirty:this.hasUnsavedChanges,record:this.activeDocumentWindowConfig?.headerData ?? {},message:this.activeDocumentWindowConfig?.statusMessage?.message,uncertain:this.unknownSaveOutcome}),
        resumed:()=>{if(this.activeDocumentWindowConfig)this.activeDocumentWindowConfig.interactionLocked=this.hasPendingWrites || this.popupLoading;},
        verify:async()=>{
          const header=this.activeDocumentWindowConfig?.headerData ?? {};
          const id=this.resolvePersistedRecordId(header,this.listConfig.dataSource);
          if(!this.hasValue(id) && !this.listConfig.dataSource.singleton)return 'The new record has no confirmed identifier yet. Your edits are retained; do not submit it again.';
          const result=await firstValueFrom(this.dataSource.loadById(this.listConfig.dataSource,id,{forceRefresh:true}).pipe(timeout(this.timeoutPolicy.hydrationTimeoutMs)));
          const current=this.resolveHeaderRecordResponse(result,{});
          const edits=this.unsavedFields.get(header);
          const matches=!!edits?.size && [...edits.keys()].every(field=>JSON.stringify(current[field])===JSON.stringify(header[field]));
          return matches?'The server currently matches these edits. The original save confirmation has not arrived.':'Server record checked. These edits are not confirmed saved; no save was retried.';
        },
      }))this.closeRequested.emit();
      return;
    }
    if (this.hasPendingWrites || this.popupLoading) return;
    if (this.invalidHeaderDrafts.size || (this.isWorksheetPage ? this.dirtyWorksheet : this.dirty)) {
      const confirmed = await this.confirmation.confirm({ title: 'Unsaved changes', message: 'Discard unsaved changes and close this page?' });
      if (!confirmed) return;
    }
    this.closeRequested.emit();
  }

  private validateLineRow(row: Record<string, unknown>): string[] {
    return (this.lineConfig?.fields ?? [])
      .filter(field => !field.readonly && !field.disabled)
      .flatMap(field => this.fieldValidation.validateField(field, row[field.key], row).errors);
  }

  private async saveEntry(): Promise<boolean> {
    if (this.deleting) return false;
    if (this.isWorksheetPage) { this.saveWorksheet(); return !this.dirtyWorksheet; }
    const config = this.activeDocumentWindowConfig;
    if (!config?.headerData || this.savingEntry) return false;
    const header = config.headerData;
    const source = this.listConfig.dataSource;
    if (this.documentWindow && !this.documentWindow.validateHeaderForms()) return false;
    if (!this.dirty && this.hasPersistedIdentity(header)) return true;
    if ((!this.canModifyPage() && !this.canModifyLines()) || !this.dataSource.canWrite(source, header)) return false;
    for (const section of this.headerConfig.sections) {
      for (const field of section.fields) {
        if (field.readonly || field.disabled) continue;
        const validation = this.fieldValidation.validateField(field, header[field.key], header);
        if (!validation.valid) {
          this.setEntryStatus({ tone: 'error', title: 'Check required fields', message: validation.errors.join(' ') });
          this.changeDetector.detectChanges();
          return false;
        }
      }
    }
    for (const row of config.lineRows ?? []) {
      if (this.isLineRowMeaningfullyEmpty(row)) continue;
      const errors = this.validateLineRow(row);
      if (errors.length) {
        this.setEntryStatus({ tone: 'error', title: 'Check line fields', message: errors.join('. ') });
        this.changeDetector.detectChanges();
        return false;
      }
    }
    this.savingEntry = true;
    this.startPopupLoading('Saving changes...');
    try {
      const id = this.resolvePersistedRecordId(header, source);
      const payload = id || source.singleton
        ? this.documentPayload.buildHeaderUpdatePayload(header, this.headerConfig.sections)
        : this.documentPayload.buildHeaderCreatePayload(header, this.headerConfig.sections);
      const headerEdits = this.unsavedFields.get(header);
      if ((!id && !source.singleton) || headerEdits?.size) {
        const headerPayload = id || source.singleton ? Object.fromEntries(Object.entries(payload).filter(([key]) => headerEdits?.has(key))) : payload;
        if (Object.keys(headerPayload).length) {
          const saved = await firstValueFrom(id || source.singleton ? this.dataSource.updateRecord(source, id, headerPayload, header) : this.dataSource.create(source, headerPayload));
          if (this.isRecord(saved)) Object.assign(header, saved);
        }
        this.unsavedFields.delete(header);
      }
      if (this.lineConfig) {
        const lineSource = this.dataSource.relation(this.lineConfig.dataSource, header);
        for (const row of config.lineRows ?? []) {
          const lineId = this.resolvePersistedRecordId(row, lineSource);
          if (this.hasValue(lineId) && !this.unsavedFields.get(row)?.size) continue;
          if (!this.hasValue(lineId) && this.isLineRowMeaningfullyEmpty(row)) continue;
          const required = lineSource.requiredCreateFields ?? [];
          if (!lineId && required.some(field => !this.hasValue(row[field]))) throw new Error('Complete the required line fields before saving.');
          const linePayload = lineId
            ? this.documentConfigData.buildLineUpdatePayload(row, [...(this.unsavedFields.get(row)?.keys() ?? [])].filter(field => !lineSource.updateFields || lineSource.updateFields.includes(field)), this.lineConfig)
            : this.documentConfigData.buildLineCreatePayload(row, this.lineConfig);
          if (!linePayload) throw new Error('Complete the required line fields before saving.');
          const line = await firstValueFrom(lineId ? this.dataSource.updateRecord(lineSource, lineId, linePayload, row) : this.dataSource.create(lineSource, linePayload));
          if (this.isRecord(line)) Object.assign(row, line);
          this.unsavedFields.delete(row);
        }
      }
      this.pendingDraftCreateFromNew = false;
      this.refreshEntryPolicy();
      this.dirty = false;
      this.unsavedFields.clear();
      if (!source.singleton) {
        const fresh = await firstValueFrom(this.loadHeaderRecord(header));
        Object.assign(header, fresh);
        this.refreshEntryPolicy();
      }
      this.stageListSyncFromActiveHeader();
      this.stopPopupLoading();
      this.setEntryStatus({ tone: 'success', title: 'Saved', message: 'Changes saved.' });
      this.ensureTrailingEmptyRows();
      this.changeDetector.detectChanges();
      return true;
    } catch (error) {
      this.stopPopupLoading();
      this.setEntryStatus({ tone: 'error', title: 'Save failed', message: this.getErrorMessage(error) });
      this.changeDetector.detectChanges();
      return false;
    } finally { this.savingEntry = false; this.runModal.notifyBackground(this.initialRecord); }
  }

  private get documentLabel(): string {
    return this.headerConfig.dialogTitle || this.listConfig.title || 'Document';
  }

  private get headerFieldValueTypeMap() {
    return this.documentState.buildFieldValueTypeMap(this.headerConfig.sections);
  }

  private get headerFieldConfigMap() {
    return this.documentState.buildFieldConfigMap(this.headerConfig.sections);
  }

  private get defaultAttachments(): AttachmentsConfig {
    return this.headerConfig.attachmentsDefault ?? {
      headerFilesCount: 0,
      lineFilesCount: 0,
      canUpload: true,
      primaryActionLabel: 'Add header file',
      primaryActionKey: 'dialog:attachments',
    };
  }

  private openDocumentPopup(row: unknown, lineRows: unknown[]): void {
    const documentWindowConfig = this.buildDocumentWindowConfig(row, lineRows);
    this.activeDocumentWindowConfig = documentWindowConfig;
    this.refreshEntryPolicy();
    this.activeLineRow = undefined;
    this.selectedLineIndexes = [];

    if (this.documentOnly || this.isInlineEntryPage) {
      this.ensureTrailingEmptyRows();
      return;
    }
    this.popupStack.open({
      id: this.entryPopupId,
      title: this.getDocumentTitle(row),
      mode: 'page',
      size: 'full',
      allowNested: true,
      closeOnBackdrop: !this.isSetupPage,
      data: {
        documentWindowConfig,
      },
    });

    this.ensureTrailingEmptyRows();
  }

  private handleEntryInteractionAction(actionKey: string, payload: unknown): void {
    if (actionKey === 'header:dropdown-opened') {
      this.handleHeaderDropdownOpened(payload);
      return;
    }

    if (actionKey === 'line:dropdown-opened') {
      this.handleLineDropdownOpened(payload);
    }
  }

  private handleHeaderDropdownOpened(payload: unknown): void {
    if (!this.isRecord(payload)) {
      return;
    }

    const fieldKey = this.toText(payload['fieldKey']).trim();
    if (!fieldKey.length) {
      return;
    }

    this.loadHeaderDropdownOptionsForField(fieldKey);
  }

  private handleLineDropdownOpened(payload: unknown): void {
    if (!this.isRecord(payload) || !this.lineConfig) {
      return;
    }

    const columnPayload = payload['column'];
    if (!this.isRecord(columnPayload)) {
      return;
    }

    const rowPayload = payload['row'];
    const row = this.isRecord(rowPayload) ? rowPayload : undefined;
    const field = this.toText(columnPayload['field'] ?? columnPayload['id']).trim();
    if (!field.length) {
      return;
    }

    this.loadLineDropdownOptionsForField(field, row);
  }

  private loadHeaderDropdownOptionsForField(fieldKey: string): void {
    const fieldConfig = this.findHeaderFieldByKey(fieldKey);
    if (!fieldConfig || fieldConfig.type !== 'dropdown') {
      return;
    }

    const optionsKey = fieldConfig.optionsDataKey?.trim() || `__options_${fieldConfig.key}`;
    if (!optionsKey.length || this.loadingHeaderDropdownKeys.has(optionsKey) || this.loadedHeaderDropdownKeys.has(optionsKey)) {
      return;
    }

    const staticOptions = fieldConfig.options ?? [];
    if (staticOptions.length) {
      this.headerDropdownRecords[optionsKey] = staticOptions.map((option) => ({
        value: option.value,
        label: option.label,
      }));
      this.loadedHeaderDropdownKeys.add(optionsKey);
      this.applyHeaderDropdownOptionsToActiveEntry();
      return;
    }

    const endpoints = this.resolveApiEndpoints(fieldConfig.api ?? fieldConfig.optionsEndpoints);
    if (fieldConfig.optionsSkipWhenSuperAdmin && this.sessionService.SuperAdmin) {
      this.headerDropdownRecords[optionsKey] = [];
      this.loadedHeaderDropdownKeys.add(optionsKey);
      this.applyHeaderDropdownOptionsToActiveEntry();
      return;
    }

    if (!endpoints.length) {
      this.headerDropdownRecords[optionsKey] = [];
      this.loadedHeaderDropdownKeys.add(optionsKey);
      this.applyHeaderDropdownOptionsToActiveEntry();
      return;
    }

    this.loadingHeaderDropdownKeys.add(optionsKey);
    this.subscriptions.add(
      this.masterData.loadFirstAvailableList(endpoints)
        .pipe(catchError(() => of([])))
        .subscribe((records) => {
          this.loadingHeaderDropdownKeys.delete(optionsKey);
          this.loadedHeaderDropdownKeys.add(optionsKey);
          this.headerDropdownRecords[optionsKey] = this.toRecordList(records);
          this.applyHeaderDropdownOptionsToActiveEntry();
        }),
    );
  }

  private applyHeaderDropdownOptionsToActiveEntry(): void {
    const documentWindowConfig = this.activeDocumentWindowConfig;
    if (!documentWindowConfig) {
      return;
    }

    this.applyHeaderDropdownOptions(documentWindowConfig);
    this.changeDetector.detectChanges();
  }

  private loadLineDropdownOptionsForField(fieldName: string, row?: Record<string, unknown>): void {
    if (!this.lineConfig) {
      return;
    }

    const column = this.lineConfig.columns.find((item) => this.getColumnField(item) === fieldName);
    // Remote lookups own their selected-record hydration and paged choices.
    if (!column || column.lookup || (column.cellType !== 'dropdown' && column.cellType !== 'select')) {
      return;
    }

    const optionsKey = this.getLineColumnOptionsDataKey(fieldName);
    if (!optionsKey.length || this.loadingLineOptionKeys.has(optionsKey) || this.loadedLineOptionKeys.has(optionsKey)) {
      return;
    }

    if ((column.options ?? []).length) {
      this.optionFieldMap[optionsKey] = (column.options ?? []).map((option) => ({
        label: option.label,
        value: this.toText(option.value),
      }));
      this.loadedLineOptionKeys.add(optionsKey);
      this.applyLineOptionsToActiveRows();
      return;
    }

    const endpoints = this.resolveApiEndpoints(column.api ?? column.optionsEndpoints);
    if (!endpoints.length) {
      this.optionFieldMap[optionsKey] = [];
      this.loadedLineOptionKeys.add(optionsKey);
      this.applyLineOptionsToActiveRows();
      return;
    }

    this.loadingLineOptionKeys.add(optionsKey);
    this.subscriptions.add(
      this.masterData.loadFirstAvailableList(endpoints)
        .pipe(catchError(() => of([])))
        .subscribe((records) => {
          this.loadingLineOptionKeys.delete(optionsKey);
          this.loadedLineOptionKeys.add(optionsKey);

          const valueFields = this.resolveConfiguredFields(column.valueField);
          const labelFields = this.resolveConfiguredFields(column.labelField);
          this.optionFieldMap[optionsKey] = this.masterData.toSelectOptions(records, valueFields, labelFields);

          this.applyLineOptionsToActiveRows(row);
        }),
    );
  }

  private applyLineOptionsToActiveRows(row?: Record<string, unknown>): void {
    const currentConfig = this.activeDocumentWindowConfig;
    if (!currentConfig?.lineRows) {
      return;
    }

    if (row) {
      this.applyLineOptions([row]);
    } else {
      this.applyLineOptions(currentConfig.lineRows);
    }

    this.changeDetector.detectChanges();
  }

  private findHeaderFieldByKey(fieldKey: string) {
    for (const section of this.headerConfig.sections) {
      for (const field of section.fields) {
        if (field.key === fieldKey) {
          return field;
        }
      }
    }

    return undefined;
  }

  private openNewPreview(): void {
    this.startPopupLoading(`Preparing ${this.documentLabel.toLowerCase()}...`);
    this.pendingDraftCreateFromNew =
      this.shouldCreateDraftOnInput();
    this.draftCreateInProgress = false;
    this.autosaveDeferredUntilDraftCreate = false;
    this.openRecord(this.buildNewHeaderSeed(), true);
  }

  private loadFirstPage(forceRefresh = false): void {
    this.listLifecycle.loadFirstPage(this.listLifecycleContext, forceRefresh);
  }

  private loadPage(reset: boolean, forceRefresh = false): void {
    this.listLifecycle.loadPage(this.listLifecycleContext, reset, forceRefresh);
  }

  private runPendingFirstPageReload(): void {
    this.listLifecycle.runPendingFirstPageReload(this.listLifecycleContext);
  }

  private scheduleFilterReload(): void {
    this.listLifecycle.scheduleFilterReload(this.listLifecycleContext);
  }

  private clearFilterReloadTimer(): void {
    this.listLifecycle.clearFilterReloadTimer(this.listLifecycleContext);
  }

  private loadLineRows(header: Record<string, unknown>): Observable<unknown> {
    if (!this.lineConfig || !this.canModifyLines('read')) {
      return of([]);
    }

    const pageType = this.toText(this.listConfig.pageType).trim().toLowerCase();
    const resolved = this.resolveLineDataSourceForHeader(header);
    if (!resolved.lineContextReady) {
      return of([]);
    }

    const initialTop = this.resolveInitialLineFetchTop(resolved.dataSource);
    return from(this.documentHydration.loadLineRowsForHeader(
      this.lineConfig.dataSource,
      header,
      {
        timeoutMs: this.timeoutPolicy.hydrationTimeoutMs,
        fallbackDocumentNoField: this.listConfig.dataSource.documentNoField,
        defaultTop: initialTop,
        allowWithoutParentKey: pageType === 'worksheet',
        onRequest: () => this.startCardLineLoading(),
        reuseSnapshot: header['__fromReadSnapshot'] === true,
      },
    )).pipe(switchMap(rows => from(this.documentHydration.resolveLineLookups(rows, this.lineConfig!.columns, header, () => true, () => this.startCardLineLoading()))));
  }

  private expandLineRowsInBackground(
    header: Record<string, unknown>,
    initialCount: number,
  ): void {
    if (!this.lineConfig || !this.activeDocumentWindowConfig?.headerData) {
      return;
    }

    const resolved = this.resolveLineDataSourceForHeader(header);
    if (!resolved.lineContextReady) {
      return;
    }

    const initialTop = this.resolveInitialLineFetchTop(resolved.dataSource);
    const backgroundTop = this.resolveBackgroundLineFetchTop(resolved.dataSource);
    if (backgroundTop <= initialTop || initialCount < initialTop) {
      return;
    }

    const pageType = this.toText(this.listConfig.pageType).trim().toLowerCase();

    const baselineCount = this.activeDocumentWindowConfig.lineRows?.length ?? 0;
    this.subscriptions.add(
      from(this.documentHydration.loadLineRowsForHeader(
        resolved.dataSource,
        header,
        {
          timeoutMs: 10000,
          fallbackDocumentNoField: this.listConfig.dataSource.documentNoField,
          defaultTop: backgroundTop,
          allowWithoutParentKey: pageType === 'worksheet',
        },
      ))
        .pipe(catchError(() => of([])))
        .subscribe((response) => {
          const currentConfig = this.activeDocumentWindowConfig;
          if (!currentConfig?.headerData) {
            return;
          }

          // Skip background replacement if user already changed row count.
          if ((currentConfig.lineRows?.length ?? 0) !== baselineCount) {
            return;
          }

          const records = this.toRecords(response);
          if (records.length <= baselineCount) {
            return;
          }

          currentConfig.lineRows = this.buildLineRows(currentConfig.headerData, records);
          currentConfig.lineTotals = this.buildLineTotals(
            currentConfig.lineRows,
            currentConfig.headerData,
          );
          this.applyLineOptions(currentConfig.lineRows);
          this.changeDetector.detectChanges();
        }),
    );
  }

  private resolveInitialLineFetchTop(dataSource: DataSourceConfig): number {
    return Math.max(1, dataSource.pageSize ?? 20);
  }

  private resolveBackgroundLineFetchTop(dataSource: DataSourceConfig): number {
    return Math.max(this.resolveInitialLineFetchTop(dataSource), 200);
  }

  private buildDocumentWindowConfig(row?: unknown, lineSource?: unknown[]): DocumentWindowConfig {
    const record = this.isRecord(row) ? row : {};
    const headerData = this.buildHeaderData(record);
    const lineRows = this.lineConfig ? this.buildLineRows(headerData, lineSource ?? []) : [];
    const lineTotals = this.lineConfig ? this.buildLineTotals(lineRows, headerData) : this.emptyTotals();

    return {
      factBoxConfig: this.listConfig.factBox,
      factBoxDataSource: this.isWorksheetPage ? this.worksheetSource : this.listConfig.dataSource,
      pageLabel: this.documentLabel,
      title: this.getDocumentTitle(record),
      subtitle: this.isWorksheetPage ? recordIdentityText(resolvePageIdentity(this.initialRecord, this.listConfig)) : '',
      headerCommandBar: this.headerConfig.commandBar,
      lineCommandBar: this.lineConfig?.commandBar,
      lineCommandPolicy: {
        injectDefaultLineNew: false,
        injectDefaultLineDelete: false,
      },
      linePlacement: this.lineConfig?.placement,
      headerToolbarButtons: this.resolvePopupHeaderToolbarButtons(),
      lineToolbarButtons: this.isWorksheetPage ? [] : this.resolvePopupLineToolbarButtons(),
      detailToolbarButtons: this.resolvePopupDetailToolbarButtons(),
      headerSections: this.headerConfig.sections,
      headerData,
      lineColumns: this.lineConfig?.columns ?? [],
      lineRows,
      lineTotals,
      footerSections: this.lineConfig?.footerSections,
      attachments: { ...this.defaultAttachments },
    };
  }

  private resolvePopupHeaderToolbarButtons(): CommandConfig[] {
    if (this.isWorksheetPage) {
      const productivity = this.resolvePopupLineToolbarButtons().filter(button=>['line-copy','line-paste','line-copy-rows'].includes(this.normalizeCommandAction(button.actionKey)));
      const commands = [...this.headerConfig.toolbarButtons, ...(this.listConfig.commands ?? []), ...(this.lineConfig?.toolbarButtons ?? []), ...productivity];
      return this.documentOnly ? this.commandAssembler.resolveHeaderToolbarButtons({dataSource: this.lineConfig?.dataSource ?? this.listConfig.dataSource, toolbarButtons: commands, pageId: this.permissionPageId}) : [];
    }
    return this.commandAssembler.resolveHeaderToolbarButtons({
      dataSource: this.listConfig.dataSource,
      toolbarButtons: this.headerConfig.toolbarButtons,
      pageId: this.listConfig.pageId || this.pageId,
    });
  }

  private canModifyPage(): boolean {
    const creating = !this.listConfig.dataSource.singleton && !this.hasPersistedIdentity(this.activeDocumentWindowConfig?.headerData);
    return !this.commandPermission.applyOperation({label: 'Edit', actionKey: 'edit'}, this.permissionPageId, creating ? 'create' : 'modify').disabled;
  }

  private canModifyLines(operation: 'create' | 'update' | 'read' = 'update'): boolean {
    const pageId = this.lineConfig?.permissionPageId;
    if (!pageId) return operation === 'read' || this.canModifyPage();
    if (operation !== 'read') return !this.commandPermission.applyOperation({label: 'Edit', actionKey: 'edit'}, pageId, operation === 'create' ? 'create' : 'modify').disabled;
    const grants = this.sessionService.Permissions.filter(value => this.isRecord(value) && (value['pageId'] === pageId || value['PageId'] === pageId));
    return grants.length ? grants.some(value => (value as Record<string, unknown>)['canRead'] === true) : this.sessionService.SuperAdmin;
  }

  private refreshEntryPolicy(): void {
    if (this.isWorksheetPage) {
      const entry = this.activeDocumentWindowConfig;
      if (!entry) return;
      entry.headerSections = [];
      const editable = this.canModifyLines() || this.canModifyLines('create');
      entry.lineColumns = this.lineConfig?.columns.map(column => ({ ...column, readonly: column.readonly || !editable })) ?? [];
      entry.headerToolbarButtons = this.resolvePopupHeaderToolbarButtons();
      entry.lineToolbarButtons = [];
      return;
    }
    const entry = this.activeDocumentWindowConfig;
    if (!entry) return;
    const persisted = this.hasPersistedIdentity(entry.headerData);
    const supported = persisted || this.listConfig.dataSource.singleton ? this.listConfig.dataSource.supportsUpdate !== false : this.listConfig.dataSource.supportsCreate !== false;
    const editable = supported && this.canModifyPage() && this.dataSource.canWrite(this.listConfig.dataSource, entry.headerData ?? {});
    entry.headerSections = this.headerConfig.sections.map(section => ({ ...section, fields: section.fields.map(field => ({ ...field, readonly: field.readonly || !editable || (!!field.readonlyAfterCreate && this.hasPersistedIdentity(entry.headerData)) })) }));
    const lineEditable = this.canModifyLines() && this.dataSource.canWrite(this.listConfig.dataSource, entry.headerData ?? {});
    entry.lineColumns = this.lineConfig?.columns.map(column => ({ ...column, readonly: column.readonly || !lineEditable })) ?? [];
    entry.headerToolbarButtons = this.resolvePopupHeaderToolbarButtons().map(button => ({ ...button,
      hidden: button.hidden || (this.listConfig.dataSource.singleton && (
        (this.normalizeCommandAction(button.actionKey) === 'new' && this.listConfig.dataSource.supportsCreate === false) ||
        (this.normalizeCommandAction(button.actionKey) === 'delete' && this.listConfig.dataSource.supportsDelete === false))),
      disabled: button.disabled || (['cmd:save', 'cmd:apply'].includes(button.actionKey) && !editable) ||
        (this.normalizeCommandAction(button.actionKey) === 'delete' && (!persisted || !this.dataSource.canWrite(this.listConfig.dataSource, entry.headerData ?? {}))) ||
        (!!button.apiAction && !persisted) ||
        (!!button.apiAction?.states && !button.apiAction.states.values.includes(entry.headerData?.[button.apiAction.states.field])),
    }));
    entry.lineToolbarButtons = this.resolvePopupLineToolbarButtons().map(button => ({ ...button,
      disabled: button.disabled || (this.normalizeCommandAction(button.actionKey) === 'line-copy-rows' ? false : this.normalizeCommandAction(button.actionKey) === 'line-delete'
        ? !this.dataSource.canWrite(this.listConfig.dataSource, entry.headerData ?? {}) : !lineEditable),
    }));
  }

  private async executeConfiguredAction(button: CommandConfig, listRecord?: Record<string, unknown>): Promise<void> {
    const action = button.apiAction;
    const header = listRecord ?? this.activeDocumentWindowConfig?.headerData;
    const source = this.listConfig.dataSource;
    if (!action || !header || button.hidden || button.disabled || this.popupLoading || this.hasPendingWrites || this.commandPermission.apply(button, this.permissionPageId).disabled) return;
    if (!this.hasValue(this.resolvePersistedRecordId(header, source))) {
      if (listRecord) this.error = 'Select one saved record before running this action.';
      return;
    }
    if (action.states && !action.states.values.includes(header[action.states.field])) {
      if (listRecord) this.error = 'This action is not available for the selected record state.';
      else this.setEntryStatus({tone: 'warning', title: 'Action unavailable', message: 'This action is not available for the current record state.'});
      this.changeDetector.detectChanges(); return;
    }
    if (!listRecord && this.dirty) {
      this.setEntryStatus({ tone: 'warning', title: 'Save changes', message: 'Save your changes before running this action.' });
      this.changeDetector.detectChanges();
      return;
    }
    const canContinue = this.dataSource.captureWriteScope();
    const input = action.inputFields?.length ? await this.confirmation.prompt(button.label, action.inputFields) : {};
    if (!input || !canContinue() || this.popupLoading || this.hasPendingWrites) return;
    this.startPopupLoading('Processing...');
    try {
      const record = await firstValueFrom(this.dataSource.execute(this.listConfig.dataSource, this.resolvePersistedRecordId(header, this.listConfig.dataSource), action.name, { ...action.payload, ...input }));
      if (!canContinue()) return;
      this.stopPopupLoading();
      if (listRecord) { this.error = undefined; this.loadFirstPage(true); }
      else {
        if (this.isRecord(record)) this.applyHydratedHeaderRecord(record);
        this.stageListSyncFromActiveHeader();
        this.refreshEntryPolicy();
      }
      this.setEntryStatus({ tone: 'success', title: 'Completed', message: `${button.label} completed.` });
    } catch (error) {
      this.stopPopupLoading();
      if (canContinue()) {
        if (listRecord) this.error = this.getErrorMessage(error);
        this.setEntryStatus({ tone: 'error', title: 'Action failed', message: this.getErrorMessage(error) });
      }
    } finally { this.stopPopupLoading(); }
    this.changeDetector.detectChanges();
  }

  private resolvePopupLineToolbarButtons(): CommandConfig[] {
    return this.commandAssembler.resolveLineToolbarButtons({
      lineConfig: this.lineConfig,
      pageId: this.lineConfig?.permissionPageId ?? this.listConfig.pageId ?? this.pageId,
    });
  }

  private resolvePopupDetailToolbarButtons(): CommandConfig[] | undefined {
    return this.commandAssembler.resolveDetailToolbarButtons({
      toolbarButtons: this.headerConfig.detailToolbarButtons,
      pageId: this.listConfig.pageId || this.pageId,
    });
  }

  private buildHeaderData(record: Record<string, unknown>): Record<string, unknown> {
    return this.documentConfigData.buildHeaderData(
      record,
      this.headerConfig.sections,
      this.headerDropdownRecords,
    );
  }

  private buildLineRows(
    headerData: Record<string, unknown>,
    lines: unknown[],
  ): Record<string, unknown>[] {
    if (!this.lineConfig) {
      return [];
    }

    const rows = this.documentConfigData.buildLineRows(
      this.lineConfig,
      headerData,
      lines,
      this.getLineMasterRegistry(),
      this.optionFieldMap,
    );
    if (this.lineConfig.dataSource.supportsCreate !== false && this.lineConfig.editable !== false && this.canModifyLines('create')) {
      for (const row of rows) if (!this.hasValue(this.resolvePersistedRecordId(row, this.lineConfig.dataSource)) && this.isLineRowMeaningfullyEmpty(row)) row['__entryPlaceholder'] = true;
      while (rows.length < 8 || !rows.some(row => row['__entryPlaceholder'])) {
        const row = this.documentConfigData.createEmptyLineRow(this.lineConfig, headerData, this.getLineMasterRegistry(), this.optionFieldMap);
        row['__entryPlaceholder'] = true; rows.push(row);
      }
    }
    return rows;
  }

  private buildLineTotals(
    lineRows: Record<string, unknown>[],
    headerData: Record<string, unknown>,
  ): LineTotalsConfig {
    if (!this.lineConfig) {
      return this.emptyTotals();
    }

    return this.documentState.calculateLineTotals(lineRows, headerData, this.lineConfig);
  }

  private emptyTotals(): LineTotalsConfig {
    return {
      subtotal: '0.00',
      sst: '0.00',
      total: '0.00',
      difference: '0.00',
    };
  }

  private loadLineMasterOptions(): Observable<{
    lineMasterRecordsByType: Record<string, Record<string, unknown>[]>;
    lineMasterOptionsByType: Record<string, SelectOption[]>;
    optionFieldMap: Record<string, SelectOption[]>;
  }> {
    if (!this.lineConfig) {
      return of({
        lineMasterRecordsByType: {},
        lineMasterOptionsByType: {},
        optionFieldMap: {},
      });
    }

    const lineTypeMasterEndpoints = this.getLineTypeMasterEndpoints();
    const columnEndpointSources = this.getLineColumnEndpointSources();

    return this.masterData
      .loadMasterLists({
        ...lineTypeMasterEndpoints,
        ...columnEndpointSources,
      })
      .pipe(
        map((masters) => {
          const masterRecords = masters as Record<string, Record<string, unknown>[]>;
          const lineMasterRecordsByType: Record<string, Record<string, unknown>[]> = {};
          const lineMasterOptionsByType: Record<string, SelectOption[]> = {};
          const optionFieldMap: Record<string, SelectOption[]> = {};

          for (const type of Object.keys(lineTypeMasterEndpoints)) {
            const records = masterRecords[type] ?? [];
            lineMasterRecordsByType[type] = records;
            lineMasterOptionsByType[type] = this.masterData.toSelectOptions(
              records,
              this.getLineMasterValueFields(),
              this.getLineMasterLabelFields(),
            );
          }

          for (const [optionsKey, records] of Object.entries(masterRecords)) {
            if (optionsKey in lineTypeMasterEndpoints) {
              continue;
            }

            const column = this.getLineColumnByOptionsKey(optionsKey);
            optionFieldMap[optionsKey] = this.masterData.toSelectOptions(
              records,
              this.resolveConfiguredFields(column?.valueField),
              this.resolveConfiguredFields(column?.labelField),
            );
          }

          return {
            lineMasterRecordsByType,
            lineMasterOptionsByType,
            optionFieldMap,
          };
        }),
        catchError(() =>
          of({
            lineMasterRecordsByType: {},
            lineMasterOptionsByType: {},
            optionFieldMap: {},
          }),
        ),
      );
  }

  private getLineColumnEndpointSources(): Record<string, string[]> {
    const sources: Record<string, string[]> = {};
    for (const column of this.lineConfig?.columns ?? []) {
      const endpoints = this.resolveApiEndpoints(column.api ?? column.optionsEndpoints);
      const field = this.getColumnField(column);
      if (!field || !endpoints.length || field === this.getLineTypeField()) {
        continue;
      }

      sources[this.getLineColumnOptionsDataKey(field)] = endpoints;
    }

    return sources;
  }

  private getLineTypeMasterEndpoints(): Record<string, string[]> {
    const typeColumn = this.lineConfig?.columns.find(
      (column) => this.getColumnField(column) === this.getLineTypeField(),
    );
    const result: Record<string, string[]> = {};

    for (const option of typeColumn?.options ?? []) {
      const type = this.toText(option.value);
      const endpoints = this.resolveApiEndpoints(option.api);
      if (type && endpoints.length) {
        result[type] = endpoints;
      }
    }

    return result;
  }

  private getLineMasterRegistry(): LineMasterRegistry {
    const typeField = this.getLineTypeField();
    const typeColumn = this.lineConfig?.columns.find(
      (column) => this.getColumnField(column) === typeField,
    );
    const typeOptions = typeColumn?.options ?? [];
    const byType: LineMasterRegistry['byType'] = {};

    for (const option of typeOptions) {
      const type = this.toText(option.value);
      if (!type) {
        continue;
      }

      byType[type] = {
        options: this.lineMasterOptionsByType[type] ?? [],
        records: this.lineMasterRecordsByType[type] ?? [],
      };
    }

    return {
      defaultType: this.toText(typeOptions[0]?.value) || ' ',
      emptyType: ' ',
      byType,
    };
  }

  private handleLineChanged(payload: unknown): void {
    if (this.deleting) return;
    if (!this.lineConfig) {
      return;
    }

    const change = this.documentState.resolveLineChange(payload);
    if (!change) {
      return;
    }

    this.dirty = true;
    const { row, field, value } = change;
    delete row['__entryPlaceholder'];
    this.ensureTrailingEmptyRows();
    this.trackUnsaved(row, [field, ...(change.calculatedFields ?? [])]);
    this.activeLineRow = row;
    if (this.isWorksheetPage) this.worksheetChangedRows.add(row);
    const typeField = this.getLineTypeField();
    const numberField = this.getLineNumberField();

    if (typeField && field === typeField && this.lineConfig.typeField) {
      // The grid already applied the configured dependent-field clears. Wait for
      // the required master selection, then persist type + ID + cleared values
      // in a single PATCH. Never reset server-owned line numbering or quantities.
      this.clearEntryStatus();
      this.recalculateActiveLineTotals();
      this.changeDetector.detectChanges();
      return;
    }

    if (!typeField || field !== typeField) {
      const fieldsToPersist = new Set<string>([field, ...(change.calculatedFields ?? [])]);
      if (numberField && field === numberField) {
        for (const fillField of this.getLineFillTargetFields(numberField)) {
          fieldsToPersist.add(fillField);
        }
      }

      this.clearEntryStatus();
      if (!this.usesManualSaveMode()) {
        this.saveLineFields(row, [...fieldsToPersist]);
      }
      return;
    }

    this.lineMasters.applyTypeChange(row, value, this.getLineMasterRegistry(), {
      clearFields: this.getLineFieldsByValueType('text').filter((fieldName) => fieldName !== typeField),
      zeroFields: this.getLineFieldsByValueType('number'),
      optionFieldMap: this.optionFieldMap,
      numberOptionFieldKey: numberField ? this.getLineColumnOptionsDataKey(numberField) : '',
    });
    this.clearEntryStatus();
    if (!this.usesManualSaveMode()) {
      this.saveLineFields(row, [typeField, ...(change.calculatedFields ?? [])]);
    }
    this.changeDetector.detectChanges();
  }

  private handleLineSelectionChanged(payload: unknown): void {
    if (!this.isRecord(payload)) {
      return;
    }

    const activeRow = payload['activeRow'];
    if (this.isRecord(activeRow)) {
      this.activeLineRow = activeRow;
    }

    this.selectedLineIndexes = this.lineCommands.planDeleteRequest({
      lineRows: this.activeDocumentWindowConfig?.lineRows ?? [],
      payload,
      selectedIndexes: this.selectedLineIndexes,
    }).selectedIndexes;
  }

  private handleHeaderChanged(payload: unknown): void {
    if (this.deleting) return;
    if (!this.isRecord(payload) || !this.activeDocumentWindowConfig?.headerData) {
      return;
    }

    const fieldKey = this.toText(payload['fieldKey']);
    const fieldConfig = this.headerFieldConfigMap[fieldKey];
    const validation = this.fieldValidation.validateField(fieldConfig, payload['value'], this.activeDocumentWindowConfig.headerData);
    if (!validation.valid) {
      const rolledBack = this.documentState.rollbackHeaderFieldChange(
        this.activeDocumentWindowConfig.headerData,
        payload,
        this.headerFieldValueTypeMap,
      );
      if (rolledBack) {
        this.changeDetector.detectChanges();
      }

      this.setEntryStatus({
        tone: 'error',
        title: 'Validation failed',
        message: fieldConfig?.messages?.validationFailed ?? validation.errors[0] ?? 'Invalid value.',
      });
      return;
    }

    const changed = this.documentState.applyHeaderFieldChange(
      this.activeDocumentWindowConfig.headerData,
      payload,
      this.headerFieldValueTypeMap,
    );
    if (changed) {
      this.dirty = true;
      this.trackUnsaved(this.activeDocumentWindowConfig.headerData, [fieldKey, ...Object.keys(this.isRecord(payload['updates']) ? payload['updates'] : {})]);
      this.clearEntryStatus();
      this.activeDocumentWindowConfig.title = this.getDocumentTitle(this.activeDocumentWindowConfig.headerData);
      this.activeDocumentWindowConfig.subtitle = '';
      const dependentLineChanges: Array<{row: Record<string,unknown>; fields: string[]}> = [];
      const changedHeaderFields = [fieldKey, ...Object.keys(this.isRecord(payload['updates']) ? payload['updates'] : {})];
      for (const row of this.activeDocumentWindowConfig.lineRows ?? []) {
        const dependencyChanges = clearDependentLookups(this.lineConfig?.columns ?? [], changedHeaderFields, row, 'header');
        const fields = Object.keys(dependencyChanges.updates);
        if (!fields.length) continue;
        this.trackUnsaved(row, fields);
        dependentLineChanges.push({row,fields});
      }
      this.triggerDraftCreateIfReady();
      if (!this.usesManualSaveMode()) {
        this.saveHeaderFields(payload, dependentLineChanges);
      }
      this.changeDetector.detectChanges();
    }
  }

  private saveHeaderFields(payload: Record<string, unknown>, dependentLines: Array<{row:Record<string,unknown>;fields:string[]}> = []): void {
    const headerData = this.activeDocumentWindowConfig?.headerData;
    if (!headerData) {
      return;
    }

    if (this.pendingDraftCreateFromNew || this.draftCreateInProgress || !this.hasPersistedIdentity(headerData)) {
      this.autosaveDeferredUntilDraftCreate = true;
      return;
    }

    const fieldKey = this.toText(payload['fieldKey']).trim();
    const headerId = this.resolvePersistedRecordId(headerData, this.listConfig.dataSource);
    if (!fieldKey.length || !this.hasValue(headerId)) {
      this.autosaveDeferredUntilDraftCreate = true;
      return;
    }

    const updatePayload: Record<string, unknown> = {
      [fieldKey]: headerData[fieldKey],
    };

    if (this.isRecord(payload['updates'])) {
      Object.assign(updatePayload, payload['updates']);
    }

    this.stripIdentityFields(updatePayload);
    if (!Object.keys(updatePayload).length) {
      return;
    }

    this.setEntryStatus({
      tone: 'info',
      title: 'Saving',
      message: 'Autosaving header...',
    });
    this.changeDetector.detectChanges();

    const savedEdits = this.beginAutosave(headerData, Object.keys(updatePayload));
    this.subscriptions.add(
      this.dataSource
        .updateRecord(this.listConfig.dataSource, headerId, updatePayload, headerData)
        .pipe(
          catchError((error: unknown) => {
            if (this.hasPendingWrites) this.unknownSaveOutcome ||= this.isUncertainSave(error);
            // Keep the user's edits available for correction or conflict reconciliation.
            this.setEntryStatus({
              tone: 'error',
              title: 'Save failed',
              message: this.getErrorMessage(error) || GENERIC_MESSAGES.saveFailedDefault,
            });
            this.changeDetector.detectChanges();
            return of(undefined);
          }),
        )
        .subscribe((updated) => {
          this.finishAutosave(headerData, savedEdits, this.isRecord(updated));
          if (!this.isRecord(updated) || !this.activeDocumentWindowConfig?.headerData) {
            return;
          }

          this.mergeAutosaveResponse(headerData, updated);
          for (const change of dependentLines) {
            const pending = change.fields.filter(field => this.unsavedFields.get(change.row)?.has(field));
            if (pending.length && this.activeDocumentWindowConfig.lineRows?.includes(change.row)) this.saveLineFields(change.row,pending);
          }
          this.stageListSyncFromActiveHeader();
          this.setEntryStatus({
            tone: 'success',
            title: 'Saved',
            message: 'Header autosaved.',
          });
          this.changeDetector.detectChanges();
        }),
    );
  }

  private saveLineFields(row: Record<string, unknown>, fields: string[], options: CreateLineOptions = {}): void {
    if (!this.lineConfig || !this.activeDocumentWindowConfig?.headerData) {
      options.onSettled?.(false); return;
    }

    if (!this.isWorksheetPage && (
      this.pendingDraftCreateFromNew ||
      this.draftCreateInProgress ||
      !this.hasPersistedIdentity(this.activeDocumentWindowConfig.headerData)
    )) {
      this.autosaveDeferredUntilDraftCreate = true;
      options.onSettled?.(false); return;
    }

    if (this.isWorksheetPage && this.lineCreateInProgress.has(row)) {
      this.deferLineSaveFields(row, fields); options.onSettled?.(false); return;
    }
    if (this.isWorksheetPage) {
      if (!this.worksheetAllowed(row)) { this.setEntryStatus({tone: 'error', title: 'Cannot save', message: 'You do not have permission to change this row.'}); options.onSettled?.(false); return; }
      const errors = (this.lineConfig.fields ?? []).flatMap(field => this.fieldValidation.validateField(field, row[field.key], row).errors);
      if (errors.length) { this.setEntryStatus({tone: 'error', title: 'Complete row', message: errors.join('. ')}); options.onSettled?.(false); return; }
    }
    const lineErrors = this.validateLineRow(row);
    if (lineErrors.length) {
      this.setEntryStatus({ tone: 'error', title: 'Check line fields', message: lineErrors.join('. ') });
      this.changeDetector.detectChanges();
      options.onSettled?.(false); return;
    }
    const pendingTypeEdits = this.lineConfig.typeField && !this.isWorksheetPage
      ? [...(this.unsavedFields.get(row) ?? [])]
      : [];
    const writeable = this.lineConfig.typeField ? new Set(this.lineConfig.dataSource.updateFields ?? []) : null;
    const uniqueFields = [...new Set([...fields, ...pendingTypeEdits].map((field) => field.trim()).filter(field => field && (!writeable || writeable.has(field))))];
    if (!uniqueFields.length) {
      options.onSettled?.(false); return;
    }

    if (this.lineCreateInProgress.has(row)) {
      this.deferLineSaveFields(row, uniqueFields);
      options.onSettled?.(false); return;
    }

    this.applyParentFieldsToLine(row);
    const resolved = this.resolveLineDataSourceForHeader(this.activeDocumentWindowConfig.headerData);
    if (!resolved.lineContextReady) {
      this.setEntryStatus({
        tone: 'error',
        title: 'Header not ready for line save',
        message: resolved.reason ?? 'Line datasource is not ready.',
      });
      this.changeDetector.detectChanges();
      options.onSettled?.(false); return;
    }

    const rowId = this.resolvePersistedRecordId(row, resolved.dataSource);
    if (!this.hasValue(rowId)) {
      this.createLine(row, resolved.dataSource, options);
      return;
    }

    const payload = this.documentConfigData.buildLineUpdatePayload(row, this.isWorksheetPage ? this.lineConfig.dataSource.updateFields ?? uniqueFields : uniqueFields, this.lineConfig);
    if (this.isWorksheetPage) { this.worksheetPending++; this.lineCreateInProgress.add(row); }
    this.setEntryStatus({
      tone: 'info',
      title: 'Saving',
      message: 'Autosaving line...',
    });
    this.changeDetector.detectChanges();

    const savedEdits = this.beginAutosave(row, Object.keys(payload));
    this.subscriptions.add(
      this.dataSource
        .updateRecord(resolved.dataSource, rowId, payload, row)
        .pipe(
          catchError((error: unknown) => {
            if (this.hasPendingWrites) this.unknownSaveOutcome ||= this.isUncertainSave(error);
            this.setEntryStatus({
              tone: 'error',
              title: 'Save failed',
              message: this.getErrorMessage(error) || GENERIC_MESSAGES.saveFailedDefault,
            });
            this.changeDetector.detectChanges();
            return of(undefined);
          }),
        )
        .subscribe((updated) => {
          this.finishAutosave(row, savedEdits, !!updated);
          if (this.isWorksheetPage) this.lineCreateInProgress.delete(row);
          this.worksheetSaveFinished(row, updated);
          if (!updated) return;
          const updatedRecord = this.toCreatedRecord(updated);
          if (updatedRecord) {
            const deferred = this.isWorksheetPage ? Object.fromEntries([...(this.deferredLineSaveFields.get(row) ?? [])].map(field => [field, row[field]])) : {};
            this.mergeAutosaveResponse(row, updatedRecord);
            Object.assign(row, deferred);
          }

          if (this.isWorksheetPage) {
            const deferred = this.takeDeferredLineSaveFields(row);
            if (deferred.length) { this.saveLineFields(row, deferred); return; }
          }
          this.recalculateActiveLineTotals();
          this.setEntryStatus({
            tone: 'success',
            title: 'Saved',
            message: 'Line autosaved.',
          });
          this.changeDetector.detectChanges();
        }),
    );
  }

  private createLine(
    row: Record<string, unknown>,
    lineDataSource: DataSourceConfig,
    options: CreateLineOptions = {},
  ): void {
    if (!this.lineConfig) {
      options.onSettled?.(false); return;
    }

    if (lineDataSource.supportsCreate === false) {
      this.setEntryStatus({
        tone: 'error',
        title: 'Save failed',
        message: 'Create is not supported for this page.',
      });
      this.changeDetector.detectChanges();
      options.onSettled?.(false); return;
    }

    if (this.lineCreateInProgress.has(row)) {
      options.onSettled?.(false); return;
    }

    const payload = this.documentConfigData.buildLineCreatePayload(row, this.lineConfig);
    if (!payload) {
      this.setEntryStatus({
        tone: 'error',
        title: 'Line save failed',
        message: 'Required line fields are missing. Complete required values before saving line.',
      });
      this.changeDetector.detectChanges();
      options.onSettled?.(false); return;
    }

    const savedEdits = this.beginAutosave(row);
    this.lineCreateInProgress.add(row);
    if (this.isWorksheetPage) this.worksheetPending++;
    this.setEntryStatus({
      tone: 'info',
      title: 'Saving',
      message: 'Autosaving line...',
    });
    this.changeDetector.detectChanges();

    this.subscriptions.add(
      this.dataSource
        .create(lineDataSource, payload)
        .pipe(
          catchError((error: unknown) => {
            if (this.hasPendingWrites) this.unknownSaveOutcome ||= this.isUncertainSave(error);
            this.setEntryStatus({
              tone: 'error',
              title: 'Save failed',
              message: this.getErrorMessage(error) || GENERIC_MESSAGES.saveFailedDefault,
            });
            this.changeDetector.detectChanges();
            return of(undefined);
          }),
        )
        .subscribe((created) => {
          this.finishAutosave(row, savedEdits, !!created);
          this.lineCreateInProgress.delete(row);
          this.worksheetSaveFinished(row, created);

          if (!created) { options.onSettled?.(false); return; }
          const createdRecord = this.toCreatedRecord(created);
          if (createdRecord) {
            const deferred = this.isWorksheetPage ? Object.fromEntries([...(this.deferredLineSaveFields.get(row) ?? [])].map(field => [field, row[field]])) : {};
            Object.assign(row, createdRecord, deferred);
          }

          const deferredFields = this.takeDeferredLineSaveFields(row);
          if (deferredFields.length) {
            this.saveLineFields(row, deferredFields);
          }

          if (options.ensureTrailingEmpty !== false) {
            this.ensureTrailingEmptyRows();
          }

          this.recalculateActiveLineTotals();
          this.setEntryStatus({
            tone: 'success',
            title: 'Saved',
            message: 'Line autosaved.',
          });
          this.changeDetector.detectChanges();
          options.onSettled?.(true);
        }),
    );
  }

  private handleAutosave(payload: unknown): void {
    if (this.isWorksheetPage) return; // Row changes already use the shared line persistence path.
    if (this.usesManualSaveMode()) {
      return;
    }

    if (this.isRecord(payload) && 'fieldKey' in payload) {
      return;
    }

    this.queueLocalAutosave();
  }


  private triggerDraftCreateIfReady(): void {
    const headerData = this.activeDocumentWindowConfig?.headerData;
    if (!headerData || !this.pendingDraftCreateFromNew || this.draftCreateInProgress) {
      return;
    }

    if (this.hasPersistedIdentity(headerData)) {
      this.pendingDraftCreateFromNew = false;
      return;
    }

    if (!this.canCreateDraft(headerData)) {
      return;
    }

    this.startDraftCreate(headerData);
  }

  private startDraftCreate(headerData: Record<string, unknown>): void {
    const savedEdits = this.beginAutosave(headerData);
    this.draftCreateInProgress = true;
    this.startPopupLoading(`Creating ${this.documentLabel.toLowerCase()} draft...`);

    this.subscriptions.add(
      this.createDraftRecord(headerData).subscribe({
        next: (createdRecord) => {
          this.finishAutosave(headerData, savedEdits, !!createdRecord);
          this.draftCreateInProgress = false;
          this.stopPopupLoading();

          if (!createdRecord || !this.activeDocumentWindowConfig?.headerData) {
            this.setEntryStatus({
              tone: 'error',
              title: GENERIC_MESSAGES.createFailedTitle,
              message: GENERIC_MESSAGES.createFailedMessage,
            });
            this.changeDetector.detectChanges();
            return;
          }

          const localEdits = { ...this.activeDocumentWindowConfig.headerData };
          const createdHeader = this.buildHeaderData(createdRecord);
          Object.assign(this.activeDocumentWindowConfig.headerData, createdHeader);
          this.restoreEditableLocalEdits(localEdits, this.activeDocumentWindowConfig.headerData);
          this.pendingListSyncRecord = this.buildListSyncRecord(createdRecord);
          this.pendingDraftCreateFromNew = false;
          this.refreshEntryPolicy();

          if (this.autosaveDeferredUntilDraftCreate) {
            this.autosaveDeferredUntilDraftCreate = false;
            this.queueLocalAutosave();
          }

          this.changeDetector.detectChanges();
        },
        error: () => {
          this.finishAutosave(headerData, savedEdits, false);
          this.draftCreateInProgress = false;
          this.stopPopupLoading();
          this.setEntryStatus({
            tone: 'error',
            title: GENERIC_MESSAGES.createFailedTitle,
            message: GENERIC_MESSAGES.createFailedMessage,
          });
          this.changeDetector.detectChanges();
        },
      }),
    );
  }

  private shouldCreateDraftOnInput(): boolean {
    if (this.listConfig.dataSource.singleton || this.listConfig.dataSource.supportsCreate === false || this.usesManualSaveMode()) return false;
    return this.listConfig.autoSave === true || (!!this.listConfig.dataSource.autoGenerateNumber && !!this.listConfig.dataSource.lazyCreateOnFirstInput);
  }

  private canCreateDraft(headerData: Record<string, unknown>): boolean {
    for (const section of this.headerConfig.sections) {
      for (const field of section.fields) {
        if (!fieldIsRequired(field, headerData) || field.readonly || field.disabled) {
          continue;
        }

        if (!this.fieldValidation.validateField(field, headerData[field.key], headerData).valid) {
          return false;
        }
      }
    }

    return true;
  }

  private queueLocalAutosave(): void {
    if (this.deleting) return;
    if (this.isWorksheetPage) { this.saveWorksheet(); return; }
    if (this.usesManualSaveMode() || this.listConfig.dataSource.singleton) {
      void this.saveEntry();
      return;
    }
    const headerData = this.activeDocumentWindowConfig?.headerData;
    if (!headerData) {
      return;
    }

    if (!this.dirty && this.hasPersistedIdentity(headerData)) return;
    const headerId = this.resolvePersistedRecordId(headerData, this.listConfig.dataSource);
    if (this.pendingDraftCreateFromNew || this.draftCreateInProgress || !this.hasValue(headerId)) {
      this.autosaveDeferredUntilDraftCreate = true;
      return;
    }

    const previousSnapshot = { ...headerData };
    this.setEntryStatus({
      tone: 'info',
      title: 'Saving',
      message: this.usesManualSaveMode() ? 'Saving changes...' : 'Autosaving changes...',
    });
    this.documentState.scheduleHeaderAutosave(this.pageId, headerData, {
      dataSourceConfig: this.listConfig.dataSource,
      headerSections: this.headerConfig.sections,
      lineRows: this.activeDocumentWindowConfig?.lineRows,
      lineDataSourceConfig: this.lineConfig?.dataSource,
      meta: {
        page: this.pageId,
      },
      onFailed: (result) => {
        Object.assign(this.activeDocumentWindowConfig?.headerData ?? {}, previousSnapshot);
        this.setEntryStatus({
          tone: 'error',
          title: 'Save failed',
          message: result.errorMessage || GENERIC_MESSAGES.saveFailedDefault,
        });
        this.changeDetector.detectChanges();
      },
      onCompleted: () => {
        this.stageListSyncFromActiveHeader();
        this.setEntryStatus({
          tone: 'success',
          title: GENERIC_MESSAGES.saveSuccessTitle,
          message: GENERIC_MESSAGES.saveSuccessMessage,
        });
        this.changeDetector.detectChanges();
      },
    });
  }

  private usesManualSaveMode(): boolean {
    if (this.listConfig.autoSave !== undefined) return !this.listConfig.autoSave;
    // Preserve legacy pages until their save policy is explicitly migrated.
    return (this.isWorksheetPage && (this.hasManualSaveCommand(this.listConfig.commands) || this.hasManualSaveCommand(this.lineConfig?.toolbarButtons)))
      || this.hasManualSaveCommand(this.activeDocumentWindowConfig?.headerToolbarButtons)
      || this.hasManualSaveCommand(this.headerConfig.toolbarButtons);
  }

  private hasManualSaveCommand(buttons: CommandConfig[] | undefined): boolean {
    return (buttons ?? []).some((button) => {
      const actionKey = this.toText(button.actionKey).trim().toLowerCase();
      return actionKey === 'save' || actionKey === 'apply' || actionKey === 'cmd:save' || actionKey === 'cmd:apply';
    });
  }

  private handleEntryCommand(command: string, payload: unknown): void {
    if (this.deleting) return;
    if (this.isWorksheetPage) {
      if (command === 'new') { this.appendNewLine('append'); return; }
      if (command === 'delete') { void this.deleteLine(payload); return; }
      if (command === 'refresh' || command === 'retry-hydrate') { void this.refreshWorksheet(); return; }
    }
    if (command === 'retry-hydrate') { void this.refreshEntrySafely(); return; }
    if (this.tryOpenEntryRunModal(command, payload)) {
      return;
    }

    if (command === 'save' || command === 'apply') {
      this.queueLocalAutosave();
      return;
    }

    if (command === 'close') {
      if (this.documentOnly) { void this.requestClose(); return; }
      this.popupStack.close(this.entryPopupId);
      return;
    }

    if (command === 'new') {
      void this.openNewEntrySafely();
      return;
    }

    if (command === 'delete') {
      void this.deleteActiveHeaderFromPopup();
      return;
    }

    if (command === 'refresh') {
      void this.refreshEntrySafely();
      return;
    }

    if (command === 'line-copy' || command === 'line-paste') { this.copySelectedLines(payload, command === 'line-paste'); return; }

    if (command === 'line-delete') {
      void this.deleteLine(payload);
      return;
    }

    if (command === 'line-refresh') {
      void this.refreshLinesSafely();
      return;
    }

    const button = this.findEntryCommandButton(command);
    if (button?.apiAction) {
      void this.executeConfiguredAction(button);
      return;
    }
    this.emitBusinessCommand(command, payload);
  }

  private async refreshWorksheet(): Promise<void> {
    this.dataSource.invalidateReadCache();
    if (this.worksheetPending) return;
    if (this.dirtyWorksheet && !await this.confirmation.confirm({title: 'Unsaved changes', message: 'Discard unsaved row changes and refresh?'})) return;
    this.worksheetChangedRows.clear(); this.dirty = false;
    void this.loadWorksheet(true, true);
  }
  private async openNewEntrySafely(): Promise<void> {
    if ((this.dirty || this.invalidHeaderDrafts.size) && !await this.confirmation.confirm({ title: 'Unsaved changes', message: 'Discard unsaved changes and start a new record?' })) return;
    this.dirty = false;
    this.openNewPreview();
  }

  private async refreshEntrySafely(): Promise<void> {
    if (this.dirty && !await this.confirmation.confirm({ title: 'Unsaved changes', message: 'Discard unsaved changes and reload this record?' })) return;
    this.dirty = false;
    this.refreshActiveEntry();
  }

  private async refreshLinesSafely(): Promise<void> {
    if (this.dirty && !await this.confirmation.confirm({ title: 'Unsaved changes', message: 'Discard unsaved line edits and reload lines?' })) return;
    this.refreshActiveLines();
  }

  private refreshActiveEntry(): void {
    this.dataSource.invalidateReadCache();
    if (this.listConfig.dataSource.singleton) { this.openEntry(); return; }
    const headerData = this.activeDocumentWindowConfig?.headerData;
    if (!this.isRecord(headerData)) {
      return;
    }

    if (!this.hasPersistedIdentity(headerData)) {
      this.refreshActiveLines();
      return;
    }

    this.startCardLineLoading();
    this.subscriptions.add(
      this.loadHeaderRecord(headerData)
        .subscribe({
          next: (headerRecord) => {
            this.applyHydratedHeaderRecord(headerRecord);
            this.hydrateOpenedDocumentLines(headerRecord);
          },
          error: (error: unknown) => {
            this.finishCardLineLoading(true, error, 'Document');
          },
        }),
    );
  }

  private refreshActiveLines(): void {
    this.dataSource.invalidateReadCache();
    if (!this.lineConfig) {
      return;
    }

    const headerData = this.activeDocumentWindowConfig?.headerData;
    if (!this.isRecord(headerData)) {
      return;
    }

    this.startCardLineLoading();
    this.subscriptions.add(
      this.loadLineRows(headerData)
        .subscribe({
          next: (response) => {
            const currentConfig = this.activeDocumentWindowConfig;
            if (!currentConfig?.headerData) {
              this.finishCardLineLoading(true);
              return;
            }

            const records = this.toRecords(response);
            currentConfig.lineRows = this.buildLineRows(currentConfig.headerData, records);
            currentConfig.lineTotals = this.buildLineTotals(currentConfig.lineRows, currentConfig.headerData);
            this.applyLineOptions(currentConfig.lineRows);
            this.clearEntryStatus();
            this.changeDetector.detectChanges();
            this.finishCardLineLoading();
          },
          error: (error: unknown) => {
            this.finishCardLineLoading(true, error);
          },
        }),
    );
  }

  private handleCustomListCommand(actionKey: string, payload: unknown): void {
    const selectionError = this.validateCustomListCommandSelection(this.findListCommand(actionKey));
    if (selectionError) {
      this.error = selectionError;
      this.changeDetector.detectChanges();
      return;
    }

    this.error = undefined;
    this.changeDetector.detectChanges();
    const button = this.findEntryCommandButton(actionKey);
    if (button?.runModalPageId || button?.apiAction) {
      const record = this.checkedRowKeys.size ? this.rows.find(row => this.checkedRowKeys.has(this.getRowKey(row))) : this.selectedRow;
      const permitted = this.commandPermission.apply(button, this.permissionPageId);
      if (button.hidden || button.disabled || permitted.disabled) return;
      if (this.checkedRowKeys.size > 1 || !this.isRecord(record) || !this.hasPersistedIdentity(record)) {
        this.error = 'Select one saved record before running this command.';
        this.changeDetector.detectChanges(); return;
      }
      if (button.apiAction && !button.runModalPageId) void this.executeConfiguredAction(button, record);
      else this.tryOpenEntryRunModal(actionKey, payload, record);
      return;
    }
    this.emitBusinessCommand(actionKey, payload);
  }

  private tryOpenEntryRunModal(command: string, payload: unknown, listRecord?: Record<string, unknown>): boolean {
    const button = this.findEntryCommandButton(command);
    if (this.isWorksheetPage && button?.requireSelection && (!this.activeLineRow || !this.hasValue(this.resolvePersistedRecordId(this.activeLineRow, this.listConfig.dataSource)) || this.dirtyWorksheet)) {
      this.setEntryStatus({tone: 'error', title: 'Select a saved row', message: 'Complete your changes and select a saved record first.'}); return true;
    }
    const pageId = this.toText(button?.runModalPageId).trim();
    if (!pageId.length) {
      return false;
    }

    const payloadRecord = this.isRecord(payload) ? payload : {};
    const request = this.commandRoutingResolver.buildEntryRunModalRequest({
      pageId,
      target: button?.runModalTarget ?? button?.runModalView,
      headerData: listRecord ?? this.activeDocumentWindowConfig?.headerData ?? {},
      lineRows: listRecord ? [] : this.activeDocumentWindowConfig?.lineRows ?? [],
      payload: payloadRecord,
      activeLine: listRecord ? undefined : this.resolveRunModalActiveLine(payloadRecord),
      recordMapping: button?.runModalRecord,
    });

    void this.runModal
      .open(request)
      .then((opened) => {
        if (!opened) {
          const reason = this.runModal.getLastOpenFailureReason();
          const detail = reason ? ` (${reason})` : '';
          void this.confirmation.message(`Unable to open run modal page${detail}.`);
        }
      });

    return true;
  }

  private findEntryCommandButton(command: string): CommandConfig | undefined {
    return this.commandRoutingResolver.findEntryCommandButton({
      command,
      headerToolbarButtons: this.isWorksheetPage ? [...(this.listConfig.commands ?? []), ...(this.lineConfig?.toolbarButtons ?? []), ...this.headerConfig.toolbarButtons] : this.activeDocumentWindowConfig?.headerToolbarButtons ?? [...(this.listConfig.commands ?? []), ...this.headerConfig.toolbarButtons],
      lineToolbarButtons: this.activeDocumentWindowConfig?.lineToolbarButtons,
      detailToolbarButtons: this.activeDocumentWindowConfig?.detailToolbarButtons,
      factBoxButtons: [
        ...(this.listConfig.factBox?.buttons ?? []),
        ...(this.listConfig.factBox?.panels ?? []).flatMap(panel => panel.enabled === false || panel.kind && this.listConfig.factBox?.[panel.kind] === false ? [] : panel.buttons ?? []),
        ...(this.listConfig.factBox?.sections ?? []).flatMap(section => section.buttons ?? []),
        ...(this.activeDocumentWindowConfig?.factBoxSections ?? []).flatMap(section => section.buttons ?? []),
      ],
    });
  }

  private normalizeCommandAction(actionKey: unknown): string {
    return this.commandRoutingResolver.normalizeCommandAction({ actionKey });
  }

  private resolveRunModalActiveLine(payload: Record<string, unknown>): Record<string, unknown> | undefined {
    return this.commandRoutingResolver.resolveRunModalActiveLine({
      payload,
      lineRows: this.activeDocumentWindowConfig?.lineRows ?? [],
      selectedLineIndexes: this.selectedLineIndexes,
      activeLineRow: this.activeLineRow,
      headerData: this.activeDocumentWindowConfig?.headerData,
      isRecord: (value): value is Record<string, unknown> => this.isRecord(value),
    });
  }

  private emitBusinessCommand(actionKey: string, payload: unknown): void {
    this.businessCommand.emit({
      actionKey,
      payload,
      context: {
        pageId: this.pageId,
        selectedRow: this.selectedRow,
        checkedRowKeys: [...this.checkedRowKeys],
        headerData: this.activeDocumentWindowConfig?.headerData,
        lineRows: this.activeDocumentWindowConfig?.lineRows,
      },
    });
  }

  private findListCommand(actionKey: string): CommandConfig | undefined {
    return this.commandRoutingResolver.findListCommand({
      actionKey,
      commands: this.listConfig.commands,
    });
  }

  private validateCustomListCommandSelection(command?: CommandConfig): string | undefined {
    return this.commandRoutingResolver.validateCustomListCommandSelection({
      command,
      policy: this.listConfig.commandSelectionPolicy,
      selectedCount: this.getSelectedListRecordCount(),
    });
  }

  private resolveCustomListCommandSelectionMode(
    command?: CommandConfig,
  ): ListCommandSelectionMode {
    return this.commandRoutingResolver.resolveCustomListCommandSelectionMode({
      command,
      policy: this.listConfig.commandSelectionPolicy,
    });
  }

  private getSelectedListRecordCount(): number {
    return this.commandRoutingResolver.getSelectedListRecordCount({
      checkedRowKeys: this.checkedRowKeys,
      selectedRow: this.selectedRow,
      isRecord: (value): value is Record<string, unknown> => this.isRecord(value),
    });
  }

  private deleteAllowed(source: DataSourceConfig, records: Record<string, unknown>[], permissionPageId = this.permissionPageId): boolean {
    if (source.supportsDelete === false || this.hasPendingWrites || this.popupLoading) return false;
    if (this.commandPermission.applyOperation({label: 'Delete', actionKey: 'delete'}, permissionPageId, source.permissions?.delete ?? 'delete').disabled) return false;
    return records.every(row => this.dataSource.canWrite(source, row));
  }

  private setDeleting(value: boolean): void {
    this.deleting = value;
    if (this.activeDocumentWindowConfig) this.activeDocumentWindowConfig.interactionLocked = value;
    this.changeDetector.detectChanges();
  }

  private showDeleteFailures(failures: Array<{error: unknown}>, deleted: number): void {
    if (!failures.length) return;
    this.error = (deleted ? deleted + ' deleted; ' : '') + failures.length + ' failed. ' + (this.getErrorMessage(failures[0].error) || GENERIC_MESSAGES.deleteFailedMessage);
    this.setEntryStatus({tone: 'error', title: GENERIC_MESSAGES.deleteFailedTitle, message: this.error});
  }

  private async deleteSelectedRows(): Promise<void> {
    const targets = this.resolveDeleteTargets();
    if (!targets.length || !this.deleteAllowed(this.listConfig.dataSource, targets.map(target => target.row))) return;
    const canContinue = this.dataSource.captureWriteScope();
    this.setDeleting(true);
    try {
      if (!await this.confirmation.confirmIntent({intent: 'delete', count: targets.length, entityLabel: this.documentLabel})) return;
      const result = await this.deletes.execute({
        targets, canContinue, resolveId: target => target.id,
        deleteById: (id, target) => this.dataSource.delete(this.listConfig.dataSource, id, target.rowVersion),
      });
      this.removeRowsFromList(result.deleted.map(target => target.key));
      this.error = undefined;
      this.showDeleteFailures(result.failures, result.deleted.length);
    } finally { this.setDeleting(false); }
  }

  private async deleteActiveHeaderFromPopup(): Promise<void> {
    const header = this.activeDocumentWindowConfig?.headerData;
    if (!header || !this.deleteAllowed(this.listConfig.dataSource, [header])) return;
    const id = this.resolvePersistedRecordId(header, this.listConfig.dataSource);
    if (!this.hasValue(id)) return;
    const canContinue = this.dataSource.captureWriteScope();
    this.setDeleting(true);
    try {
      if (!await this.confirmation.confirmIntent({intent: 'delete', count: 1, entityLabel: this.documentLabel})) return;
      const result = await this.deletes.execute({
        targets: [header], canContinue, resolveId: () => id,
        deleteById: () => this.dataSource.delete(this.listConfig.dataSource, id, header['systemRowVersion']),
      });
      this.showDeleteFailures(result.failures, result.deleted.length);
      if (!result.deleted.length) return;
      this.removeRowsFromList([this.getRowKey(header)]);
      this.unsavedFields.clear(); this.invalidHeaderDrafts.clear(); this.dirty = false;
      this.activeDocumentWindowConfig = undefined;
      if (this.documentOnly) this.closeRequested.emit(); else this.popupStack.close(this.entryPopupId);
    } finally { this.setDeleting(false); }
  }

  private async deleteLine(payload: unknown): Promise<void> {
    const entry = this.activeDocumentWindowConfig;
    const config = this.lineConfig;
    if (!entry || !config || !this.deleteAllowed(config.dataSource, [], config.permissionPageId ?? this.permissionPageId) ||
      (!this.isWorksheetPage && !this.dataSource.canWrite(this.listConfig.dataSource, entry.headerData ?? {}))) return;
    const lineRows = entry.lineRows ?? [];
    const plan = this.lineCommands.planDeleteRequest({lineRows, payload, activeRow: this.activeLineRow, selectedIndexes: this.selectedLineIndexes});
    if (!plan.targetRows.length || !plan.targetRows.every(row => this.dataSource.canWrite(config.dataSource, row))) return;
    const persisted = plan.targetRows.some(row => this.hasValue(this.documentRecord.resolvePersistedRecordId(row, config.dataSource)));
    const resolved = this.isWorksheetPage && this.worksheetSource
      ? {dataSource: this.worksheetSource, lineContextReady: true}
      : this.resolveLineDataSourceForHeader(entry.headerData ?? {});
    if (persisted && !resolved.lineContextReady) {
      this.setEntryStatus({tone: 'error', title: 'Delete failed', message: resolved.reason ?? 'Save the header before deleting persisted lines.'});
      this.changeDetector.detectChanges(); return;
    }
    const canContinue = this.dataSource.captureWriteScope();
    this.setDeleting(true);
    try {
      const result = await this.lineCommands.deleteRows({
        lineRows, canContinue, payload: {selectedIndexes: plan.targetRows.map(row => lineRows.indexOf(row))},
        resolveId: row => this.documentRecord.resolvePersistedRecordId(row, resolved.dataSource),
        deleteById: id => this.dataSource.delete(resolved.dataSource, id, lineRows.find(row => this.documentRecord.resolvePersistedRecordId(row, resolved.dataSource) === id)?.['systemRowVersion']),
        confirmDelete: count => this.confirmation.confirmIntent({intent: 'delete', count, entityLabel: 'line'}),
      });
      if (result.deleted) {
        for (const row of result.targetRows) { this.unsavedFields.delete(row); this.worksheetChangedRows.delete(row); }
        this.dirty = this.unsavedFields.size > 0;
        this.applyLineDeletionResult((entry.lineRows ?? []).filter(row => !result.targetRows.includes(row)));
      }
      this.showDeleteFailures(result.failures, result.targetRows.length);
    } finally { this.setDeleting(false); }
  }

  private copySelectedLines(payload: unknown, paste = false): void {
    const entry = this.activeDocumentWindowConfig, config = this.lineConfig;
    if (!entry || !config || config.editable === false || config.dataSource.supportsCreate === false ||
        this.deleting || this.hasPendingWrites || this.popupLoading || entry.interactionLocked || !this.canModifyLines('create') ||
        !this.dataSource.canWrite(this.listConfig.dataSource, entry.headerData ?? {}) ||
        this.isWorksheetPage && !this.worksheetAllowed({})) return;
    const button = this.resolvePopupLineToolbarButtons().find(button => this.normalizeCommandAction(button.actionKey) === (paste?'line-paste':'line-copy'));
    if (!button || button.disabled || button.hidden) return;
    const rows = entry.lineRows ?? [];
    const pasted = paste && this.isRecord(payload) && Array.isArray(payload['rows']) ? payload['rows'].filter((row):row is Record<string,unknown>=>this.isRecord(row)) : [];
    const selected = paste ? pasted : this.lineCommands.planDeleteRequest({lineRows: rows, payload,
      activeRow: this.activeLineRow, selectedIndexes: this.selectedLineIndexes}).targetRows
      .filter(row => !row['__entryPlaceholder'] && !this.isLineRowMeaningfullyEmpty(row));
    if (!selected.length) { this.setEntryStatus({tone:'info', title:'Select a line', message:'Select a populated line to copy.'}); return; }
    const limit = paste ? 100 : 20;
    if (selected.length > limit) { this.setEntryStatus({tone:'error', title:'Too many lines', message:(paste ? 'Paste' : 'Copy') + ' at most ' + limit + ' lines at a time.'}); return; }
    const copies = selected.map(source => {
      const draft = this.documentConfigData.createEmptyLineRow(config, entry.headerData ?? {}, this.getLineMasterRegistry(), this.optionFieldMap);
      const values = this.lineCommands.copyEditableValues(source, draft, config);
      Object.assign(draft, values);
      this.lineCalculations.applyCalculations(draft, config.calculation, structuredClone(entry.headerData));
      return {draft, fields:Object.keys(values)};
    });
    if (copies.some(copy => !copy.fields.length || this.validateLineRow(copy.draft).length)) {
      this.setEntryStatus({tone:'error', title:'Cannot copy lines', message:'The copied values do not satisfy the current line rules. No lines were copied.'}); return;
    }
    // The server assigns new line numbers at the end; keep the visible order consistent.
    const lastPopulated = rows.reduce((last, row, index) => row['__entryPlaceholder'] || this.isLineRowMeaningfullyEmpty(row) ? last : index, -1);
    entry.lineRows = [...rows.slice(0, lastPopulated + 1), ...copies.map(copy => copy.draft), ...rows.slice(lastPopulated + 1)];
    this.dirty = true;
    for (const {draft,fields} of copies) {
      this.trackUnsaved(draft,fields);
      if (this.isWorksheetPage) this.worksheetChangedRows.add(draft);
    }
    this.activeLineRow = copies[0].draft; this.selectedLineIndexes = [];
    this.ensureTrailingEmptyRows(); this.recalculateActiveLineTotals();
    this.changeDetector.detectChanges();
    // Reuse the normal line create path; failed drafts remain visible and dirty.
    if (!this.usesManualSaveMode()) {
      const canContinue = this.dataSource.captureWriteScope();
      this.lineBatchPending = true;
      const finish = () => {
        this.lineBatchPending = false;
        this.runModal.notifyBackground(this.initialRecord);
        this.changeDetector.markForCheck();
      };
      const saveNext = (index: number): void => {
        if (index >= copies.length || this.activeDocumentWindowConfig !== entry || !canContinue()) { finish(); return; }
        const { draft, fields } = copies[index];
        this.saveLineFields(draft, fields, { onSettled: success => {
          if (success) saveNext(index + 1); else finish();
        } });
      };
      saveNext(0);
    }
  }

  private appendNewLine(mode: 'append' | 'prepend'): void {
    if (this.isWorksheetPage && !this.worksheetAllowed({})) return;
    if (!this.canModifyLines('create') || this.lineConfig?.dataSource.supportsCreate === false || !this.dataSource.canWrite(this.listConfig.dataSource, this.activeDocumentWindowConfig?.headerData ?? {})) return;
    if (!this.activeDocumentWindowConfig || !this.lineConfig) {
      return;
    }

    const lineRows = this.activeDocumentWindowConfig.lineRows ?? [];
    const newRow = this.documentConfigData.createEmptyLineRow(
      this.lineConfig,
      this.activeDocumentWindowConfig.headerData ?? {},
      this.getLineMasterRegistry(),
      this.optionFieldMap,
    );

    this.activeDocumentWindowConfig.lineRows =
      mode === 'prepend' ? [newRow, ...lineRows] : [...lineRows, newRow];
    this.recalculateActiveLineTotals();
    this.clearEntryStatus();
    this.changeDetector.detectChanges();
  }

  private applyLineDeletionResult(nextRows: Record<string, unknown>[]): void {
    if (!this.activeDocumentWindowConfig || !this.lineConfig) {
      return;
    }

    if (!nextRows.length) {
      nextRows.push(
        this.documentConfigData.createEmptyLineRow(
          this.lineConfig,
          this.activeDocumentWindowConfig.headerData ?? {},
          this.getLineMasterRegistry(),
          this.optionFieldMap,
        ),
      );
    }

    this.activeDocumentWindowConfig.lineRows = nextRows;
    this.activeLineRow = nextRows[nextRows.length - 1];
    this.selectedLineIndexes = [];
    this.recalculateActiveLineTotals();
    this.clearEntryStatus();
    this.changeDetector.detectChanges();
  }

  private recalculateActiveLineTotals(): void {
    if (!this.activeDocumentWindowConfig?.lineRows || !this.lineConfig) {
      return;
    }

    this.activeDocumentWindowConfig.lineTotals = this.buildLineTotals(
      this.activeDocumentWindowConfig.lineRows,
      this.activeDocumentWindowConfig.headerData ?? {},
    );
  }

  private createDraftRecord(newRecord: Record<string, unknown>): Observable<Record<string, unknown> | null> {
    return this.draftCreate
      .createWithUnknownPropertyFallback(
        this.listConfig.dataSource,
        this.documentPayload.buildHeaderCreatePayload(newRecord, this.headerConfig.sections),
      )
      .pipe(
        map((response) => this.toCreatedRecord(response)),
        catchError(() => of(null)),
      );
  }

  private loadConfiguredHeaderDropdownOptions(): Observable<Record<string, Record<string, unknown>[]>> {
    const endpointMap: Record<string, string[]> = {};
    const prefetchedEmpty: Record<string, Record<string, unknown>[]> = {};

    for (const section of this.headerConfig.sections) {
      for (const field of section.fields) {
        const optionsKey = field.optionsDataKey?.trim() || `__options_${field.key}`;
        if (field.type !== 'dropdown' || !optionsKey || optionsKey in endpointMap || optionsKey in prefetchedEmpty) {
          continue;
        }

        const endpoints = this.resolveApiEndpoints(field.api ?? field.optionsEndpoints);
        if (field.optionsSkipWhenSuperAdmin && this.sessionService.SuperAdmin) {
          prefetchedEmpty[optionsKey] = [];
          continue;
        }

        if (!endpoints.length) {
          prefetchedEmpty[optionsKey] = [];
          continue;
        }

        endpointMap[optionsKey] = endpoints;
      }
    }

    if (!Object.keys(endpointMap).length) {
      return of(prefetchedEmpty);
    }

    return this.masterData.loadMasterLists(endpointMap).pipe(
      map((source) => {
        const merged: Record<string, Record<string, unknown>[]> = { ...prefetchedEmpty };
        for (const [key, records] of Object.entries(source)) {
          merged[key] = this.toRecordList(records);
        }

        return merged;
      }),
      catchError(() => of(prefetchedEmpty)),
    );
  }

  private setHeaderDropdownRecords(source: Record<string, Record<string, unknown>[]>): void {
    const next: Record<string, Record<string, unknown>[]> = {};
    for (const [key, records] of Object.entries(source)) {
      next[key] = this.toRecordList(records);
    }

    this.headerDropdownRecords = next;
  }

  private applyHeaderDropdownOptions(documentWindowConfig: DocumentWindowConfig): void {
    const headerData = documentWindowConfig.headerData;
    if (!headerData) {
      return;
    }

    for (const section of this.headerConfig.sections) {
      for (const field of section.fields) {
        const optionsKey = field.optionsDataKey?.trim() || `__options_${field.key}`;
        headerData[optionsKey] = this.headerDropdownRecords[optionsKey] ?? headerData[optionsKey] ?? [];
      }
    }
  }

  private applyLineOptions(rows: Record<string, unknown>[]): void {
    if (!this.lineConfig) {
      return;
    }

    const registry = this.getLineMasterRegistry();
    const lineNumberField = this.getLineNumberField();
    const numberOptionFieldKey = lineNumberField ? this.getLineColumnOptionsDataKey(lineNumberField) : '';
    for (const row of rows) {
      const type = this.lineMasters.resolveType(row[this.getLineTypeField()], registry);
      this.lineMasters.assignTypeOptions(row, type, registry, this.optionFieldMap, numberOptionFieldKey);
    }
  }

  private restoreEditableLocalEdits(
    localEdits: Record<string, unknown>,
    headerData: Record<string, unknown>,
  ): void {
    for (const section of this.headerConfig.sections) {
      for (const field of section.fields) {
        if (field.readonly) {
          continue;
        }

        const localValue = localEdits[field.key];
        if (this.hasValue(localValue)) {
          headerData[field.key] = localValue;
        }
      }
    }
  }

  private buildNewHeaderSeed(): Record<string, unknown> {
    const documentNoField = this.listConfig.dataSource.documentNoField;
    return this.documentConfigData.buildHeaderSeed(
      this.headerConfig.sections,
      { ...(documentNoField ? { [documentNoField]: '' } : {}), ...this.listConfig.dataSource.newRecordDefaults },
    );
  }

  private buildLineFilter(header: Record<string, unknown>, lineDataSource: DataSourceConfig): string {
    return this.dataSourceResolver.buildLineFilter({
      header,
      lineDataSource,
      lineConfig: this.lineConfig,
      listDataSource: this.listConfig.dataSource,
      hasValue: (value) => this.hasValue(value),
      toODataLiteral: (value) => this.toODataLiteral(value),
    });
  }

  private resolveLineDataSourceForHeader(header: Record<string, unknown>): ResolvedLineDataSource {
    if (this.isWorksheetPage && this.worksheetSource) return {dataSource: this.worksheetSource, lineContextReady: true};
    const resolved: DocumentPageResolvedLineDataSource = this.dataSourceResolver.resolveLineDataSourceForHeader({
      header,
      lineConfig: this.lineConfig,
      hasValue: (value) => this.hasValue(value),
      toODataId: (value) => this.toODataId(value),
    });

    return resolved;
  }

  private resolveNavigationParentId(
    header: Record<string, unknown>,
    lineDataSource: DataSourceConfig,
  ): unknown {
    return this.dataSourceResolver.resolveNavigationParentId({
      header,
      lineDataSource,
      hasValue: (value) => this.hasValue(value),
    });
  }

  private applyParentFieldsToLine(row: Record<string, unknown>): void {
    if (!this.lineConfig || !this.activeDocumentWindowConfig?.headerData) {
      return;
    }

    const parentKeyField = this.lineConfig.dataSource.parentKeyField;
    const documentNoField =
      this.lineConfig.dataSource.documentNoField ?? this.listConfig.dataSource.documentNoField;
    if (parentKeyField && !this.hasValue(row[parentKeyField])) {
      row[parentKeyField] =
        (documentNoField ? this.activeDocumentWindowConfig.headerData[documentNoField] : undefined) ??
        this.activeDocumentWindowConfig.headerData[parentKeyField];
    }

    for (const [field, value] of Object.entries(this.lineConfig.dataSource.parentFixedFields ?? {})) {
      if (!this.hasValue(row[field])) {
        row[field] = value;
      }
    }
  }

  private async synchronizeSavedEntry(change: SavedEntryChange): Promise<void> {
    const source=this.listConfig.dataSource,saved=change.saved;
    if(!saved || change.source.endpoint!==source.endpoint || !this.documentConfigData.canSynchronizeListRecord(this.rows,change.before,saved,source,this.listFilterState.buildFilter(this.listFilterScope))){this.loadFirstPage(true);return;}
    const valid=this.dataSource.captureWriteScope(),revision=this.dataSource.getResourceRevision(source),generation=this.dataSource.getReadGeneration();
    const query=JSON.stringify([this.listFilterState.buildFilter(this.listFilterScope),source.defaultSort]);
    const record=this.buildListSyncRecord(saved),fields=this.headerConfig.sections.flatMap(section=>section.fields);
    for(const field of fields)if(field.lookup && !Object.is(change.before[field.key],saved[field.key])){
      for(const prefix of ['__display_','__lookupStamp_','__lookupFailed_','__lookupRestricted_'])delete record[prefix+field.key];
      record[field.optionsDataKey ?? '__options_'+field.key]=[];
    }
    const prepared=await this.documentHydration.resolveHeaderLookups(record,fields);
    if(!valid() || revision!==this.dataSource.getResourceRevision(source) || generation!==this.dataSource.getReadGeneration() || query!==JSON.stringify([this.listFilterState.buildFilter(this.listFilterScope),this.listConfig.dataSource.defaultSort]))return;
    const current=this.rows.find(row=>this.getRowKey(row)===this.getRowKey(saved));
    if(!this.isRecord(current) || Number(current['systemRowVersion'])>Number(saved['systemRowVersion']))return;
    this.pendingListSyncRecord=prepared;this.applyDeferredListSync();
  }

  private stageListSyncFromActiveHeader(): void {
    if (
      !this.activeDocumentWindowConfig?.headerData ||
      !this.hasPersistedIdentity(this.activeDocumentWindowConfig.headerData)
    ) {
      return;
    }

    this.pendingListSyncRecord = this.buildListSyncRecord(this.activeDocumentWindowConfig.headerData);
    this.applyDeferredListSync();
  }

  private applyDeferredListSync(): void {
    if (!this.pendingListSyncRecord) {
      return;
    }

    const record = this.pendingListSyncRecord;
    const key = this.getRowKey(record);
    this.pendingListSyncRecord = undefined;
    if (!key) {
      return;
    }

    const existingIndex = this.rows.findIndex((row) => this.getRowKey(row) === key);
    if (existingIndex >= 0) {
      const nextRows = [...this.rows];
      nextRows[existingIndex] = record;
      this.rows = nextRows;
    } else {
      this.rows = [record, ...this.rows];
    }

    this.selectedRow = record;
    this.changeDetector.detectChanges();
  }

  private buildListSyncRecord(source: Record<string, unknown>): Record<string, unknown> {
    const key = this.getRowKey(source);
    const existing = this.rows.find((row) => this.getRowKey(row) === key);
    return this.documentConfigData.mergeListRecord(
      source,
      this.isRecord(existing) ? existing : undefined,
      this.isRecord(this.selectedRow) ? this.selectedRow : undefined,
    );
  }

  private resolveDeleteTargets(): Array<{ key: string; id: unknown; rowVersion?: unknown; row: Record<string, unknown> }> {
    const selectedTargets = this.rows
      .filter((row) => this.checkedRowKeys.has(this.getRowKey(row)))
      .filter((row): row is Record<string, unknown> => this.isRecord(row))
      .map((row) => ({
        key: this.getRowKey(row),
        id: this.documentRecord.resolvePersistedRecordId(row, this.listConfig.dataSource),
        rowVersion: row['systemRowVersion'],
        row,
      }))
      .filter((target) => target.key.length > 0);

    if (selectedTargets.length) {
      return selectedTargets;
    }

    if (!this.isRecord(this.selectedRow)) {
      return [];
    }

    const key = this.getRowKey(this.selectedRow);
    return key
      ? [{ key, id: this.documentRecord.resolvePersistedRecordId(this.selectedRow, this.listConfig.dataSource), rowVersion: this.selectedRow['systemRowVersion'], row: this.selectedRow }]
      : [];
  }

  private removeRowsFromList(keys: string[]): void {
    const deleteSet = new Set(keys);
    this.rows = this.rows.filter((row) => !deleteSet.has(this.getRowKey(row)));
    for (const key of deleteSet) {
      this.checkedRowKeys.delete(key);
    }

    if (!this.rows.includes(this.selectedRow)) this.selectedRow = this.rows[0];
    this.changeDetector.detectChanges();
  }

  private getDocumentTitle(row: unknown): string {
    if (this.isWorksheetPage || this.listConfig.dataSource.singleton) return this.documentLabel;
    const identity = resolvePageIdentity(row, this.listConfig);
    if (identity.primary) return recordIdentityText(identity);
    const record = this.isRecord(row) ? row : {};
    return this.hasPersistedIdentity(record) ? this.documentLabel : 'New ' + this.documentLabel;
  }

  private getRowKey(row: unknown): string {
    if (!this.isRecord(row)) {
      return '';
    }

    const id = this.resolveRecordId(row, this.listConfig.dataSource);
    return id === null || id === undefined ? '' : String(id);
  }

  private resolveRecordId(record: Record<string, unknown>, config?: DataSourceConfig): unknown {
    return this.documentRecord.resolveRecordId(record, config);
  }

  private resolvePersistedRecordId(record: Record<string, unknown>, config?: DataSourceConfig): unknown {
    return this.documentRecord.resolvePersistedRecordId(record, config);
  }

  private hasPersistedIdentity(record: unknown): boolean {
    if (!this.isRecord(record)) {
      return false;
    }

    return this.hasValue(this.resolvePersistedRecordId(record, this.listConfig.dataSource));
  }

  private getLineTypeField(): string {
    return this.dataSourceResolver.getLineTypeField({
      lineConfig: this.lineConfig,
    });
  }

  private getLineNumberField(): string {
    return this.dataSourceResolver.getLineNumberField({
      lineConfig: this.lineConfig,
    });
  }

  private getLineColumnOptionsDataKey(fieldName: string): string {
    return this.dataSourceResolver.getLineColumnOptionsDataKey({
      lineConfig: this.lineConfig,
      fieldName,
    });
  }

  private getLineColumnByOptionsKey(optionsKey: string): LineColumnConfig | undefined {
    return this.dataSourceResolver.getLineColumnByOptionsKey({
      lineConfig: this.lineConfig,
      optionsKey,
    });
  }

  private getLineMasterValueFields(): string[] {
    return this.dataSourceResolver.getLineMasterValueFields({
      lineConfig: this.lineConfig,
    });
  }

  private getLineMasterLabelFields(): string[] {
    return this.dataSourceResolver.getLineMasterLabelFields({
      lineConfig: this.lineConfig,
    });
  }

  private resolveConfiguredFields(source: string | string[] | undefined): string[] {
    return this.dataSourceResolver.resolveConfiguredFields({ source });
  }

  private getLineFillTargetFields(fieldName: string): string[] {
    return this.dataSourceResolver.getLineFillTargetFields({
      lineConfig: this.lineConfig,
      fieldName,
    });
  }

  private getLineFieldsByValueType(valueType: 'text' | 'number' | 'boolean' | 'date'): string[] {
    return this.dataSourceResolver.getLineFieldsByValueType({
      lineConfig: this.lineConfig,
      valueType: valueType as DocumentPageLineValueType,
    });
  }

  private getColumnField(column: LineColumnConfig | undefined): string {
    return this.dataSourceResolver.getColumnField({ column });
  }

  private resolveLineNoField(): string {
    return this.dataSourceResolver.resolveLineNoField({
      lineConfig: this.lineConfig,
    });
  }

  private ensureTrailingEmptyRows(minEmptyRows = 1): void {
    if (!this.lineConfig || !this.activeDocumentWindowConfig) {
      return;
    }

    if (this.lineConfig.dataSource.supportsCreate === false || this.lineConfig.editable === false || !this.canModifyLines('create')) {
      return;
    }

    const lineRows = this.activeDocumentWindowConfig.lineRows ?? [];
    const emptyRows = lineRows.filter((row) => !this.hasValue(this.resolvePersistedRecordId(row, this.lineConfig?.dataSource)) && this.isLineRowMeaningfullyEmpty(row));
    const missing = Math.max(0, minEmptyRows - emptyRows.length, 8 - lineRows.length);
    if (missing <= 0) {
      return;
    }

    const additions: Record<string, unknown>[] = [];
    for (let index = 0; index < missing; index += 1) {
      additions.push(this.documentConfigData.createEmptyLineRow(
        this.lineConfig,
        this.activeDocumentWindowConfig.headerData ?? {},
        this.getLineMasterRegistry(),
        this.optionFieldMap,
      ));
    }

    for (const row of additions) row['__entryPlaceholder'] = true;
    this.activeDocumentWindowConfig.lineRows = [...lineRows, ...additions];
    this.changeDetector.detectChanges();
  }

  private isLineRowMeaningfullyEmpty(row: Record<string, unknown>): boolean {
    const fields = this.lineConfig?.dataSource.meaningfulFields;
    if (fields?.length) {
      const hasMeaningfulValue = fields.some(field => this.hasValue(row[field]) && row[field] !== 0 && row[field] !== false);
      const changedDefault = (this.lineConfig?.columns ?? []).some(column => {
        if (column.readonly || column.defaultValue === undefined) return false;
        const value = row[column.field ?? column.id];
        return String(value ?? '') !== String(column.defaultValue ?? '');
      });
      return !hasMeaningfulValue && !changedDefault;
    }
    if (!this.lineConfig) {
      return true;
    }

    const lineNoField = this.resolveLineNoField();
    const protectedFields = new Set<string>([
      this.toText(this.lineConfig.dataSource.keyField).trim(),
      this.toText(this.lineConfig.dataSource.parentKeyField).trim(),
      this.toText(this.lineConfig.dataSource.documentNoField).trim(),
      lineNoField,
    ].filter((field) => field.length > 0));

    for (const column of this.lineConfig.columns) {
      const field = this.getColumnField(column);
      if (!field || protectedFields.has(field)) {
        continue;
      }

      const value = row[field];
      if (column.valueType === 'boolean') {
        if (value === true) {
          return false;
        }
        continue;
      }

      if (column.valueType === 'number') {
        const numeric = this.toNumber(value);
        if (numeric !== null && numeric !== 0) {
          return false;
        }
        continue;
      }

      if (this.hasValue(value)) {
        return false;
      }
    }

    return true;
  }

  private deferLineSaveFields(row: Record<string, unknown>, fields: string[]): void {
    const existing = this.deferredLineSaveFields.get(row) ?? new Set<string>();
    for (const field of fields) {
      const normalized = this.toText(field).trim();
      if (normalized.length) {
        existing.add(normalized);
      }
    }

    this.deferredLineSaveFields.set(row, existing);
  }

  private takeDeferredLineSaveFields(row: Record<string, unknown>): string[] {
    const queued = this.deferredLineSaveFields.get(row);
    this.deferredLineSaveFields.delete(row);
    return queued ? [...queued] : [];
  }

  private resolveApiEndpoints(source: string | string[] | undefined): string[] {
    return this.dataSourceResolver.resolveApiEndpoints({ source });
  }

  private startPopupLoading(message: string): void {
    if (this.runModalLoading.isScopeLoading(this.popupLoadingScope)) {
      this.runModalLoading.setMessage(this.popupLoadingScope, message);
      this.syncEntryPopupLoadingState();
      this.changeDetector.detectChanges();
      return;
    }

    this.runModalLoading.begin(this.popupLoadingScope, message);
    this.syncEntryPopupLoadingState();
    this.changeDetector.detectChanges();
  }

  private stopPopupLoading(): void {
    if (!this.runModalLoading.isScopeLoading(this.popupLoadingScope)) {
      this.syncEntryPopupLoadingState();
      this.changeDetector.detectChanges();
      return;
    }

    while (this.runModalLoading.isScopeLoading(this.popupLoadingScope)) {
      this.runModalLoading.end(this.popupLoadingScope);
    }
    this.syncEntryPopupLoadingState();
    this.changeDetector.detectChanges();
  }

  private syncEntryPopupLoadingState(): void {
    const currentConfig = this.activeDocumentWindowConfig;
    if (!currentConfig) {
      return;
    }

    const busy = this.runModalLoading.isScopeLoading(this.popupLoadingScope);
    currentConfig.interactionLocked = busy;

    if (busy) {
      currentConfig.statusMessage = {
        tone: 'info',
        title: 'Loading',
        message: this.popupLoadingMessage,
        blocking: true,
      };
      return;
    }

    if (currentConfig.statusMessage?.blocking) {
      currentConfig.statusMessage = undefined;
    }
  }

  private startListLoading(): void {
    this.listLifecycle.startListLoading(this.listLifecycleContext);
  }

  private stopListLoading(): void {
    this.listLifecycle.stopListLoading(this.listLifecycleContext);
  }

  private get listLifecycleContext(): DocumentPageListLifecycleContext {
    const thisHost = this;

    return {
      listDataSource: this.listConfig.dataSource,
      listLoadingScope: this.listLoadingScope,
      listFilterScope: this.listFilterScope,
      listTitle: this.listConfig.title,
      get cursor() { return thisHost.nextCursor; },
      set cursor(value) { thisHost.nextCursor = value; },
      hydrationTimeoutMs: this.timeoutPolicy.hydrationTimeoutMs,
      loading: this.loading,

      get rows() {
        return thisHost.rows;
      },
      set rows(value) {
        thisHost.rows = value;
      },
      get hasMore() {
        return thisHost.hasMore;
      },
      set hasMore(value) {
        thisHost.hasMore = value;
      },
      get error() {
        return thisHost.error;
      },
      set error(value) {
        thisHost.error = value;
      },
      get selectedRow() {
        return thisHost.selectedRow;
      },
      set selectedRow(value) {
        thisHost.selectedRow = value;
      },
      get pendingFirstPageReload() {
        return thisHost.pendingFirstPageReload;
      },
      set pendingFirstPageReload(value) {
        thisHost.pendingFirstPageReload = value;
      },
      get filterReloadTimer() {
        return thisHost.filterReloadTimer;
      },
      set filterReloadTimer(value) {
        thisHost.filterReloadTimer = value;
      },
      get listLoadSubscription() {
        return thisHost.listLoadSubscription;
      },
      set listLoadSubscription(value) {
        thisHost.listLoadSubscription = value;
      },
      get activeDocumentWindowConfig() {
        return thisHost.activeDocumentWindowConfig;
      },
      set activeDocumentWindowConfig(value) {
        thisHost.activeDocumentWindowConfig = value;
      },
      get checkedRowKeys() {
        return thisHost.checkedRowKeys;
      },

      buildFilter: (scope) => this.listFilterState.buildFilter(scope),
      hydrateTargetsFromRecords: (scope, records) => this.listFilterState.hydrateTargetsFromRecords(scope, records),
      loadList: (dataSource, options) => this.dataSource.loadList(dataSource, { ...options, useCache: true, maxAgeMs: 30000 }).pipe(switchMap(response => {
        const fields = this.headerConfig.sections.flatMap(section => section.fields).filter(field => field.lookup);
        if (!fields.length) return of(response);
        const page = response as DataPage;
        return from(this.documentHydration.resolveListLookups(page.value, fields)).pipe(map(value => {
          for (const record of value) {
            const id = this.resolvePersistedRecordId(record, dataSource);
            if (this.hasValue(id)) this.dataSource.cachePreparedRecord(dataSource, id, record, fields);
          }
          return {...page, value};
        }));
      })),
      toRecords: (response) => this.toRecords(response),
      getErrorMessage: (error) => this.getErrorMessage(error),
      detectChanges: () => this.changeDetector.detectChanges(),

      isScopeLoading: (scope) => this.runModalLoading.isScopeLoading(scope),
      setScopeMessage: (scope, message) => this.runModalLoading.setMessage(scope, message),
      beginScopeLoading: (scope, message) => this.runModalLoading.begin(scope, message),
      endScopeLoading: (scope) => this.runModalLoading.end(scope),
    };
  }

  private isUncertainSave(error: unknown): boolean {
    return this.isRecord(error) && (error['status']===0 || error['name']==='TimeoutError');
  }

  private setEntryStatus(message: DocumentStatusMessage): void {
    if (!this.activeDocumentWindowConfig) {
      return;
    }

    // Keep loader-driven status as the single source while popup scope is active.
    if (this.runModalLoading.isScopeLoading(this.popupLoadingScope)) {
      this.syncEntryPopupLoadingState();
      return;
    }

    this.activeDocumentWindowConfig.statusMessage = message;
    this.runModal.notifyBackground(this.initialRecord);
  }

  private clearEntryStatus(): void {
    if (!this.activeDocumentWindowConfig) {
      return;
    }

    // Avoid clearing active loader status mid-flight.
    if (this.runModalLoading.isScopeLoading(this.popupLoadingScope)) {
      this.syncEntryPopupLoadingState();
      return;
    }

    this.activeDocumentWindowConfig.statusMessage = undefined;
  }

  private stripIdentityFields(payload: Record<string, unknown>): void {
    if (this.listConfig.dataSource.keyField) {
      delete payload[this.listConfig.dataSource.keyField];
    }
  }

  private toCreatedRecord(response: unknown): Record<string, unknown> | null {
    const first = this.toRecords(response)[0];
    if (this.isRecord(first)) {
      return first;
    }

    return this.isRecord(response) ? response : null;
  }

  private toRecords(response: unknown): unknown[] {
    if (Array.isArray(response)) {
      return response;
    }

    if (this.isRecord(response) && Array.isArray(response['value'])) {
      return response['value'];
    }

    return [];
  }

  private toRecordList(source: unknown): Record<string, unknown>[] {
    return this.valueMapper.toRecordList(source);
  }

  private getErrorMessage(error: unknown): string {
    return this.apiError.toMessage(error, GENERIC_MESSAGES.listLoadFailed);
  }

  private toODataLiteral(value: unknown): string {
    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }

    return `'${this.toText(value).replace(/'/g, "''").trim()}'`;
  }

  private toODataId(value: unknown): string {
    return this.valueMapper.toODataId(value);
  }

  private isGuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
  }

  private hasValue(value: unknown): boolean {
    return value !== null && value !== undefined && String(value).trim().length > 0;
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return this.valueMapper.isRecord(value);
  }

  private toText(value: unknown): string {
    return this.valueMapper.toText(value);
  }

  private toNumber(value: unknown): number | null {
    return this.valueMapper.toNumber(value);
  }
}
