import { Injectable } from '@angular/core';
import { FormSectionConfig } from '../models/field-config.model';
import { LineConfig, LineColumnConfig } from '../models/line-config.model';
import { LineMasterRegistry, LineMasterService } from './line-master.service';

export type EntrySelectOption = { label: string; value: unknown };

@Injectable({
  providedIn: 'root',
})
export class EntryConfigDataService {
  constructor(private readonly lineMasters: LineMasterService) {}

  buildHeaderData(
    record: Record<string, unknown>,
    sections: FormSectionConfig[],
    dropdownRecords: Record<string, Record<string, unknown>[]> = {},
  ): Record<string, unknown> {
    const data: Record<string, unknown> = { ...record };

    for (const section of sections) {
      for (const field of section.fields) {
        const source = record[field.key];
        data[field.key] =
          source === null || source === undefined || source === '' ? (field.defaultValue ?? '') : source;

        const optionsKey = this.getOptionsDataKey(field.key, field.optionsDataKey);
        data[optionsKey] = dropdownRecords[optionsKey] ?? data[optionsKey] ?? [];
      }
    }

    return data;
  }

  buildHeaderSeed(sections: FormSectionConfig[], seed: Record<string, unknown> = {}): Record<string, unknown> {
    const data: Record<string, unknown> = { ...seed };

    for (const section of sections) {
      for (const field of section.fields) {
        if (field.key in data) {
          continue;
        }

        if (field.defaultValue !== undefined) {
          data[field.key] = field.defaultValue;
          continue;
        }

        data[field.key] = field.valueType === 'number' ? 0 : '';
      }
    }

    return data;
  }

  buildLineRows(
    lineConfig: LineConfig,
    headerData: Record<string, unknown>,
    lineSource: unknown[],
    registry: LineMasterRegistry,
    optionFieldMap: Record<string, EntrySelectOption[]>,
  ): Record<string, unknown>[] {
    const records = lineSource.filter((line): line is Record<string, unknown> => this.isRecord(line));
    if (!records.length) {
      return [this.createEmptyLineRow(lineConfig, headerData, registry, optionFieldMap)];
    }

    return records.map((record) => {
      const row: Record<string, unknown> = { ...record };
      const typeField = this.getColumnField(this.resolveLineTypeColumn(lineConfig));

      for (const column of lineConfig.columns) {
        const field = this.getColumnField(column);
        if (!field) {
          continue;
        }

        row[field] = this.resolveLineFieldValue(record, field, column, registry, typeField);
      }

      this.applyParentFields(row, headerData, lineConfig);
      this.assignLineOptions(row, lineConfig, registry, optionFieldMap);
      return row;
    });
  }

  createEmptyLineRow(
    lineConfig: LineConfig,
    headerData: Record<string, unknown>,
    registry: LineMasterRegistry,
    optionFieldMap: Record<string, EntrySelectOption[]>,
  ): Record<string, unknown> {
    const typeColumn = this.resolveLineTypeColumn(lineConfig);
    const typeField = this.getColumnField(typeColumn);
    const defaultType = this.toText(typeColumn?.options?.[0]?.value).trim() || registry.emptyType;
    const row: Record<string, unknown> = {};

    for (const column of lineConfig.columns) {
      const field = this.getColumnField(column);
      if (!field) {
        continue;
      }

      if (field === typeField) {
        row[field] = defaultType;
        continue;
      }

      if (column.valueType === 'number') {
        row[field] = 0;
        continue;
      }

      if (column.valueType === 'boolean') {
        row[field] = false;
        continue;
      }

      row[field] = '';
    }

    this.applyParentFields(row, headerData, lineConfig);
    this.assignLineOptions(row, lineConfig, registry, optionFieldMap);
    return row;
  }

  buildLineCreatePayload(
    row: Record<string, unknown>,
    lineConfig: LineConfig,
  ): Record<string, unknown> | null {
    const fields = lineConfig.dataSource.createFields ?? [];
    if (!fields.length) {
      return { ...row };
    }

    const payload: Record<string, unknown> = {};
    for (const field of fields) {
      payload[field] = row[field];
    }

    const parentKeyField = lineConfig.dataSource.parentKeyField?.trim();
    if (parentKeyField && fields.includes(parentKeyField) && !this.hasValue(payload[parentKeyField])) {
      return null;
    }

    const hasAnyValue = fields.some((field) => this.hasValue(payload[field]));
    if (!hasAnyValue) {
      return null;
    }

    return payload;
  }

  buildLineUpdatePayload(
    row: Record<string, unknown>,
    fields: string[],
    lineConfig: LineConfig,
  ): Record<string, unknown> {
    const blocked = new Set(lineConfig.dataSource.updateBlockedFields ?? []);
    const payload: Record<string, unknown> = {};

    for (const field of new Set(fields)) {
      if (!field.trim() || blocked.has(field)) {
        continue;
      }

      payload[field] = row[field];
    }

    return payload;
  }

  mergeListRecord(
    source: Record<string, unknown>,
    existing?: Record<string, unknown>,
    selected?: Record<string, unknown>,
  ): Record<string, unknown> {
    return { ...(selected ?? {}), ...(existing ?? {}), ...source };
  }

  getOptionsDataKey(field: string, configuredKey?: string): string {
    return configuredKey?.trim() || `__options_${field}`;
  }

  private resolveLineFieldValue(
    record: Record<string, unknown>,
    field: string,
    column: LineColumnConfig,
    registry: LineMasterRegistry,
    typeField: string,
  ): unknown {
    const value = record[field];
    if (field === typeField) {
      return this.lineMasters.resolveType(value, registry);
    }

    if (column.valueType === 'number') {
      return this.toNumber(value) ?? 0;
    }

    return value ?? '';
  }

  private assignLineOptions(
    row: Record<string, unknown>,
    lineConfig: LineConfig,
    registry: LineMasterRegistry,
    optionFieldMap: Record<string, EntrySelectOption[]>,
  ): void {
    const typeColumn = this.resolveLineTypeColumn(lineConfig);
    const typeField = this.getColumnField(typeColumn);
    const numberColumn = this.resolveLineMasterValueColumn(lineConfig);
    const numberField = this.getColumnField(numberColumn);
    const numberOptionFieldKey = numberField
      ? this.getOptionsDataKey(numberField, numberColumn?.optionsDataKey)
      : undefined;

    // Normal line pages do not use line-type master behavior; bind options directly.
    if (!typeField && !numberOptionFieldKey) {
      for (const [field, options] of Object.entries(optionFieldMap)) {
        row[field] = options;
      }
      return;
    }

    const type = typeField ? this.lineMasters.resolveType(row[typeField], registry) : registry.emptyType;
    this.lineMasters.assignTypeOptions(
      row,
      type,
      registry,
      optionFieldMap,
      numberOptionFieldKey,
    );
  }

  private applyParentFields(
    row: Record<string, unknown>,
    headerData: Record<string, unknown>,
    lineConfig: LineConfig,
  ): void {
    const parentKeyField = lineConfig.dataSource.parentKeyField;
    const documentNoField = lineConfig.dataSource.documentNoField;

    if (parentKeyField && !this.hasValue(row[parentKeyField])) {
      row[parentKeyField] = documentNoField
        ? headerData[documentNoField] ?? headerData[parentKeyField]
        : headerData[parentKeyField];
    }

    for (const [field, value] of Object.entries(lineConfig.dataSource.parentFixedFields ?? {})) {
      if (!this.hasValue(row[field])) {
        row[field] = value;
      }
    }
  }

  private getColumnField(column: LineColumnConfig | undefined): string {
    return this.toText(column?.field ?? column?.id).trim();
  }

  private resolveLineTypeColumn(lineConfig: Pick<LineConfig, 'columns'>): LineColumnConfig | undefined {
    return lineConfig.columns.find((column) =>
      (column.options ?? []).some((option) => this.resolveApiEndpoints(option.api).length > 0)
    );
  }

  private resolveLineMasterValueColumn(lineConfig: Pick<LineConfig, 'columns'>): LineColumnConfig | undefined {
    return lineConfig.columns.find((column) => Boolean(column.fill));
  }

  private resolveApiEndpoints(source: string | string[] | undefined): string[] {
    const endpoints = Array.isArray(source) ? source : source ? [source] : [];
    return endpoints.map((endpoint) => endpoint.trim()).filter((endpoint) => endpoint.length > 0);
  }

  private hasValue(value: unknown): boolean {
    return value !== null && value !== undefined && String(value).trim().length > 0;
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }

  private toNumber(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string') {
      const parsed = Number(value.replace(/,/g, '').trim());
      return Number.isFinite(parsed) ? parsed : null;
    }

    return null;
  }

  private toText(value: unknown): string {
    return value === null || value === undefined ? '' : String(value);
  }
}
