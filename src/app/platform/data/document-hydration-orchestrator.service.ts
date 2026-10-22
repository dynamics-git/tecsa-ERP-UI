import { lookupQuery } from './lookup-dependencies';
import { FieldConfig } from '../models/field-config.model';
import { LineColumnConfig } from '../models/line-config.model';
import { Injectable } from '@angular/core';
import { firstValueFrom, Observable, of, throwError } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';
import { DataSourceConfig } from '../models/data-source-config.model';
import { DataSourceService } from './data-source.service';
import { DocumentResponseNormalizerService } from './document-response-normalizer.service';

type LineLoadOptions = {
  timeoutMs?: number;
  fallbackDocumentNoField?: string;
  defaultTop?: number;
  allowWithoutParentKey?: boolean;
};

@Injectable({
  providedIn: 'root',
})
export class DocumentHydrationOrchestratorService {
  constructor(
    private readonly dataSource: DataSourceService,
    private readonly normalizer: DocumentResponseNormalizerService,
  ) {}

  async resolveHeaderLookups(
    record: Record<string, unknown>,
    fields: FieldConfig[],
  ): Promise<Record<string, unknown>> {
    return (await this.resolveListLookups([record], fields))[0];
  }

  async resolveLineLookups(
    rows: Record<string, unknown>[],
    columns: LineColumnConfig[],
    header: Record<string, unknown> = {},
  ): Promise<Record<string, unknown>[]> {
    const fields: FieldConfig[] = columns.map((column) => ({
      key: column.field ?? column.id,
      label: column.label,
      lookup: column.lookup,
      optionsDataKey: column.optionsDataKey,
      displayFormat: column.displayFormat,
    }));
    const result = await this.resolveListLookups(rows, fields, header);
    for (const row of result)
      for (const field of fields) {
        if (!field.lookup) continue;
        const bucket = field.optionsDataKey ?? `__options_${field.key}`;
        const options = row[bucket];
        if (Array.isArray(options))
          row[bucket] = options.map((record) => ({
            value: record[field.lookup!.valueField],
            label: row[`__lookupRestricted_${field.key}`]
              ? 'Restricted'
              : this.lookupLabel(field, record),
            record,
          }));
      }
    return result;
  }

  private lookupLabel(field: FieldConfig, record: Record<string, unknown>): string {
    if (field.displayFormat)
      return field.displayFormat.replace(/\[([^\]]+)\]/g, (_, key: string) =>
        String(record[key] ?? ''),
      );
    return String(record[field.lookup!.displayField] ?? '');
  }

  /** Batch selected identities per scoped resource; never download entire master tables. */
  async resolveListLookups(
    rows: Record<string, unknown>[],
    fields: FieldConfig[],
    header: Record<string, unknown> = {},
  ): Promise<Record<string, unknown>[]> {
    const records = rows.map((row) => ({ ...row }));
    type Target = { row: Record<string, unknown>; field: FieldConfig; id: string };
    const groups = new Map<
      string,
      { endpoint: string; filter?: string; valueField: string; targets: Target[] }
    >();
    for (const row of records)
      for (const field of fields) {
        if (!field.lookup || !this.hasValue(row[field.key])) continue;
        const query = lookupQuery({ ...field.lookup, filter: undefined }, row, '', header);
        if (!query.ready || !query.endpoint) continue;
        const key = JSON.stringify([query.endpoint, query.filter, field.lookup.valueField]);
        const group = groups.get(key) ?? {
          endpoint: query.endpoint,
          filter: query.filter,
          valueField: field.lookup.valueField,
          targets: [],
        };
        group.targets.push({ row, field, id: String(row[field.key]) });
        groups.set(key, group);
      }
    const jobs: Array<() => Promise<void>> = [];
    for (const group of groups.values()) {
      const ids = [...new Set(group.targets.map((target) => target.id))].sort();
      for (let offset = 0; offset < ids.length; offset += 40) {
        const chunk = ids.slice(offset, offset + 40);
        jobs.push(async () => {
          const identities = chunk
            .map((id) => group.valueField + " eq '" + id.replace(/'/g, "''") + "'")
            .join(' or ');
          const filter = [group.filter, '(' + identities + ')'].filter(Boolean).join(' and ');
          const page = (await firstValueFrom<unknown>(
            this.dataSource
              .loadList(
                { endpoint: group.endpoint, defaultFilter: filter },
                { top: chunk.length, useCache: true, maxAgeMs: 30000 },
              )
              .pipe(
                timeout<unknown>(10000),
                catchError(
                  (error): Observable<unknown> =>
                    error?.status === 403
                      ? of({ value: [], restricted: true })
                      : throwError(() => error),
                ),
              ),
          )) as { value: Record<string, unknown>[]; restricted?: boolean };
          const selected = new Map(
            page.value.map((record) => [String(record[group.valueField]), record]),
          );
          for (const target of group.targets.filter((target) => chunk.includes(target.id))) {
            const record = selected.get(target.id);
            target.row[`__lookupRestricted_${target.field.key}`] = page.restricted === true;
            target.row[target.field.optionsDataKey ?? `__options_${target.field.key}`] = record
              ? [record]
              : [];
            target.row[`__display_${target.field.key}`] = record
              ? this.lookupLabel(target.field, record)
              : page.restricted
                ? 'Restricted'
                : 'Unavailable';
          }
        });
      }
    }
    let cursor = 0;
    await Promise.all(
      Array.from({ length: Math.min(6, jobs.length) }, async () => {
        while (cursor < jobs.length) await jobs[cursor++]();
      }),
    );
    return records;
  }

  extractRecords(response: unknown): Record<string, unknown>[] {
    if (Array.isArray(response)) {
      return response.filter((item): item is Record<string, unknown> => this.isRecord(item));
    }

    if (this.isRecord(response) && Array.isArray(response['value'])) {
      return response['value'].filter((item): item is Record<string, unknown> =>
        this.isRecord(item),
      );
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
      this.dataSource
        .loadById(dataSourceConfig, id, { useCache: true, maxAgeMs: 30000 })
        .pipe(timeout(timeoutMs)),
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

    if (
      contextRecordId === undefined ||
      contextRecordId === null ||
      String(contextRecordId).trim().length === 0
    ) {
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
        if (
          value !== null &&
          value !== undefined &&
          String(value).trim().toLowerCase() === target
        ) {
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
        ...this.dataSource.relation(lineDataSource, headerData),
      };

      return this.loadBoundedRows(effectiveDataSource, timeoutMs);
    }

    const clauses: string[] = [];
    const parentKeyField = this.toText(lineDataSource.parentKeyField).trim();
    if (parentKeyField.length) {
      const documentNoField =
        this.toText(lineDataSource.documentNoField).trim() ||
        this.toText(options.fallbackDocumentNoField).trim() ||
        parentKeyField;

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
        ? lineDataSource.defaultFilter
          ? `(${lineDataSource.defaultFilter}) and (${contextFilter})`
          : contextFilter
        : lineDataSource.defaultFilter,
    };

    return this.loadBoundedRows(effectiveDataSource, timeoutMs);
  }

  private async loadBoundedRows(
    config: DataSourceConfig,
    timeoutMs: number,
  ): Promise<Record<string, unknown>[]> {
    const rows: Record<string, unknown>[] = [];
    const top = Math.min(config.pageSize ?? 100, 200);
    for (;;) {
      const response = (await firstValueFrom(
        this.dataSource
          .loadList(config, { top, skip: rows.length, useCache: true, maxAgeMs: 30000 })
          .pipe(timeout<unknown>(timeoutMs)),
      )) as { value: Record<string, unknown>[]; meta: Record<string, unknown> };
      rows.push(...response.value);
      const complete =
        typeof response.meta['total'] === 'number'
          ? rows.length >= response.meta['total']
          : response.value.length < top;
      if (complete) return rows;
      if (rows.length >= 1000)
        throw new Error(
          'This document exceeds the 1,000-line editor limit. Use a bounded worksheet.',
        );
    }
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
