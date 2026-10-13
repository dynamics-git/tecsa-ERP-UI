// NOTE:
// This file is currently a core ERP runtime/orchestration file.
// Future refactor should split loading, popup orchestration, line runtime,
// autosave, and command handling into smaller services.
// Do not change behavior during this cleanup.
import { Inject, Injectable, Optional, inject } from '@angular/core';
import { EntryAttachmentsConfig, DocumentWindowConfig } from '../models/document-window-config.model';
import { LineColumnConfig } from '../models/line-config.model';
import { PopupMode, PopupSize } from '../models/popup-config.model';
import { ListPageConfig } from '../models/page-config.model';
import { RunModalStackService } from './run-modal-stack.service';
import { DataSourceService } from '../data/data-source.service';
import { DataSourceConfig } from '../models/data-source-config.model';
import { RunModalHostData, RunModalListPopupState } from '../models/run-modal-host-data.model';
import { firstValueFrom } from 'rxjs';
import { timeout } from 'rxjs/operators';
import { ConfirmationService } from '../../shared/ui/confirmation.service';
import { ApiErrorService } from '../data/api-error.service';
import { EntryRecordService } from '../data/entry-record.service';
import { EntryResponseNormalizerService } from '../data/entry-response-normalizer.service';
import { EntryHydrationOrchestratorService } from '../data/entry-hydration-orchestrator.service';
import { LineMasterRegistry, LineMasterService } from '../data/line-master.service';
import { MasterDataService } from '../data/master-data.service';
import { LineTotalsCalculationConfig } from '../models/line-calculation-config.model';
import { LineCalculationService } from '../document/line-calculation.service';
import { RunModalLoadingService } from './run-modal-loading.service';
import { GENERIC_MESSAGES } from '../models/generic-messages';
import { RUNTIME_TIMEOUT_POLICY } from '../data/runtime-timeout-policy.token';
import { RuntimeValueMapperService } from '../data/runtime-value-mapper.service';
import { RunModalBindingStateService } from './run-modal-binding-state.service';
import { RunModalConfigAssemblerService } from './run-modal-config-assembler.service';
import { RunModalHydrationResolverService } from './run-modal-hydration-resolver.service';
import { RunModalOptionsResolverService } from './run-modal-options-resolver.service';
import { RunModalPayloadBuilderService } from './run-modal-payload-builder.service';
import {
  RUN_MODAL_CONFIG_RESOLVER,
  RunModalConfigModule,
  RunModalConfigResolver,
  RunModalContext,
} from './run-modal-config.token';

type RunModalPageDefinition = {
  pageId: string;
  module: RunModalConfigModule;
};

type RunModalBinding = {
  pageId: string;
  module: RunModalConfigModule;
  context: RunModalContext;
  dataSource?: DataSourceConfig;
  headerDataSource?: DataSourceConfig;
  lineDataSource?: DataSourceConfig;
  lineMasterRegistry?: LineMasterRegistry;
  lineOptionFieldMap?: Record<string, Array<{ label: string; value: unknown }>>;
  lineNumberOptionFieldKey?: string;
};

type RunModalActionEvent = {
  actionKey: string;
  payload?: unknown;
};

type HydrationResult = {
  lineHydrateFailed: boolean;
  lineHydrateMessage?: string;
};

export interface RunModalRequest {
  pageId: string;
  context?: RunModalContext;
  mode?: PopupMode;
  size?: PopupSize;
  target?: 'entry' | 'list';
  allowNested?: boolean;
  popupId?: string;
}

@Injectable({
  providedIn: 'root',
})
export class RunModalService {
  private readonly timeoutPolicy = inject(RUNTIME_TIMEOUT_POLICY);
  private readonly valueMapper = inject(RuntimeValueMapperService);
  private readonly bindingState = inject(RunModalBindingStateService);
  private readonly configAssembler = inject(RunModalConfigAssemblerService);
  private readonly hydrationResolver = inject(RunModalHydrationResolverService);
  private readonly optionsResolver = inject(RunModalOptionsResolverService);
  private readonly payloadBuilder = inject(RunModalPayloadBuilderService);

  private get bindings(): Map<string, RunModalBinding> {
    return this.bindingState.bindings as Map<string, RunModalBinding>;
  }

  private get autosaveTimers(): Map<string, ReturnType<typeof setTimeout>> {
    return this.bindingState.autosaveTimers;
  }

  private get lastOpenFailureReason(): string {
    return this.bindingState.lastOpenFailureReason;
  }

  private set lastOpenFailureReason(value: string) {
    this.bindingState.lastOpenFailureReason = value;
  }

  constructor(
    private readonly popupStack: RunModalStackService,
    private readonly dataSource: DataSourceService,
    private readonly confirmation: ConfirmationService,
    private readonly apiError: ApiErrorService,
    private readonly entryRecord: EntryRecordService,
    private readonly entryResponseNormalizer: EntryResponseNormalizerService,
    private readonly entryHydration: EntryHydrationOrchestratorService,
    private readonly masterData: MasterDataService,
    private readonly lineMasters: LineMasterService,
    private readonly lineCalculation: LineCalculationService,
    private readonly runModalLoading: RunModalLoadingService,
    @Inject(RUN_MODAL_CONFIG_RESOLVER)
    private readonly configResolver: RunModalConfigResolver,
  ) {}

  async open(request: RunModalRequest): Promise<boolean> {
    const openScope = this.buildOpenScope(request.pageId);
    this.runModalLoading.begin(openScope, this.buildOpenMessage(request.pageId));

    try {
    const definition = await this.resolvePageDefinition(request.pageId);
    if (!definition) {
      this.lastOpenFailureReason = `config-not-found:${request.pageId}`;
      return false;
    }

    const target = this.resolveOpenTarget(definition.module, definition.pageId, request.target);
    if (target === 'list') {
      return this.openList(request, definition);
    }

    const context = request.context ?? {};
    const entryDialogConfig = this.buildGenericEntryDialogConfig(
      definition.module,
      definition.pageId,
      context,
    );
    const navigationDataSource = this.resolveNavigationDataSource(definition.module, context);
    const headerDataSource = navigationDataSource ?? this.pickDataSource(definition.module);
    const lineDataSource = this.pickLineDataSource(definition.module);
    const popupId = request.popupId ?? `run-modal-${request.pageId}-${Date.now()}`;

    const opened = this.popupStack.open({
      id: popupId,
      title: entryDialogConfig.title,
      mode: request.mode ?? 'page',
      size: request.size ?? 'full',
      allowNested: request.allowNested ?? true,
      data: {
        entryDialogConfig,
      },
    });

    if (!opened) {
      this.lastOpenFailureReason = `popup-open-blocked:${request.pageId}`;
      return false;
    }

    this.lastOpenFailureReason = '';

    this.bindings.set(popupId, {
      pageId: definition.pageId,
      module: definition.module,
      context,
      dataSource: navigationDataSource,
      headerDataSource,
      lineDataSource,
    });

    void this.hydrateEntryDialog(definition.module, entryDialogConfig, context, navigationDataSource, popupId);

    return true;
    } finally {
      this.runModalLoading.end(openScope);
    }
  }

  private async hydrateEntryDialog(
    module: RunModalConfigModule,
    entryDialogConfig: DocumentWindowConfig,
    context: RunModalContext,
    dataSource: DataSourceConfig | undefined,
    popupId: string,
  ): Promise<void> {
    const scope = this.buildHydrationScope(popupId);
    this.runModalLoading.begin(scope, 'Loading header and lines...');
    this.setInteractionLock(entryDialogConfig, true);
    entryDialogConfig.statusMessage = {
      tone: 'info',
      title: 'Loading',
      message: 'Loading lines...',
      blocking: true,
    };
    this.refreshPopup(popupId);

    try {
      const hydration = await this.hydrateFromApi(module, entryDialogConfig, context, dataSource);
      this.recalculateLineTotals(module, entryDialogConfig);
      this.setInteractionLock(entryDialogConfig, hydration.lineHydrateFailed);
      entryDialogConfig.statusMessage = hydration.lineHydrateFailed
        ? {
          tone: 'error',
          title: 'Line load failed',
          message: hydration.lineHydrateMessage ?? 'Unable to load lines. Retry to continue.',
        }
        : undefined;
      this.refreshPopup(popupId);
      if (!hydration.lineHydrateFailed) {
        this.scheduleEntryOptionHydration(module, entryDialogConfig, popupId);
      }
    } catch {
      this.setInteractionLock(entryDialogConfig, true);
      entryDialogConfig.statusMessage = {
        tone: 'error',
        title: 'Line load failed',
        message: 'Unable to load lines. Retry to continue.',
      };
      this.refreshPopup(popupId);
    } finally {
      this.runModalLoading.end(scope);
    }
  }

  private async retryHydration(
    popupId: string,
    binding: RunModalBinding,
    entryDialogConfig: DocumentWindowConfig,
  ): Promise<void> {
    const scope = this.buildHydrationScope(popupId);
    this.runModalLoading.begin(scope, 'Retrying header and lines...');
    this.setInteractionLock(entryDialogConfig, true);
    entryDialogConfig.statusMessage = {
      tone: 'info',
      title: 'Retrying',
      message: 'Loading lines...',
      blocking: true,
    };
    this.refreshPopup(popupId);

    try {
      const hydration = await this.hydrateFromApi(
        binding.module,
        entryDialogConfig,
        binding.context,
        binding.dataSource,
      );

      this.recalculateLineTotals(binding.module, entryDialogConfig);
      this.setInteractionLock(entryDialogConfig, hydration.lineHydrateFailed);
      entryDialogConfig.statusMessage = hydration.lineHydrateFailed
        ? {
          tone: 'error',
          title: 'Line load failed',
          message: hydration.lineHydrateMessage ?? 'Unable to load lines. Retry to continue.',
        }
        : undefined;

      if (!hydration.lineHydrateFailed) {
        this.scheduleEntryOptionHydration(binding.module, entryDialogConfig, popupId);
      }
    } catch {
      this.setInteractionLock(entryDialogConfig, true);
      entryDialogConfig.statusMessage = {
        tone: 'error',
        title: 'Line load failed',
        message: 'Unable to load lines. Retry to continue.',
      };
    } finally {
      this.refreshPopup(popupId);
      this.runModalLoading.end(scope);
    }
  }

  async openEntryFromList(popupId: string, row: unknown): Promise<boolean> {
    const binding = this.bindings.get(popupId);
    if (!binding) {
      this.lastOpenFailureReason = `binding-not-found:${popupId}`;
      return false;
    }

    const headerData = this.toRecord(row) ?? {};
    // Generate a NEW popup ID for the entry so it stacks on top of the list
    const entryPopupId = `${popupId}-entry-${Date.now()}`;
    return this.open({
      pageId: binding.pageId,
      target: 'entry',
      popupId: entryPopupId,
      context: {
        ...binding.context,
        headerData,
      },
      mode: 'page',
      size: 'full',
      allowNested: true,
    });
  }

  private async loadFreshHeaderData(
    binding: RunModalBinding,
    row: unknown,
  ): Promise<Record<string, unknown>> {
    return this.hydrationResolver.loadFreshHeaderData(binding, row);
  }

  async handleListCommand(popupId: string, event: RunModalActionEvent): Promise<boolean> {
    const binding = this.bindings.get(popupId);
    if (!binding) {
      return false;
    }

    const actionKey = event.actionKey.trim().toLowerCase();
    if (actionKey === 'new') {
      return this.openEntryFromList(popupId, {});
    }

    if (actionKey === 'refresh') {
      const definition = await this.resolvePageDefinition(binding.pageId);
      if (!definition) {
        return false;
      }

      return this.openList(
        {
          pageId: binding.pageId,
          context: binding.context,
          mode: 'page',
          size: 'full',
          target: 'list',
          allowNested: true,
          popupId,
        },
        definition,
        true,
      );
    }

    return false;
  }

  handlePopupAction(
    popupId: string,
    entryDialogConfig: DocumentWindowConfig,
    event: RunModalActionEvent,
  ): boolean {
    const binding = this.bindings.get(popupId);
    if (!binding) {
      return false;
    }

    if (event.actionKey === 'header:changed') {
      this.applyHeaderChange(entryDialogConfig, event.payload);
      return true;
    }

    if (event.actionKey === 'line:changed') {
      this.applyLineChange(binding, entryDialogConfig, event.payload);
      return true;
    }

    if (event.actionKey === 'cmd:retry-hydrate') {
      void this.retryHydration(popupId, binding, entryDialogConfig);
      return true;
    }

    if (event.actionKey === 'cmd:autosave') {
      if (this.usesManualSaveMode(entryDialogConfig)) {
        return true;
      }

      this.scheduleAutosave(popupId, binding, entryDialogConfig, event.payload);
      return true;
    }

    if (event.actionKey === 'cmd:apply' || event.actionKey === 'cmd:save') {
      this.clearAutosave(popupId);
      void this.saveHeader(popupId, binding, entryDialogConfig);
      return true;
    }

    if (event.actionKey === 'cmd:line-delete') {
      void this.deleteLines(popupId, binding, entryDialogConfig, event.payload);
      return true;
    }

    if (event.actionKey === 'cmd:line-new' || event.actionKey === 'cmd:line-insert') {
      void this.insertAndSaveLine(binding, entryDialogConfig, event.payload);
      return true;
    }

    if (event.actionKey === 'cmd:delete') {
      void this.deleteHeader(popupId, binding, entryDialogConfig);
      return true;
    }

    return false;
  }

  releasePopup(popupId: string): void {
    this.bindingState.releasePopup(popupId);
  }

  private clearAutosave(popupId: string): void {
    this.bindingState.clearAutosave(popupId);
  }

  private scheduleEntryOptionHydration(
    module: RunModalConfigModule,
    entryDialogConfig: DocumentWindowConfig,
    popupId: string,
  ): void {
    void this.hydrateEntryOptions(module, entryDialogConfig, popupId);
  }

  private async hydrateEntryOptions(
    module: RunModalConfigModule,
    entryDialogConfig: DocumentWindowConfig,
    popupId: string,
  ): Promise<void> {
    try {
      const optionState = await this.hydrateOptions(module, entryDialogConfig);
      const binding = this.bindings.get(popupId);
      if (binding) {
        Object.assign(binding, optionState);
      }
      this.refreshPopup(popupId);
    } catch {
      // Option lists are non-blocking; fields remain editable while lookups retry on the next open.
    }
  }

  private refreshPopup(popupId: string): void {
    this.bindingState.refreshPopup(popupId);
  }

  private scheduleAutosave(
    popupId: string,
    binding: RunModalBinding,
    entryDialogConfig: DocumentWindowConfig,
    payload: unknown,
  ): void {
    const existing = this.autosaveTimers.get(popupId);
    if (existing) {
      clearTimeout(existing);
    }

    const timer = setTimeout(() => {
      this.autosaveTimers.delete(popupId);
      void this.saveFromAutosave(popupId, binding, entryDialogConfig, payload);
    }, 350);

    this.autosaveTimers.set(popupId, timer);
  }

  private usesManualSaveMode(entryDialogConfig: DocumentWindowConfig): boolean {
    return this.hasManualSaveCommand(entryDialogConfig.headerToolbarButtons)
      || this.hasManualSaveCommand(entryDialogConfig.lineToolbarButtons)
      || this.hasManualSaveCommand(entryDialogConfig.detailToolbarButtons);
  }

  private hasManualSaveCommand(buttons: DocumentWindowConfig['headerToolbarButtons']): boolean {
    return (buttons ?? []).some((button) => {
      const actionKey = this.toText(button.actionKey).trim().toLowerCase();
      return actionKey === 'save' || actionKey === 'apply' || actionKey === 'cmd:save' || actionKey === 'cmd:apply';
    });
  }

  getLastOpenFailureReason(): string {
    return this.bindingState.getLastOpenFailureReason();
  }

  private async openList(
    request: RunModalRequest,
    definition: RunModalPageDefinition,
    forceRefresh = false,
  ): Promise<boolean> {
    const listPageConfig = this.pickListPageConfig(definition.module);
    const listDataSource = this.resolveContextualListDataSource(
      this.pickDataSource(definition.module),
      request.context ?? {},
    );
    if (!listPageConfig || !listDataSource?.endpoint?.trim()) {
      this.lastOpenFailureReason = `list-config-or-datasource-missing:${definition.pageId}`;
      return false;
    }

    const popupId = request.popupId ?? `run-modal-list-${request.pageId}-${Date.now()}`;
    const listScope = this.buildListScope(popupId);
    this.runModalLoading.begin(listScope, `Loading ${definition.pageId} list...`);
    const loadOptions = {
      top: listDataSource.pageSize ?? 20,
      forceRefresh,
    };
    const cachedRows: Record<string, unknown>[] = [];
    const opened = this.popupStack.open({
      id: popupId,
      title: listPageConfig.title ?? definition.pageId,
      mode: request.mode ?? 'page',
      size: request.size ?? 'full',
      allowNested: request.allowNested ?? true,
      data: {
        runModalList: {
          pageId: definition.pageId,
          config: listPageConfig,
          rows: cachedRows,
          loading: true,
          errorMessage: undefined,
        },
      },
    });

    if (opened) {
      this.bindings.set(popupId, {
        pageId: definition.pageId,
        module: definition.module,
        context: request.context ?? {},
        dataSource: listDataSource,
        headerDataSource: listDataSource,
        lineDataSource: this.pickLineDataSource(definition.module),
      });
      this.lastOpenFailureReason = '';
      void this.refreshOpenListPopup(popupId, listDataSource, loadOptions);
    } else {
      this.lastOpenFailureReason = `popup-open-blocked:${definition.pageId}`;
      this.runModalLoading.end(listScope);
    }

    return opened;
  }

  private async refreshOpenListPopup(
    popupId: string,
    listDataSource: DataSourceConfig,
    loadOptions: { top: number; forceRefresh?: boolean },
  ): Promise<void> {
    const scope = this.buildListScope(popupId);
    try {
      const rows = await this.loadListRows(listDataSource, loadOptions);
      this.popupStack.update(popupId, (popup) => ({
        ...popup,
        data: this.patchRunModalListState(popup.data, {
          rows,
          loading: false,
          errorMessage: undefined,
        }),
      }));
    } catch (error: unknown) {
      this.popupStack.update(popupId, (popup) => ({
        ...popup,
        data: this.patchRunModalListState(popup.data, {
          loading: false,
          errorMessage: this.getErrorMessage(error, GENERIC_MESSAGES.listLoadFailed),
        }),
      }));
    } finally {
      this.runModalLoading.end(scope);
    }
  }

  private buildOpenScope(pageId: string): string {
    const normalized = pageId.trim().toLowerCase() || 'unknown';
    return `run-modal:open:${normalized}`;
  }

  private buildOpenMessage(pageId: string): string {
    const normalized = pageId.trim();
    return normalized.length ? `Opening ${normalized}...` : 'Opening page...';
  }

  private buildHydrationScope(popupId: string): string {
    return `run-modal:hydrate:${popupId}`;
  }

  private buildListScope(popupId: string): string {
    return `section:run-modal:list:${popupId}`;
  }

  private buildMutationScope(popupId: string): string {
    return `run-modal:mutate:${popupId}`;
  }

  private patchRunModalListState(
    popupData: unknown,
    patch: Partial<Pick<RunModalListPopupState, 'rows' | 'loading' | 'errorMessage'>>,
  ): RunModalHostData {
    const currentData = this.toRecord(popupData) as RunModalHostData | null;
    const currentList = currentData?.runModalList;
    if (!currentList) {
      return currentData ?? {};
    }

    return {
      ...currentData,
      runModalList: {
        ...currentList,
        ...patch,
      },
    };
  }

  private resolveContextualListDataSource(
    dataSource: DataSourceConfig | undefined,
    context: RunModalContext,
  ): DataSourceConfig | undefined {
    return this.hydrationResolver.resolveContextualListDataSource(dataSource, context);
  }

  private async loadListRows(
    dataSource: DataSourceConfig,
    options: { top: number } = { top: dataSource.pageSize ?? 20 },
  ): Promise<Record<string, unknown>[]> {
    return this.hydrationResolver.loadListRows(dataSource, options);
  }

  private pickLineDataSource(module: RunModalConfigModule): DataSourceConfig | undefined {
    return this.configAssembler.pickLineDataSource({ module });
  }

  private async resolvePageDefinition(pageId: string): Promise<RunModalPageDefinition | undefined> {
    const normalized = pageId.trim().toLowerCase();
    if (!normalized) {
      return undefined;
    }

    const module = await this.loadRunModalConfigModule(normalized);
    if (!module) {
      return undefined;
    }

    if (!this.moduleDeclaresPageId(module, normalized)) {
      return undefined;
    }

    return {
      pageId: normalized,
      module,
    };
  }

  private async loadRunModalConfigModule(
    pageId: string,
  ): Promise<RunModalConfigModule | undefined> {
    const normalized = pageId.trim().toLowerCase();
    if (!normalized.length) {
      return undefined;
    }

    try {
      const resolved = await this.configResolver(normalized);
      if (resolved && this.moduleDeclaresPageId(resolved, normalized)) {
        return resolved;
      }
    } catch {
      return undefined;
    }

    return undefined;
  }

  private moduleDeclaresPageId(module: RunModalConfigModule, normalizedPageId: string): boolean {
    const bucket = this.toRecord(module);
    if (!bucket) {
      return false;
    }

    for (const exportedValue of Object.values(bucket)) {
      const record = this.toRecord(exportedValue);
      if (!record) {
        continue;
      }

      const declaredPageId = this.toText(record['pageId']).trim().toLowerCase();
      if (declaredPageId === normalizedPageId) {
        return true;
      }
    }

    return false;
  }

  private buildGenericEntryDialogConfig(
    module: RunModalConfigModule,
    pageId: string,
    context: RunModalContext,
  ): DocumentWindowConfig {
    return this.configAssembler.buildGenericEntryDialogConfig({
      module,
      pageId,
      context,
    });
  }

  private getDefaultAttachments(): EntryAttachmentsConfig {
    return this.configAssembler.getDefaultAttachments();
  }

  private async hydrateFromApi(
    module: RunModalConfigModule,
    entryDialogConfig: DocumentWindowConfig,
    context: RunModalContext,
    dataSource?: DataSourceConfig,
  ): Promise<HydrationResult> {
    return this.hydrationResolver.hydrateFromApi({
      module,
      entryDialogConfig,
      context,
      dataSource,
      resolveEntryHydrationTop: (value, source) => this.resolveEntryHydrationTop(value, source),
      isWorksheetPage: (value) => this.isWorksheetPage(value),
      mergeHeaderFromFirstRecord: (record, config) => this.mergeHeaderFromFirstRecord(record, config),
      mapRecordsToLineRows: (records, config) => this.mapRecordsToLineRows(records, config),
      hydrateRelatedLines: (value, config) => this.hydrateRelatedLines(value, config),
      pickLineDataSource: (value) => this.pickLineDataSource(value),
    });
  }

  private async hydrateRelatedLines(
    module: RunModalConfigModule,
    entryDialogConfig: DocumentWindowConfig,
  ): Promise<HydrationResult> {
    return this.hydrationResolver.hydrateRelatedLines({
      module,
      entryDialogConfig,
      pickLineDataSource: (value) => this.pickLineDataSource(value),
      loadRelatedLineRows: (value, headerData) => this.loadRelatedLineRows(value, headerData),
      mapRecordsToLineRows: (records, config) => this.mapRecordsToLineRows(records, config),
    });
  }

  private async loadRelatedLineRows(
    module: RunModalConfigModule,
    headerData: Record<string, unknown>,
  ): Promise<Record<string, unknown>[]> {
    return this.hydrationResolver.loadRelatedLineRows(module, headerData);
  }

  private resolveContextRecordId(context: RunModalContext, dataSource: DataSourceConfig): unknown {
    return this.hydrationResolver.resolveContextRecordId(context, dataSource);
  }

  private resolveNavigationDataSource(
    module: RunModalConfigModule,
    context: RunModalContext,
  ): DataSourceConfig | undefined {
    return this.hydrationResolver.resolveNavigationDataSource(module, context);
  }

  private pickDataSource(module: RunModalConfigModule): DataSourceConfig | undefined {
    return this.configAssembler.pickDataSource({ module });
  }

  private toRecordList(response: unknown): Record<string, unknown>[] {
    return this.valueMapper.toRecordList(response);
  }

  private mapRecordsToLineRows(
    records: Record<string, unknown>[],
    entryDialogConfig: DocumentWindowConfig,
  ): Record<string, unknown>[] {
    const columns = entryDialogConfig.lineColumns ?? [];
    if (!columns.length) {
      return records;
    }

    return records.map((record) => {
      const row: Record<string, unknown> = { ...record };
      for (const column of columns) {
        const field = this.toText(column.field ?? column.id).trim();
        if (!field) {
          continue;
        }

        row[field] = this.readFieldValue(record, field);
      }

      return row;
    });
  }

  private async hydrateOptions(
    module: RunModalConfigModule,
    entryDialogConfig: DocumentWindowConfig,
  ): Promise<Partial<RunModalBinding>> {
    const optionState = await this.hydrateLineMasterOptions(module, entryDialogConfig);
    await this.hydrateHeaderOptions(entryDialogConfig);
    await this.hydrateLineEndpointOptions(entryDialogConfig);

    return optionState;
  }

  private async hydrateHeaderOptions(entryDialogConfig: DocumentWindowConfig): Promise<void> {
    const headerData = entryDialogConfig.headerData ?? {};
    const jobs: Array<() => Promise<void>> = [];

    for (const section of entryDialogConfig.headerSections ?? []) {
      for (const field of section.fields) {
        const optionsKey = this.toText(field.optionsDataKey).trim();
        const endpoints = this.resolveApiEndpoints(field.api ?? field.optionsEndpoints);
        if (!optionsKey.length || !endpoints.length) {
          continue;
        }

        jobs.push(() =>
          firstValueFrom(this.masterData.loadFirstAvailableList(endpoints))
            .then((records) => {
              headerData[optionsKey] = records;
            })
            .catch(() => {
              headerData[optionsKey] = [];
            }),
        );
      }
    }

    await this.runJobsInBatches(jobs, 3);
    entryDialogConfig.headerData = headerData;
  }

  private async hydrateLineEndpointOptions(entryDialogConfig: DocumentWindowConfig): Promise<void> {
    const rows = entryDialogConfig.lineRows ?? [];
    const jobs: Array<() => Promise<void>> = [];

    for (const column of entryDialogConfig.lineColumns ?? []) {
      const field = this.toText(column.field ?? column.id).trim();
      const optionsKey = this.toText(
        column.optionsDataKey ?? (field ? `__options_${field}` : ''),
      ).trim();
      const endpoints = this.resolveApiEndpoints(column.api ?? column.optionsEndpoints);
      if (!field.length || !optionsKey.length || !endpoints.length) {
        continue;
      }

      jobs.push(() =>
        firstValueFrom(this.masterData.loadFirstAvailableList(endpoints))
          .then((records) => {
            const options = this.masterData.toSelectOptions(
              records,
              this.resolveConfiguredFields(column.valueField),
              this.resolveConfiguredFields(column.labelField),
            );
            rows.forEach((row) => {
              row[optionsKey] = options;
            });
          })
          .catch(() => {
            rows.forEach((row) => {
              row[optionsKey] = [];
            });
          }),
      );
    }

    await this.runJobsInBatches(jobs, 3);
  }

  private async runJobsInBatches(jobs: Array<() => Promise<void>>, batchSize: number): Promise<void> {
    await this.optionsResolver.runJobsInBatches(jobs, batchSize);
  }

  private async hydrateLineMasterOptions(
    module: RunModalConfigModule,
    entryDialogConfig: DocumentWindowConfig,
  ): Promise<Partial<RunModalBinding>> {
    const lineConfig = this.pickObject(module, 'LineConfig');
    const endpointMap = this.buildLineTypeMasterEndpointMap(entryDialogConfig);
    if (!Object.keys(endpointMap).length) {
      return {};
    }

    let masters: Record<string, Record<string, unknown>[]>;
    try {
      masters = await firstValueFrom(this.masterData.loadMasterLists(endpointMap));
    } catch {
      masters = {};
    }

    const registry = this.buildLineMasterRegistry(masters, entryDialogConfig);
    const optionFieldMap = this.buildLineOptionFieldMap(entryDialogConfig, masters);
    const numberOptionFieldKey = this.resolveLineNumberOptionFieldKey(entryDialogConfig);
    for (const row of entryDialogConfig.lineRows ?? []) {
      this.assignLineRowOptions(row, entryDialogConfig, registry, optionFieldMap, numberOptionFieldKey);
    }

    return {
      lineMasterRegistry: registry,
      lineOptionFieldMap: optionFieldMap,
      lineNumberOptionFieldKey: numberOptionFieldKey,
    };
  }

  private buildLineMasterRegistry(
    masters: Record<string, Record<string, unknown>[]>,
    entryDialogConfig?: DocumentWindowConfig,
  ): LineMasterRegistry {
    return this.optionsResolver.buildLineMasterRegistry(masters, entryDialogConfig);
  }

  private buildEndpointMap(source: Record<string, unknown>): Record<string, string[]> {
    const endpointMap: Record<string, string[]> = {};
    for (const [key, value] of Object.entries(source)) {
      if (Array.isArray(value)) {
        endpointMap[key] = value
          .map((endpoint) => this.toText(endpoint).trim())
          .filter((endpoint) => endpoint.length > 0);
      }
    }

    return endpointMap;
  }

  private resolveApiEndpoints(source: unknown): string[] {
    return this.valueMapper.resolveApiEndpoints(source);
  }

  private buildLineTypeMasterEndpointMap(
    entryDialogConfig: DocumentWindowConfig,
  ): Record<string, string[]> {
    return this.optionsResolver.buildLineTypeMasterEndpointMap(entryDialogConfig);
  }

  private buildDynamicLineMasterRegistry(
    masters: Record<string, Record<string, unknown>[]>,
    entryDialogConfig: DocumentWindowConfig | undefined,
  ): LineMasterRegistry | undefined {
    return this.optionsResolver.buildDynamicLineMasterRegistry(masters, entryDialogConfig);
  }

  private buildLineOptionFieldMap(
    entryDialogConfig: DocumentWindowConfig,
    masters: Record<string, Record<string, unknown>[]>,
  ): Record<string, Array<{ label: string; value: unknown }>> {
    return this.optionsResolver.buildLineOptionFieldMap(entryDialogConfig, masters);
  }

  private buildConfiguredOptions(
    records: unknown,
    column?: { valueField?: string | string[]; labelField?: string | string[] },
  ): Array<{ label: string; value: unknown }> {
    return this.optionsResolver.buildConfiguredOptions(records, column);
  }

  private assignLineRowOptions(
    row: Record<string, unknown>,
    entryDialogConfig: DocumentWindowConfig,
    registry: LineMasterRegistry,
    optionFieldMap: Record<string, Array<{ label: string; value: unknown }>>,
    numberOptionFieldKey: string,
  ): void {
    const typeField = this.resolveLineTypeField(entryDialogConfig);

    if (!typeField && !numberOptionFieldKey) {
      for (const [field, options] of Object.entries(optionFieldMap)) {
        row[field] = options;
      }
      return;
    }

    const type = typeField ? this.lineMasters.resolveType(row[typeField], registry) : registry.emptyType;
    this.lineMasters.assignTypeOptions(row, type, registry, optionFieldMap, numberOptionFieldKey);
  }

  private resolveLineNumberOptionFieldKey(entryDialogConfig: DocumentWindowConfig): string {
    return this.optionsResolver.resolveLineNumberOptionFieldKey(entryDialogConfig);
  }

  private resolveLineTypeColumn(entryDialogConfig: DocumentWindowConfig): LineColumnConfig | undefined {
    return this.optionsResolver.resolveLineTypeColumn(entryDialogConfig);
  }

  private resolveLineTypeField(entryDialogConfig: DocumentWindowConfig): string {
    return this.optionsResolver.resolveLineTypeField(entryDialogConfig);
  }

  private resolveLineMasterValueColumn(entryDialogConfig: DocumentWindowConfig): LineColumnConfig | undefined {
    return this.optionsResolver.resolveLineMasterValueColumn(entryDialogConfig);
  }

  private mergeHeaderFromFirstRecord(
    record: Record<string, unknown>,
    entryDialogConfig: DocumentWindowConfig,
  ): void {
    const headerData = entryDialogConfig.headerData ?? {};
    const sections = entryDialogConfig.headerSections ?? [];
    for (const key of ['systemId', 'SystemId', 'id', 'Id']) {
      const value = this.readFieldValue(record, key);
      if (value !== null && value !== undefined && value !== '') {
        headerData[key] = value;
      }
    }

    for (const section of sections) {
      for (const field of section.fields) {
        const key = this.toText(field.key).trim();
        if (!key) {
          continue;
        }

        const value = this.readFieldValue(record, key);
        if (value !== null && value !== undefined && value !== '') {
          headerData[key] = value;
        }
      }
    }

    entryDialogConfig.headerData = headerData;
  }

  private readFieldValue(record: Record<string, unknown>, field: string): unknown {
    if (field in record) {
      return record[field];
    }

    const lower = field.toLowerCase();
    const matched = Object.keys(record).find((key) => key.toLowerCase() === lower);
    if (matched) {
      return record[matched];
    }

    const normalizedField = lower.replace(/[^a-z0-9]/g, '');
    if (normalizedField.length >= 3) {
      const suffixMatches = Object.keys(record).filter((key) =>
        key.toLowerCase().replace(/[^a-z0-9]/g, '').endsWith(normalizedField),
      );

      if (suffixMatches.length === 1) {
        return record[suffixMatches[0]];
      }
    }

    return '';
  }

  private async saveFromAutosave(
    popupId: string,
    binding: RunModalBinding,
    entryDialogConfig: DocumentWindowConfig,
    payload: unknown,
  ): Promise<void> {
    if (!this.isRecord(payload)) {
      return;
    }

    try {
      if (this.isRecord(payload['row'])) {
        await this.saveLine(popupId, binding, entryDialogConfig, payload['row'], payload, true, true);
        return;
      }

      if (typeof payload['fieldKey'] === 'string') {
        await this.saveHeaderField(popupId, binding, entryDialogConfig, payload, true, true);
      }
    } catch (error: unknown) {
      this.setErrorStatus(entryDialogConfig, 'Save failed', error, 'Unable to save changes.');
    }
  }

  private async saveHeaderField(
    popupId: string,
    binding: RunModalBinding,
    entryDialogConfig: DocumentWindowConfig,
    changePayload: Record<string, unknown>,
    showProgress = true,
    autosave = false,
  ): Promise<void> {
    const dataSource = this.resolveHeaderSaveDataSource(binding);
    const headerData = entryDialogConfig.headerData;
    if (!dataSource?.endpoint || !headerData) {
      return;
    }

    if (dataSource.supportsUpdate === false) {
      return;
    }

    const fieldKey = this.toText(changePayload['fieldKey']).trim();
    if (!fieldKey.length || !(fieldKey in headerData)) {
      return;
    }

    const id = this.entryRecord.resolvePersistedRecordId(headerData, dataSource);
    if (id === null || id === undefined || id === '') {
      return;
    }

    const payload: Record<string, unknown> = {
      [fieldKey]: headerData[fieldKey],
    };

    const scope = this.buildMutationScope(popupId);
    const shouldBlock = !autosave;
    if (shouldBlock) {
      this.runModalLoading.begin(scope, autosave ? 'Autosaving header...' : 'Saving header...');
    }

    try {
      const updated = await firstValueFrom(this.dataSource.update(dataSource, id, payload));
      this.mergeRecord(headerData, updated);
      this.recalculateLineTotals(binding.module, entryDialogConfig);
      if (showProgress) {
        entryDialogConfig.statusMessage = {
          tone: 'success',
          title: 'Saved',
          message: autosave ? 'Header autosaved.' : 'Header saved.',
        };
      }
    } catch (error: unknown) {
      this.setErrorStatus(entryDialogConfig, 'Save failed', error, 'Unable to save changes.');
    } finally {
      if (shouldBlock) {
        this.runModalLoading.end(scope);
      }
    }
  }

  private async saveHeader(
    popupId: string,
    binding: RunModalBinding,
    entryDialogConfig: DocumentWindowConfig,
  ): Promise<void> {
    const scope = this.buildMutationScope(popupId);
    this.runModalLoading.begin(scope, 'Saving changes...');

    try {
    if (binding.dataSource?.navigation && binding.dataSource.endpoint) {
      await this.saveRelationHeader(binding, entryDialogConfig);
      return;
    }

    const dataSource = this.resolveHeaderSaveDataSource(binding);
    const headerData = entryDialogConfig.headerData;
    if (!dataSource?.endpoint || !headerData) {
      return;
    }

    if (dataSource.supportsUpdate === false) {
      return;
    }

    try {
      const payload = this.buildHeaderPayload(binding, entryDialogConfig);
      await this.createOrUpdateRecord(dataSource, headerData, payload);
      this.recalculateLineTotals(binding.module, entryDialogConfig);
      entryDialogConfig.statusMessage = {
        tone: 'success',
        title: 'Saved',
        message: 'Changes saved.',
      };
    } catch (error: unknown) {
      this.setErrorStatus(entryDialogConfig, 'Save failed', error, 'Unable to save changes.');
    }
    } finally {
      this.runModalLoading.end(scope);
    }
  }

  private async saveLine(
    popupId: string,
    binding: RunModalBinding,
    entryDialogConfig: DocumentWindowConfig,
    row: Record<string, unknown>,
    changePayload?: unknown,
    showProgress = true,
    autosave = false,
  ): Promise<void> {
    const dataSource = this.resolveLineSaveDataSource(
      binding,
      entryDialogConfig.headerData ?? undefined,
    );
    if (!dataSource?.endpoint) {
      entryDialogConfig.statusMessage = {
        tone: 'error',
        title: 'Save failed',
        message: 'Line datasource is not ready for save.',
      };
      return;
    }

    const scope = this.buildMutationScope(popupId);
    const shouldBlock = !autosave;
    if (shouldBlock) {
      this.runModalLoading.begin(scope, autosave ? 'Autosaving line...' : 'Saving line...');
    }

    try {
      const payload = this.buildLineSavePayload(
        binding,
        row,
        entryDialogConfig,
        dataSource,
        changePayload,
      );
      if (!Object.keys(payload).length) {
        entryDialogConfig.statusMessage = undefined;
        return;
      }

      await this.createOrUpdateRecord(dataSource, row, payload);
      this.recalculateLineTotals(binding.module, entryDialogConfig);
      if (showProgress) {
        entryDialogConfig.statusMessage = {
          tone: 'success',
          title: 'Saved',
          message: autosave ? 'Line autosaved.' : 'Line saved.',
        };
      }
    } catch (error: unknown) {
      this.setErrorStatus(entryDialogConfig, 'Save failed', error, 'Unable to save line.');
    } finally {
      if (shouldBlock) {
        this.runModalLoading.end(scope);
      }
    }
  }

  private async deleteLines(
    popupId: string,
    binding: RunModalBinding,
    entryDialogConfig: DocumentWindowConfig,
    payload: unknown,
  ): Promise<void> {
    const dataSource = this.resolveLineSaveDataSource(
      binding,
      entryDialogConfig.headerData ?? undefined,
    );
    if (!dataSource?.endpoint) {
      entryDialogConfig.statusMessage = {
        tone: 'error',
        title: 'Delete failed',
        message: 'Line datasource is not ready for delete.',
      };
      return;
    }

    const targets: Record<string, unknown>[] = [];
    if (
      this.isRecord(payload) &&
      Array.isArray(payload['selectedIndexes']) &&
      entryDialogConfig.lineRows?.length
    ) {
      const indexes = payload['selectedIndexes']
        .map((value) => Number(value))
        .filter((value) => Number.isInteger(value) && value >= 0);

      for (const index of indexes) {
        const row = entryDialogConfig.lineRows[index];
        if (row) {
          targets.push(row);
        }
      }
    }

    if (!targets.length && this.isRecord(payload) && Array.isArray(payload['selectedRows'])) {
      targets.push(
        ...payload['selectedRows'].filter((item): item is Record<string, unknown> =>
          this.isRecord(item),
        ),
      );
    }

    if (!targets.length && this.isRecord(payload) && this.isRecord(payload['activeRow'])) {
      targets.push(payload['activeRow']);
    }

    if (!targets.length && entryDialogConfig.lineRows?.length) {
      targets.push(entryDialogConfig.lineRows[entryDialogConfig.lineRows.length - 1]);
    }

    if (!targets.length) {
      return;
    }

    const confirmed = await this.confirmation.confirmIntent({
      intent: 'delete',
      count: targets.length,
      entityLabel: 'line',
    });

    if (!confirmed) {
      return;
    }

    const scope = this.buildMutationScope(popupId);
    this.runModalLoading.begin(scope, 'Deleting selected line(s)...');

    try {
      for (const row of targets) {
        const id = this.entryRecord.resolvePersistedRecordId(row, dataSource);
        if (id !== null && id !== undefined && id !== '') {
          await firstValueFrom(this.dataSource.delete(dataSource, id));
        }
      }

      if (entryDialogConfig.lineRows) {
        entryDialogConfig.lineRows = entryDialogConfig.lineRows.filter(
          (row) => !targets.includes(row),
        );
      }
      this.recalculateLineTotals(binding.module, entryDialogConfig);

      entryDialogConfig.statusMessage = {
        tone: 'success',
        title: 'Deleted',
        message: 'Line deleted.',
      };
    } catch (error: unknown) {
      this.setErrorStatus(
        entryDialogConfig,
        GENERIC_MESSAGES.deleteFailedTitle,
        error,
        GENERIC_MESSAGES.lineDeleteFailedMessage,
      );
    } finally {
      this.runModalLoading.end(scope);
    }
  }

  private async deleteHeader(
    popupId: string,
    binding: RunModalBinding,
    entryDialogConfig: DocumentWindowConfig,
  ): Promise<void> {
    const scope = this.buildMutationScope(popupId);
    this.runModalLoading.begin(scope, 'Deleting record...');

    try {
    if (binding.dataSource?.navigation && binding.dataSource.endpoint) {
      await this.deleteRelationHeader(binding, entryDialogConfig);
      return;
    }

    const dataSource = this.resolveHeaderSaveDataSource(binding);
    const headerData = entryDialogConfig.headerData;
    if (!dataSource?.endpoint || !headerData) {
      return;
    }

    const id = this.entryRecord.resolvePersistedRecordId(headerData, dataSource);
    if (id === null || id === undefined || id === '') {
      return;
    }

    const confirmed = await this.confirmation.confirmIntent({
      intent: 'delete',
      count: 1,
      entityLabel: this.resolvePageEntityLabel(binding.pageId),
    });

    if (!confirmed) {
      return;
    }

    try {
      await firstValueFrom(this.dataSource.delete(dataSource, id));
      entryDialogConfig.statusMessage = {
        tone: 'success',
        title: 'Deleted',
        message: 'Record deleted.',
      };
    } catch (error: unknown) {
      this.setErrorStatus(
        entryDialogConfig,
        GENERIC_MESSAGES.deleteFailedTitle,
        error,
        GENERIC_MESSAGES.deleteFailedMessage,
      );
    }
    } finally {
      this.runModalLoading.end(scope);
    }
  }

  private resolvePageEntityLabel(pageId: string): string {
    const normalized = pageId.trim();
    if (!normalized.length) {
      return 'record';
    }

    return this.toTitleCase(normalized);
  }

  private async createOrUpdateRecord(
    dataSource: DataSourceConfig,
    source: Record<string, unknown>,
    payload: Record<string, unknown>,
  ): Promise<void> {
    const id = this.entryRecord.resolvePersistedRecordId(source, dataSource);
    if (id !== null && id !== undefined && id !== '' && dataSource.supportsUpdate !== false) {
      const updated = await firstValueFrom(this.dataSource.update(dataSource, id, payload));
      this.mergeRecord(source, updated);
      return;
    }

    const created = await firstValueFrom(this.dataSource.create(dataSource, this.stripTechnicalIdentity(payload)));
    this.mergeRecord(source, created);
  }

  private resolveHeaderSaveDataSource(binding: RunModalBinding): DataSourceConfig | undefined {
    return binding.headerDataSource ?? binding.dataSource;
  }

  private async saveRelationHeader(
    binding: RunModalBinding,
    entryDialogConfig: DocumentWindowConfig,
  ): Promise<void> {
    const relationDataSource = binding.dataSource;
    const baseDataSource = binding.headerDataSource ?? relationDataSource;
    const headerData = entryDialogConfig.headerData;
    if (!relationDataSource?.endpoint || !baseDataSource?.endpoint || !headerData) {
      return;
    }

    try {
      const payload = this.buildHeaderPayload(binding, entryDialogConfig);

      const existing = await this.loadFirstRelationRecord(relationDataSource);
      const existingId = existing
        ? this.entryRecord.resolvePersistedRecordId(existing, baseDataSource)
        : undefined;
      if (existingId !== null && existingId !== undefined && existingId !== '') {
        await firstValueFrom(this.dataSource.delete(baseDataSource, existingId));
      }

      await firstValueFrom(this.dataSource.create(relationDataSource, payload));
      await this.refreshRelationEntry(relationDataSource, entryDialogConfig, binding.module);
      this.recalculateLineTotals(binding.module, entryDialogConfig);

      entryDialogConfig.statusMessage = {
        tone: 'success',
        title: 'Saved',
        message: 'Changes saved.',
      };
    } catch (error: unknown) {
      this.setErrorStatus(entryDialogConfig, 'Save failed', error, 'Unable to save changes.');
    }
  }

  private async deleteRelationHeader(
    binding: RunModalBinding,
    entryDialogConfig: DocumentWindowConfig,
  ): Promise<void> {
    const relationDataSource = binding.dataSource;
    const baseDataSource = binding.headerDataSource ?? relationDataSource;
    const headerData = entryDialogConfig.headerData;
    if (!relationDataSource?.endpoint || !baseDataSource?.endpoint || !headerData) {
      return;
    }

    const existing = await this.loadFirstRelationRecord(relationDataSource);
    const id =
      this.entryRecord.resolvePersistedRecordId(headerData, baseDataSource) ??
      (existing ? this.entryRecord.resolvePersistedRecordId(existing, baseDataSource) : undefined);
    if (id === null || id === undefined || id === '') {
      entryDialogConfig.statusMessage = {
        tone: 'success',
        title: 'Delete skipped',
        message: 'No persisted record found to delete.',
      };
      return;
    }

    const confirmed = await this.confirmation.confirmIntent({
      intent: 'delete',
      count: 1,
      entityLabel: this.resolvePageEntityLabel(binding.pageId),
    });

    if (!confirmed) {
      return;
    }

    try {
      await firstValueFrom(this.dataSource.delete(baseDataSource, id));
      this.clearRelationEntry(binding, entryDialogConfig);
      this.recalculateLineTotals(binding.module, entryDialogConfig);
      entryDialogConfig.statusMessage = {
        tone: 'success',
        title: 'Deleted',
        message: 'Record deleted.',
      };
    } catch (error: unknown) {
      this.setErrorStatus(
        entryDialogConfig,
        GENERIC_MESSAGES.deleteFailedTitle,
        error,
        GENERIC_MESSAGES.deleteFailedMessage,
      );
    }
  }

  private async loadFirstRelationRecord(
    dataSource: DataSourceConfig,
  ): Promise<Record<string, unknown> | undefined> {
    try {
      const response = await firstValueFrom(this.dataSource.loadList(dataSource, { top: 1 }));
      return this.toRecordList(response)[0];
    } catch {
      return undefined;
    }
  }

  private async refreshRelationEntry(
    dataSource: DataSourceConfig,
    entryDialogConfig: DocumentWindowConfig,
    module: RunModalConfigModule,
  ): Promise<void> {
    const response = await firstValueFrom(
      this.dataSource.loadList(dataSource, { top: this.resolveEntryHydrationTop(module, dataSource) }),
    );
    const records = this.toRecordList(response);
    entryDialogConfig.lineRows = this.mapRecordsToLineRows(records, entryDialogConfig);
    if (records.length) {
      this.mergeHeaderFromFirstRecord(records[0], entryDialogConfig);
    }
  }

  private clearRelationEntry(binding: RunModalBinding, entryDialogConfig: DocumentWindowConfig): void {
    const headerData = entryDialogConfig.headerData;
    if (headerData) {
      const keyFields = this.getConfiguredIdentityFields(binding);
      for (const field of keyFields) {
        if (field in headerData) {
          headerData[field] = '';
        }
      }
    }

    entryDialogConfig.lineRows = [];
  }

  private resolveLineSaveDataSource(
    binding: RunModalBinding,
    headerData?: Record<string, unknown>,
  ): DataSourceConfig | undefined {
    const baseDataSource = binding.lineDataSource ?? binding.dataSource;
    if (!baseDataSource?.endpoint?.trim()) {
      return undefined;
    }

    const relation = baseDataSource.navigation;
    if (!relation) {
      return baseDataSource;
    }

    const parentEndpoint = this.toText(relation.parentEndpoint).trim();
    const childCollection = this.toText(relation.childCollection).trim();
    const parentIdFields = (relation.parentIdFields ?? [])
      .map((field) => this.toText(field).trim())
      .filter((field) => field.length > 0);

    if (!parentEndpoint.length || !childCollection.length || !parentIdFields.length || !headerData) {
      return undefined;
    }

    const parentId = this.resolveRelationParentId(headerData, parentIdFields);
    if (!this.hasMeaningfulPayloadValue(parentId)) {
      return undefined;
    }

    return {
      ...baseDataSource,
      endpoint: `${parentEndpoint}(${this.toODataId(parentId)})/${childCollection}`,
    };
  }

  private buildHeaderPayload(
    binding: RunModalBinding,
    entryDialogConfig: DocumentWindowConfig,
  ): Record<string, unknown> {
    return this.payloadBuilder.buildHeaderPayload({
      headerData: entryDialogConfig.headerData,
      headerSections: entryDialogConfig.headerSections,
      dataSource: this.resolveHeaderSaveDataSource(binding),
    });
  }

  private buildLineSavePayload(
    binding: RunModalBinding,
    row: Record<string, unknown>,
    entryDialogConfig: DocumentWindowConfig,
    dataSource: DataSourceConfig,
    changePayload?: unknown,
  ): Record<string, unknown> {
    return this.payloadBuilder.buildLineSavePayload({
      binding: { module: binding.module },
      row,
      entryDialogConfig,
      dataSource,
      changePayload,
      pickObjectFromModule: (module, suffix) => this.pickObject(module, suffix),
      readFieldValue: (record, field) => this.readFieldValue(record, field),
      firstPresentValue: (values) => this.firstPresentValue(values),
    });
  }

  private buildLineUpdatePayload(
    row: Record<string, unknown>,
    dataSource: DataSourceConfig,
    changePayload?: unknown,
  ): Record<string, unknown> {
    return this.payloadBuilder.buildLineUpdatePayload({
      row,
      dataSource,
      changePayload,
      readFieldValue: (record, field) => this.readFieldValue(record, field),
    });
  }

  private buildLineCreatePayload(
    binding: RunModalBinding,
    row: Record<string, unknown>,
    entryDialogConfig: DocumentWindowConfig,
    dataSource: DataSourceConfig,
  ): Record<string, unknown> {
    return this.payloadBuilder.buildLineCreatePayload({
      binding: { module: binding.module },
      row,
      entryDialogConfig,
      dataSource,
      pickObjectFromModule: (module, suffix) => this.pickObject(module, suffix),
      firstPresentValue: (values) => this.firstPresentValue(values),
    });
  }

  private resolveChangedLineField(changePayload?: unknown): string {
    return this.payloadBuilder.resolveChangedLineField(changePayload);
  }

  private ensureLineParentFields(
    row: Record<string, unknown>,
    entryDialogConfig: DocumentWindowConfig,
    dataSource: DataSourceConfig,
  ): void {
    this.payloadBuilder.ensureLineParentFields({
      row,
      entryDialogConfig,
      dataSource,
      firstPresentValue: (values) => this.firstPresentValue(values),
    });
  }

  private ensureLineNo(
    binding: RunModalBinding,
    row: Record<string, unknown>,
    entryDialogConfig: DocumentWindowConfig,
  ): void {
    this.payloadBuilder.ensureLineNo({
      binding: { module: binding.module },
      row,
      entryDialogConfig,
      pickObjectFromModule: (module, suffix) => this.pickObject(module, suffix),
    });
  }

  private resolveLineKeyField(binding: RunModalBinding): string {
    return this.payloadBuilder.resolveLineKeyField({
      binding: { module: binding.module },
      pickObjectFromModule: (module, suffix) => this.pickObject(module, suffix),
    });
  }

  private isBlockedLineField(field: string, dataSource: DataSourceConfig): boolean {
    return this.payloadBuilder.isBlockedLineField(field, dataSource);
  }

  private hasPersistedRecordId(
    row: Record<string, unknown>,
    dataSource: DataSourceConfig,
  ): boolean {
    return this.payloadBuilder.hasPersistedRecordId(row, dataSource);
  }

  private hasMeaningfulPayloadValue(value: unknown): boolean {
    return this.payloadBuilder.hasMeaningfulPayloadValue(value);
  }

  private resolveNextLineNo(
    rows: Record<string, unknown>[],
    targetRow: Record<string, unknown>,
    lineKeyField: string,
  ): number {
    return this.payloadBuilder.resolveNextLineNo({
      rows,
      targetRow,
      lineKeyField,
    });
  }

  private resolveRecordId(source: Record<string, unknown>, config: DataSourceConfig): unknown {
    return this.entryRecord.resolveRecordId(source, config) ?? undefined;
  }

  private mergeRecord(target: Record<string, unknown>, response: unknown): void {
    if (!this.isRecord(response)) {
      return;
    }

    Object.assign(target, response);
  }

  private stripTechnicalIdentity(payload: Record<string, unknown>): Record<string, unknown> {
    const sanitized = { ...payload };
    delete sanitized['systemId'];
    delete sanitized['SystemId'];
    return sanitized;
  }

  private applyHeaderChange(entryDialogConfig: DocumentWindowConfig, payload: unknown): void {
    if (!entryDialogConfig.headerData || !this.isRecord(payload)) {
      return;
    }

    const fieldKey = this.toText(payload['fieldKey']).trim();
    if (fieldKey.length) {
      entryDialogConfig.headerData[fieldKey] = payload['value'];
    }

    if (this.isRecord(payload['updates'])) {
      for (const [key, value] of Object.entries(payload['updates'])) {
        entryDialogConfig.headerData[key] = value;
      }
    }
  }

  private applyLineChange(
    binding: RunModalBinding,
    entryDialogConfig: DocumentWindowConfig,
    payload: unknown,
  ): void {
    if (!this.isRecord(payload)) {
      return;
    }

    const row = this.toRecord(payload['row']);
    const column = this.toRecord(payload['column']);
    if (!row || !column) {
      return;
    }

    const field = this.toText(column['field'] ?? column['id']).trim();
    if (!field) {
      return;
    }

    row[field] = payload['value'];

    if (field === this.resolveLineTypeField(entryDialogConfig) && binding.lineMasterRegistry) {
      this.assignLineRowOptions(
        row,
        entryDialogConfig,
        binding.lineMasterRegistry,
        binding.lineOptionFieldMap ?? {},
        binding.lineNumberOptionFieldKey ?? '',
      );
    }

    this.applyLineMasterSelection(binding, entryDialogConfig, row, field);
    this.recalculateLineTotals(binding.module, entryDialogConfig);
  }

  private applyLineMasterSelection(
    binding: RunModalBinding,
    entryDialogConfig: DocumentWindowConfig,
    row: Record<string, unknown>,
    field: string,
  ): void {
    void binding;
    void entryDialogConfig;
    void row;
    void field;
  }

  private async insertAndSaveLine(
    binding: RunModalBinding,
    entryDialogConfig: DocumentWindowConfig,
    payload: unknown,
  ): Promise<void> {
    const insertedRow = this.insertLine(binding, entryDialogConfig, payload);
    if (!insertedRow) {
      return;
    }
  }

  private insertLine(
    binding: RunModalBinding,
    entryDialogConfig: DocumentWindowConfig,
    payload: unknown,
  ): Record<string, unknown> | undefined {
    const rows = entryDialogConfig.lineRows ?? [];
    const nextRow = this.buildEmptyLineRow(
      entryDialogConfig.lineColumns ?? [],
      entryDialogConfig.headerData,
    );
    this.copyLineOptionBuckets(nextRow, rows[0]);
    if (binding.lineMasterRegistry) {
      this.assignLineRowOptions(
        nextRow,
        entryDialogConfig,
        binding.lineMasterRegistry,
        binding.lineOptionFieldMap ?? {},
        binding.lineNumberOptionFieldKey ?? '',
      );
    }
    const insertIndex = this.resolveInsertIndex(payload, rows.length);
    rows.splice(insertIndex, 0, nextRow);
    entryDialogConfig.lineRows = rows;
    this.recalculateLineTotals(binding.module, entryDialogConfig);
    entryDialogConfig.statusMessage = {
      tone: 'success',
      title: 'Line inserted',
      message: 'A new line is ready.',
    };

    return nextRow;
  }

  private findLineColumn(
    entryDialogConfig: DocumentWindowConfig,
    field: string,
  ): LineColumnConfig | undefined {
    return (entryDialogConfig.lineColumns ?? []).find(
      (column) => this.toText(column.field ?? column.id).trim() === field,
    );
  }

  private resolveInsertIndex(payload: unknown, rowCount: number): number {
    if (!this.isRecord(payload)) {
      return rowCount;
    }

    if (Array.isArray(payload['selectedIndexes'])) {
      const firstIndex = payload['selectedIndexes']
        .map((value) => Number(value))
        .find((value) => Number.isInteger(value) && value >= 0 && value < rowCount);
      if (firstIndex !== undefined) {
        return firstIndex + 1;
      }
    }

    return rowCount;
  }

  private buildEmptyLineRow(
    columns: LineColumnConfig[],
    headerData?: Record<string, unknown>,
  ): Record<string, unknown> {
    const row: Record<string, unknown> = {};

    for (const column of columns) {
      const field = this.toText(column.field ?? column.id).trim();
      if (!field) {
        continue;
      }

      const valueType = this.toText(column.valueType).trim().toLowerCase();
      if (valueType === 'number') {
        row[field] = 0;
        continue;
      }

      if (valueType === 'boolean') {
        row[field] = false;
        continue;
      }

      row[field] = '';
    }

    if (headerData && 'sourceLineNo' in row) {
      const headerLineNo = headerData['sourceLineNo'];
      if (
        headerLineNo !== null &&
        headerLineNo !== undefined &&
        String(headerLineNo).trim().length > 0
      ) {
        row['sourceLineNo'] = headerLineNo;
      }
    }

    return row;
  }

  private copyLineOptionBuckets(
    target: Record<string, unknown>,
    source: Record<string, unknown> | undefined,
  ): void {
    if (!source) {
      return;
    }

    for (const [key, value] of Object.entries(source)) {
      if (key.startsWith('__options_') && Array.isArray(value)) {
        target[key] = value;
      }
    }
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return this.valueMapper.isRecord(value);
  }

  private setErrorStatus(
    entryDialogConfig: DocumentWindowConfig,
    title: string,
    error: unknown,
    fallbackMessage: string,
  ): void {
    entryDialogConfig.statusMessage = {
      tone: 'error',
      title,
      message: this.getErrorMessage(error, fallbackMessage),
    };
  }

  private setInteractionLock(entryDialogConfig: DocumentWindowConfig, locked: boolean): void {
    this.bindingState.setInteractionLock(entryDialogConfig, locked);
  }

  private firstPresentValue(values: unknown[]): unknown {
    return values.find(
      (value) => value !== null && value !== undefined && String(value).trim().length > 0,
    );
  }

  private applyFixedParentFields(
    payload: Record<string, unknown>,
    fixedFields?: Record<string, unknown>,
  ): void {
    this.payloadBuilder.applyFixedParentFields({
      payload,
      fixedFields,
    });
  }

  private toODataId(value: unknown): string {
    return this.valueMapper.toODataId(value);
  }

  private toODataFilterLiteral(value: unknown): string {
    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }

    return `'${this.toText(value).trim().replace(/'/g, "''")}'`;
  }

  private buildHeaderData(
    context: RunModalContext,
    headerSections: unknown[],
  ): Record<string, unknown> {
    return this.configAssembler.buildHeaderData({ context, headerSections });
  }

  private resolveRelationParentId(
    headerData: Record<string, unknown>,
    parentIdFields: string[],
  ): unknown {
    return this.payloadBuilder.resolveRelationParentId({
      headerData,
      parentIdFields,
      readFieldValue: (record, field) => this.readFieldValue(record, field),
    });
  }

  private resolveContextHeaderValue(
    key: string,
    headerData: Record<string, unknown> | undefined,
    activeLine: Record<string, unknown> | undefined,
  ): unknown {
    const direct = this.firstPresentValue([activeLine?.[key], headerData?.[key]]);
    if (direct !== undefined) {
      return direct;
    }

    return undefined;
  }

  private buildLineRows(context: RunModalContext): Record<string, unknown>[] {
    return this.configAssembler.buildLineRows({ context });
  }

  private buildLineTotals(source: unknown): DocumentWindowConfig['lineTotals'] {
    return this.configAssembler.buildLineTotals({ source });
  }

  private recalculateLineTotals(
    module: RunModalConfigModule,
    entryDialogConfig: DocumentWindowConfig,
  ): void {
    const lineConfig = this.pickObject(module, 'LineConfig');
    const config = (this.toRecord(lineConfig?.['totalsCalculation']) ??
      this.pickObject(module, 'LineTotalsCalculation')) as LineTotalsCalculationConfig | undefined;
    if (!config?.defaults || !config.totals) {
      return;
    }

    entryDialogConfig.lineTotals = this.lineCalculation.calculateLineTotals(
      entryDialogConfig.lineRows ?? [],
      config,
      entryDialogConfig.headerData,
    );
  }

  private pickDialogTitle(module: RunModalConfigModule): string {
    return this.configAssembler.pickDialogTitle({ module });
  }

  private resolvePageLabel(module: RunModalConfigModule, pageId: string, title: string): string {
    return this.configAssembler.resolvePageLabel({
      module,
      pageId,
      title,
    });
  }

  private pickArray(module: RunModalConfigModule, suffix: string): unknown[] {
    return this.configAssembler.pickArray({
      module,
      suffix,
    });
  }

  private pickObject(
    module: RunModalConfigModule,
    suffix: string,
  ): Record<string, unknown> | undefined {
    return this.configAssembler.pickObject({
      module,
      suffix,
    });
  }

  private pickListPageConfig(module: RunModalConfigModule): ListPageConfig | undefined {
    return this.configAssembler.pickListPageConfig({ module });
  }

  private resolveEntryHydrationTop(module: RunModalConfigModule, dataSource: DataSourceConfig): number {
    return this.configAssembler.resolveEntryHydrationTop({
      module,
      dataSource,
    });
  }

  private isWorksheetPage(module: RunModalConfigModule): boolean {
    return this.configAssembler.isWorksheetPage({ module });
  }

  private resolveOpenTarget(
    module: RunModalConfigModule,
    pageId: string,
    requestedTarget?: 'entry' | 'list',
  ): 'entry' | 'list' {
    const pageType = this.resolvePageType(module, pageId);
    if (pageType === 'setup' || pageType === 'worksheet') {
      return 'entry';
    }

    if (pageType === 'list' || pageType === 'card' || pageType === 'document') {
      return requestedTarget ?? 'list';
    }

    return requestedTarget ?? 'entry';
  }

  private resolvePageType(module: RunModalConfigModule, pageId: string): string {
    return this.configAssembler.resolvePageType({
      module,
      pageId,
    });
  }

  private pickNestedArray(
    source: Record<string, unknown> | undefined,
    key: string,
  ): unknown[] | undefined {
    return this.configAssembler.pickNestedArray({
      source,
      key,
    });
  }

  private resolveConfiguredFields(source: string | string[] | undefined): string[] {
    return this.valueMapper.resolveConfiguredFields(source);
  }

  private getConfiguredIdentityFields(binding: RunModalBinding): string[] {
    const fields = new Set<string>();
    const headerSource = this.resolveHeaderSaveDataSource(binding);
    const lineSource = binding.lineDataSource ?? binding.dataSource;
    for (const field of [headerSource?.keyField, lineSource?.keyField]) {
      const normalized = this.toText(field).trim();
      if (normalized.length) {
        fields.add(normalized);
      }
    }

    return [...fields];
  }

  private toRecord(value: unknown): Record<string, unknown> | undefined {
    if (typeof value === 'object' && value !== null) {
      return value as Record<string, unknown>;
    }

    return undefined;
  }

  private toText(value: unknown): string {
    return this.valueMapper.toText(value);
  }

  private toNumber(value: unknown): number {
    return this.valueMapper.toNumber(value) ?? 0;
  }

  private getErrorMessage(error: unknown, fallback: string): string {
    return this.apiError.toMessage(error, fallback);
  }

  private toTitleCase(value: string): string {
    const normalized = value.replace(/[-_]+/g, ' ').trim();
    if (!normalized.length) {
      return '';
    }

    return normalized
      .split(/\s+/)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }
}

