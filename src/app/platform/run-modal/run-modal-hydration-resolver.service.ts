import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { timeout } from 'rxjs/operators';
import { DataSourceConfig } from '../models/data-source-config.model';
import { RUNTIME_TIMEOUT_POLICY } from '../data/runtime-timeout-policy.token';
import { RuntimeValueMapperService } from '../data/runtime-value-mapper.service';
import { EntryHydrationOrchestratorService } from '../data/entry-hydration-orchestrator.service';
import { EntryRecordService } from '../data/entry-record.service';
import { EntryResponseNormalizerService } from '../data/entry-response-normalizer.service';
import { DataSourceService } from '../data/data-source.service';
import { RunModalConfigAssemblerService } from './run-modal-config-assembler.service';
import { RunModalConfigModule, RunModalContext } from './run-modal-config.token';
import { DocumentWindowConfig } from '../models/document-window-config.model';

@Injectable({
  providedIn: 'root',
})
export class RunModalHydrationResolverService {
  private readonly timeoutPolicy = inject(RUNTIME_TIMEOUT_POLICY);
  private readonly valueMapper = inject(RuntimeValueMapperService);

  constructor(
    private readonly dataSource: DataSourceService,
    private readonly entryHydration: EntryHydrationOrchestratorService,
    private readonly entryRecord: EntryRecordService,
    private readonly entryResponseNormalizer: EntryResponseNormalizerService,
    private readonly configAssembler: RunModalConfigAssemblerService,
  ) {}

  async loadFreshHeaderData(
    binding: { headerDataSource?: DataSourceConfig; dataSource?: DataSourceConfig },
    row: unknown,
  ): Promise<Record<string, unknown>> {
    const headerData = this.toRecord(row) ?? {};
    const dataSource = binding.headerDataSource ?? binding.dataSource;
    if (!dataSource?.endpoint?.trim()) {
      return headerData;
    }

    const recordId = this.entryRecord.resolvePersistedRecordId(headerData, dataSource);
    if (recordId === null || recordId === undefined || String(recordId).trim().length === 0) {
      return headerData;
    }

    try {
      const response = await firstValueFrom(this.dataSource.loadById(dataSource, recordId));
      return this.entryResponseNormalizer.normalizeSingleRecordResponse(response, headerData);
    } catch {
      return headerData;
    }
  }

  resolveContextRecordId(context: RunModalContext, dataSource: DataSourceConfig): unknown {
    const providedHeader = this.toRecord(context['headerData']);
    if (providedHeader) {
      const persisted = this.entryRecord.resolvePersistedRecordId(providedHeader, dataSource);
      if (persisted !== null && persisted !== undefined && String(persisted).trim().length > 0) {
        return persisted;
      }
    }

    const directCandidates = ['recordId', 'systemId', 'id', 'companyId', 'CompanyId'];
    for (const key of directCandidates) {
      const value = context[key];
      if (value !== null && value !== undefined && String(value).trim().length > 0) {
        return value;
      }
    }

    return undefined;
  }

  resolveNavigationDataSource(
    module: RunModalConfigModule,
    context: RunModalContext,
  ): DataSourceConfig | undefined {
    const baseDataSource = this.pickDataSource(module);
    const relation = baseDataSource?.navigation;
    if (!baseDataSource?.endpoint?.trim()) {
      return undefined;
    }

    if (!relation) {
      return baseDataSource;
    }

    const activeLine = this.toRecord(context['activeLine']);
    const idCandidates = relation.parentIdFields ?? [];
    const activeLineParentId = idCandidates
      .map((field) => activeLine?.[field])
      .find((value) => value !== null && value !== undefined && String(value).trim().length > 0);
    const contextRecordId = this.resolveContextRecordId(context, baseDataSource);
    const parentId =
      activeLineParentId !== undefined && activeLineParentId !== null && String(activeLineParentId).trim().length > 0
        ? activeLineParentId
        : contextRecordId;

    if (parentId === null || parentId === undefined || String(parentId).trim().length === 0) {
      return baseDataSource;
    }

    return {
      ...baseDataSource,
      endpoint: relation.style === 'rest'
        ? `${relation.parentEndpoint}/${encodeURIComponent(String(parentId))}/${relation.childCollection}`
        : `${relation.parentEndpoint}(${this.toODataId(parentId)})/${relation.childCollection}`,
    };
  }

  resolveContextualListDataSource(
    dataSource: DataSourceConfig | undefined,
    context: RunModalContext,
  ): DataSourceConfig | undefined {
    if (!dataSource) {
      return undefined;
    }

    const parentKeyField = this.toText(dataSource.parentKeyField).trim();
    if (!parentKeyField.length) {
      return dataSource;
    }

    const contextRecord = this.toRecord(context['headerData']) ?? this.toRecord(context['activeLine']);
    if (!contextRecord) {
      return dataSource;
    }

    const sourceFieldCandidates = [
      this.toText(dataSource.contextDocumentNoField).trim(),
      this.toText(dataSource.documentNoField).trim(),
      parentKeyField,
    ].filter((field) => field.length > 0);

    const parentValue = sourceFieldCandidates
      .map((field) => this.readFieldValue(contextRecord, field))
      .find((value) => value !== null && value !== undefined && String(value).trim().length > 0);

    if (parentValue === null || parentValue === undefined || String(parentValue).trim().length === 0) {
      return dataSource;
    }

    const contextFilter = `${parentKeyField} eq ${this.toODataFilterLiteral(parentValue)}`;
    return {
      ...dataSource,
      defaultFilter: dataSource.defaultFilter
        ? `(${dataSource.defaultFilter}) and (${contextFilter})`
        : contextFilter,
    };
  }

  async loadListRows(
    dataSource: DataSourceConfig,
    options: { top: number } = { top: dataSource.pageSize ?? 20 },
  ): Promise<Record<string, unknown>[]> {
    const response = await firstValueFrom(
      this.dataSource.loadList(dataSource, options).pipe(timeout(this.timeoutPolicy.requestTimeoutMs)),
    );
    return this.toRecordList(response);
  }

  async loadRelatedLineRows(
    module: RunModalConfigModule,
    headerData: Record<string, unknown>,
  ): Promise<Record<string, unknown>[]> {
    const lineDataSource = this.pickLineDataSource(module);
    if (!lineDataSource?.endpoint?.trim()) {
      return [];
    }

    return this.entryHydration.loadLineRowsForHeader(
      lineDataSource,
      headerData,
      {
        timeoutMs: this.timeoutPolicy.hydrationTimeoutMs,
        defaultTop: 200,
        allowWithoutParentKey: false,
      },
    );
  }

  async hydrateRelatedLines(params: {
    module: RunModalConfigModule;
    entryDialogConfig: DocumentWindowConfig;
    pickLineDataSource: (module: RunModalConfigModule) => DataSourceConfig | undefined;
    loadRelatedLineRows: (
      module: RunModalConfigModule,
      headerData: Record<string, unknown>,
    ) => Promise<Record<string, unknown>[]>;
    mapRecordsToLineRows: (
      records: Record<string, unknown>[],
      entryDialogConfig: DocumentWindowConfig,
    ) => Record<string, unknown>[];
  }): Promise<{ lineHydrateFailed: boolean; lineHydrateMessage?: string }> {
    if (!params.pickLineDataSource(params.module)) {
      return { lineHydrateFailed: false };
    }

    if (!params.entryDialogConfig.headerData) {
      return {
        lineHydrateFailed: true,
        lineHydrateMessage: 'Header data is missing for line loading. Retry to continue.',
      };
    }

    try {
      const records = await params.loadRelatedLineRows(params.module, params.entryDialogConfig.headerData);
      params.entryDialogConfig.lineRows = params.mapRecordsToLineRows(records, params.entryDialogConfig);
      return { lineHydrateFailed: false };
    } catch {
      params.entryDialogConfig.lineRows = [];
      return {
        lineHydrateFailed: true,
        lineHydrateMessage: 'Unable to load lines. Retry to continue.',
      };
    }
  }

  async hydrateFromApi(params: {
    module: RunModalConfigModule;
    entryDialogConfig: DocumentWindowConfig;
    context: RunModalContext;
    dataSource?: DataSourceConfig;
    resolveEntryHydrationTop: (module: RunModalConfigModule, dataSource: DataSourceConfig) => number;
    isWorksheetPage: (module: RunModalConfigModule) => boolean;
    mergeHeaderFromFirstRecord: (record: Record<string, unknown>, entryDialogConfig: DocumentWindowConfig) => void;
    mapRecordsToLineRows: (
      records: Record<string, unknown>[],
      entryDialogConfig: DocumentWindowConfig,
    ) => Record<string, unknown>[];
    hydrateRelatedLines: (
      module: RunModalConfigModule,
      entryDialogConfig: DocumentWindowConfig,
    ) => Promise<{ lineHydrateFailed: boolean; lineHydrateMessage?: string }>;
    pickLineDataSource: (module: RunModalConfigModule) => DataSourceConfig | undefined;
  }): Promise<{ lineHydrateFailed: boolean; lineHydrateMessage?: string }> {
    if (!params.dataSource?.endpoint?.trim()) {
      return { lineHydrateFailed: false };
    }

    const contextRecordId = this.resolveContextRecordId(params.context, params.dataSource);
    try {
      const listTop = params.resolveEntryHydrationTop(params.module, params.dataSource);
      const response = await firstValueFrom(
        this.dataSource
          .loadList(params.dataSource, { top: listTop })
          .pipe(timeout(this.timeoutPolicy.hydrationTimeoutMs)),
      );
      const records = this.entryHydration.extractRecords(response);
      if (!records.length) {
        if (params.isWorksheetPage(params.module)) {
          params.entryDialogConfig.lineRows = [];
        }

        if (contextRecordId !== undefined && contextRecordId !== null && String(contextRecordId).trim().length > 0) {
          try {
            const byIdRecord = await this.entryHydration.loadHeaderById(
              params.dataSource,
              contextRecordId,
              {},
              this.timeoutPolicy.hydrationTimeoutMs,
            );
            if (Object.keys(byIdRecord).length) {
              params.mergeHeaderFromFirstRecord(byIdRecord, params.entryDialogConfig);
            }
          } catch {
            // Keep popup rendering even when API load fails.
          }
        }
        return { lineHydrateFailed: false };
      }

      const headerRecord = this.entryHydration.pickHeaderRecord(records, contextRecordId, params.dataSource);
      params.mergeHeaderFromFirstRecord(headerRecord, params.entryDialogConfig);
      if (params.isWorksheetPage(params.module)) {
        params.entryDialogConfig.lineRows = params.mapRecordsToLineRows(records, params.entryDialogConfig);
        return { lineHydrateFailed: false };
      }

      return params.hydrateRelatedLines(params.module, params.entryDialogConfig);
    } catch {
      if (!params.pickLineDataSource(params.module)) {
        return { lineHydrateFailed: false };
      }

      return {
        lineHydrateFailed: true,
        lineHydrateMessage: 'Unable to load lines. Retry to continue.',
      };
    }
  }

  private pickDataSource(module: RunModalConfigModule): DataSourceConfig | undefined {
    return this.configAssembler.pickDataSource({ module });
  }

  private pickLineDataSource(module: RunModalConfigModule): DataSourceConfig | undefined {
    return this.configAssembler.pickLineDataSource({ module });
  }

  private toRecordList(response: unknown): Record<string, unknown>[] {
    return this.valueMapper.toRecordList(response);
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

  private toRecord(value: unknown): Record<string, unknown> | undefined {
    if (typeof value === 'object' && value !== null) {
      return value as Record<string, unknown>;
    }

    return undefined;
  }

  private toText(value: unknown): string {
    return this.valueMapper.toText(value);
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
}
