import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { timeout } from 'rxjs/operators';
import { DataSourceConfig } from '../models/data-source-config.model';
import { DataSourceService } from './data-source.service';
import { EntryResponseNormalizerService } from './entry-response-normalizer.service';

type LineLoadOptions = {
  timeoutMs?: number;
  fallbackDocumentNoField?: string;
  defaultTop?: number;
  allowWithoutParentKey?: boolean;
};

@Injectable({
  providedIn: 'root',
})
export class EntryHydrationOrchestratorService {
  constructor(
    private readonly dataSource: DataSourceService,
    private readonly normalizer: EntryResponseNormalizerService,
  ) {}

  extractRecords(response: unknown): Record<string, unknown>[] {
    if (Array.isArray(response)) {
      return response.filter((item): item is Record<string, unknown> => this.isRecord(item));
    }

    if (this.isRecord(response) && Array.isArray(response['value'])) {
      return response['value'].filter((item): item is Record<string, unknown> => this.isRecord(item));
    }

    return [];
  }

  async loadHeaderById(
    dataSourceConfig: DataSourceConfig,
    id: unknown,
    fallback: Record<string, unknown>,
    timeoutMs: number,
  ): Promise<Record<string, unknown>> {
    const response = await firstValueFrom(
      this.dataSource.loadById(dataSourceConfig, id).pipe(timeout(timeoutMs)),
    );

    return this.normalizer.normalizeSingleRecordResponse(response, fallback);
  }

  pickHeaderRecord(
    records: Record<string, unknown>[],
    contextRecordId: unknown,
    dataSourceConfig: DataSourceConfig,
  ): Record<string, unknown> {
    if (!records.length) {
      return {};
    }

    if (contextRecordId === undefined || contextRecordId === null || String(contextRecordId).trim().length === 0) {
      return records[0];
    }

    const target = String(contextRecordId).trim().toLowerCase();
    const keyCandidates = [
      this.toText(dataSourceConfig.keyField).trim(),
      this.toText(dataSourceConfig.documentNoField).trim(),
      'systemId',
      'SystemId',
      'id',
      'Id',
    ].filter((key) => key.length > 0);

    for (const record of records) {
      for (const key of keyCandidates) {
        const value = record[key];
        if (value !== null && value !== undefined && String(value).trim().toLowerCase() === target) {
          return record;
        }
      }
    }

    return records[0];
  }

  async loadLineRowsForHeader(
    lineDataSource: DataSourceConfig,
    headerData: Record<string, unknown>,
    options: LineLoadOptions = {},
  ): Promise<Record<string, unknown>[]> {
    const timeoutMs = options.timeoutMs ?? 10000;
    const defaultTop = options.defaultTop ?? 200;

    if (!this.toText(lineDataSource.endpoint).trim().length) {
      return [];
    }

    const relation = lineDataSource.navigation;
    if (relation) {
      const parentEndpoint = this.toText(relation.parentEndpoint).trim();
      const childCollection = this.toText(relation.childCollection).trim();
      const parentIdFields = (relation.parentIdFields ?? [])
        .map((field) => this.toText(field).trim())
        .filter((field) => field.length > 0);

      if (!parentEndpoint.length || !childCollection.length || !parentIdFields.length) {
        return [];
      }

      const parentId = parentIdFields
        .map((field) => headerData[field])
        .find((value) => this.hasValue(value));

      if (!this.hasValue(parentId)) {
        return [];
      }

      const effectiveDataSource: DataSourceConfig = {
        ...lineDataSource,
        endpoint: `${parentEndpoint}(${this.toODataId(parentId)})/${childCollection}`,
      };

      const response = await firstValueFrom(
        this.dataSource
          .loadList(effectiveDataSource, { top: relation.top ?? lineDataSource.pageSize ?? defaultTop })
          .pipe(timeout(timeoutMs)),
      );

      return this.extractRecords(response);
    }

    const clauses: string[] = [];
    const parentKeyField = this.toText(lineDataSource.parentKeyField).trim();
    if (parentKeyField.length) {
      const documentNoField = this.toText(lineDataSource.documentNoField).trim()
        || this.toText(options.fallbackDocumentNoField).trim()
        || parentKeyField;

      const parentValue = this.hasValue(headerData[documentNoField])
        ? headerData[documentNoField]
        : headerData[parentKeyField];

      if (!this.hasValue(parentValue)) {
        return [];
      }

      clauses.push(`${parentKeyField} eq ${this.toODataFilterLiteral(parentValue)}`);
    } else if (!options.allowWithoutParentKey) {
      return [];
    }

    for (const [field, value] of Object.entries(lineDataSource.parentFixedFields ?? {})) {
      const key = this.toText(field).trim();
      if (!key.length) {
        continue;
      }

      clauses.push(`${key} eq ${this.toODataFilterLiteral(value)}`);
    }

    const contextFilter = clauses.join(' and ');
    const effectiveDataSource: DataSourceConfig = {
      ...lineDataSource,
      defaultFilter: contextFilter.length
        ? (lineDataSource.defaultFilter
          ? `(${lineDataSource.defaultFilter}) and (${contextFilter})`
          : contextFilter)
        : lineDataSource.defaultFilter,
    };

    const response = await firstValueFrom(
      this.dataSource
        .loadList(effectiveDataSource, { top: lineDataSource.pageSize ?? defaultTop })
        .pipe(timeout(timeoutMs)),
    );

    return this.extractRecords(response);
  }

  private hasValue(value: unknown): boolean {
    return value !== null && value !== undefined && String(value).trim().length > 0;
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }

  private toText(value: unknown): string {
    return value === null || value === undefined ? '' : String(value);
  }

  private toODataId(value: unknown): string {
    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }

    const normalized = this.toText(value).trim();
    if (!normalized.length) {
      return "''";
    }

    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(normalized)) {
      return normalized;
    }

    return `'${normalized.replace(/'/g, "''")}'`;
  }

  private toODataFilterLiteral(value: unknown): string {
    if (typeof value === 'number') {
      return Number.isFinite(value) ? String(value) : '0';
    }

    if (typeof value === 'boolean') {
      return value ? 'true' : 'false';
    }

    if (value === null || value === undefined) {
      return "''";
    }

    const text = this.toText(value).trim();
    return `'${text.replace(/'/g, "''")}'`;
  }
}