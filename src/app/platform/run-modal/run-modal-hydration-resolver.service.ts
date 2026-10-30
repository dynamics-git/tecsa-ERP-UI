import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { timeout } from 'rxjs/operators';
import { DataSourceConfig } from '../models/data-source-config.model';
import { RUNTIME_TIMEOUT_POLICY } from '../data/runtime-timeout-policy.token';
import { RuntimeValueMapperService } from '../data/runtime-value-mapper.service';
import { DocumentHydrationOrchestratorService } from '../data/document-hydration-orchestrator.service';
import { DocumentRecordService } from '../data/document-record.service';
import { DocumentResponseNormalizerService } from '../data/document-response-normalizer.service';
import { DataSourceService } from '../data/data-source.service';
import { RunModalConfigAssemblerService } from './run-modal-config-assembler.service';
import { PageModule, RunModalContext } from './run-modal-config.token';
import { DocumentWindowConfig } from '../models/document-window-config.model';

@Injectable({
  providedIn: 'root',
})
export class RunModalHydrationResolverService {
  private readonly timeoutPolicy = inject(RUNTIME_TIMEOUT_POLICY);
  private readonly valueMapper = inject(RuntimeValueMapperService);

  constructor(
    private readonly dataSource: DataSourceService,
    private readonly documentHydration: DocumentHydrationOrchestratorService,
    private readonly documentRecord: DocumentRecordService,
    private readonly documentResponseNormalizer: DocumentResponseNormalizerService,
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

    const recordId = this.documentRecord.resolvePersistedRecordId(headerData, dataSource);
    if (recordId === null || recordId === undefined || String(recordId).trim().length === 0) {
      return headerData;
    }

    try {
      const response = await firstValueFrom(this.dataSource.loadById(dataSource, recordId));
      return this.documentResponseNormalizer.normalizeSingleRecordResponse(response, headerData);
    } catch {
      return headerData;
    }
  }

  resolveContextRecordId(context: RunModalContext, dataSource: DataSourceConfig): unknown {
    const providedHeader = this.toRecord(context['headerData']);
    if (providedHeader) {
      const persisted = this.documentRecord.resolvePersistedRecordId(providedHeader, dataSource);
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
    module: PageModule,
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
      endpoint: `${relation.parentEndpoint}(${this.toODataId(parentId)})/${relation.childCollection}`,
    };
  }

  resolveContextualListDataSource(
    dataSource: DataSourceConfig | undefined,
    context: RunModalContext,
  ): DataSourceConfig | undefined {
    if (!dataSource) {
      return undefined;
    }

    const lineFKProp = this.toText(dataSource.lineFKProp).trim();
    if (!lineFKProp.length) {
      return dataSource;
    }

    const contextRecord = this.toRecord(context['headerData']) ?? this.toRecord(context['activeLine']);
    if (!contextRecord) {
      return dataSource;
    }

    const sourceFieldCandidates = [
      this.toText(dataSource.contextHeaderPKProp).trim(),
      this.toText(dataSource.headerPKProp).trim(),
      lineFKProp,
    ].filter((field) => field.length > 0);

    const parentValue = sourceFieldCandidates
      .map((field) => this.readFieldValue(contextRecord, field))
      .find((value) => value !== null && value !== undefined && String(value).trim().length > 0);

    if (parentValue === null || parentValue === undefined || String(parentValue).trim().length === 0) {
      return dataSource;
    }

    const clauses = [`${lineFKProp} eq ${this.toODataFilterLiteral(parentValue)}`];
    for (const [field, headerField] of Object.entries(dataSource.parentFieldMap ?? {})) {
      const value = this.readFieldValue(contextRecord, headerField);
      if (value === undefined || value === null || value === '') throw new Error('The related record context is missing.');
      clauses.push(`${field} eq ${this.toODataFilterLiteral(value)}`);
    }
    const contextFilter = clauses.join(' and ');
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
    module: PageModule,
    headerData: Record<string, unknown>,
  ): Promise<Record<string, unknown>[]> {
    const lineDataSource = this.pickLineDataSource(module);
    if (!lineDataSource?.endpoint?.trim()) {
      return [];
    }

    return this.documentHydration.loadLineRowsForHeader(
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
    module: PageModule;
    documentWindowConfig: DocumentWindowConfig;
    pickLineDataSource: (module: PageModule) => DataSourceConfig | undefined;
    loadRelatedLineRows: (
      module: PageModule,
      headerData: Record<string, unknown>,
    ) => Promise<Record<string, unknown>[]>;
    mapRecordsToLineRows: (
      records: Record<string, unknown>[],
      documentWindowConfig: DocumentWindowConfig,
    ) => Record<string, unknown>[];
  }): Promise<{ lineHydrateFailed: boolean; lineHydrateMessage?: string }> {
    if (!params.pickLineDataSource(params.module)) {
      return { lineHydrateFailed: false };
    }

    if (!params.documentWindowConfig.headerData) {
      return {
        lineHydrateFailed: true,
        lineHydrateMessage: 'Header data is missing for line loading. Retry to continue.',
      };
    }

    try {
      const records = await params.loadRelatedLineRows(params.module, params.documentWindowConfig.headerData);
      params.documentWindowConfig.lineRows = params.mapRecordsToLineRows(records, params.documentWindowConfig);
      return { lineHydrateFailed: false };
    } catch {
      params.documentWindowConfig.lineRows = [];
      return {
        lineHydrateFailed: true,
        lineHydrateMessage: 'Unable to load lines. Retry to continue.',
      };
    }
  }

  async hydrateFromApi(params: {
    module: PageModule;
    documentWindowConfig: DocumentWindowConfig;
    context: RunModalContext;
    dataSource?: DataSourceConfig;
    resolveEntryHydrationTop: (module: PageModule, dataSource: DataSourceConfig) => number;
    isWorksheetPage: (module: PageModule) => boolean;
    mergeHeaderFromFirstRecord: (record: Record<string, unknown>, documentWindowConfig: DocumentWindowConfig) => void;
    mapRecordsToLineRows: (
      records: Record<string, unknown>[],
      documentWindowConfig: DocumentWindowConfig,
    ) => Record<string, unknown>[];
    hydrateRelatedLines: (
      module: PageModule,
      documentWindowConfig: DocumentWindowConfig,
    ) => Promise<{ lineHydrateFailed: boolean; lineHydrateMessage?: string }>;
    pickLineDataSource: (module: PageModule) => DataSourceConfig | undefined;
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
      const records = this.documentHydration.extractRecords(response);
      if (!records.length) {
        if (params.isWorksheetPage(params.module)) {
          params.documentWindowConfig.lineRows = [];
        }

        if (contextRecordId !== undefined && contextRecordId !== null && String(contextRecordId).trim().length > 0) {
          try {
            const byIdRecord = await this.documentHydration.loadHeaderById(
              params.dataSource,
              contextRecordId,
              {},
              this.timeoutPolicy.hydrationTimeoutMs,
            );
            if (Object.keys(byIdRecord).length) {
              params.mergeHeaderFromFirstRecord(byIdRecord, params.documentWindowConfig);
            }
          } catch {
            // Keep popup rendering even when API load fails.
          }
        }
        return { lineHydrateFailed: false };
      }

      const headerRecord = this.documentHydration.pickHeaderRecord(records, contextRecordId, params.dataSource);
      params.mergeHeaderFromFirstRecord(headerRecord, params.documentWindowConfig);
      if (params.isWorksheetPage(params.module)) {
        params.documentWindowConfig.lineRows = params.mapRecordsToLineRows(records, params.documentWindowConfig);
        return { lineHydrateFailed: false };
      }

      return params.hydrateRelatedLines(params.module, params.documentWindowConfig);
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

  private pickDataSource(module: PageModule): DataSourceConfig | undefined {
    return this.configAssembler.pickDataSource({ module });
  }

  private pickLineDataSource(module: PageModule): DataSourceConfig | undefined {
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
