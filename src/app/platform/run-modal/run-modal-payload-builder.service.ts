import { Injectable, inject } from '@angular/core';
import { DocumentWindowConfig } from '../models/document-window-config.model';
import { DataSourceConfig } from '../models/data-source-config.model';
import { DocumentRecordService } from '../data/document-record.service';
import { RunModalConfigModule } from './run-modal-config.token';
import { RuntimeValueMapperService } from '../data/runtime-value-mapper.service';

export type RunModalPayloadBindingContext = {
  module: RunModalConfigModule;
};

@Injectable({
  providedIn: 'root',
})
export class RunModalPayloadBuilderService {
  private readonly documentRecord = inject(DocumentRecordService);
  private readonly valueMapper = inject(RuntimeValueMapperService);

  buildHeaderPayload(params: {
    headerData?: Record<string, unknown>;
    headerSections?: DocumentWindowConfig['headerSections'];
    dataSource?: DataSourceConfig;
  }): Record<string, unknown> {
    const headerData = params.headerData ?? {};
    const sections = params.headerSections ?? [];
    const allowedFields = params.dataSource?.createFields?.length
      ? new Set(params.dataSource.createFields)
      : undefined;
    const payload: Record<string, unknown> = {};

    for (const section of sections) {
      for (const field of section.fields) {
        const key = this.toText(field.key).trim();
        if (!key || !(key in headerData)) {
          continue;
        }

        if (allowedFields && !allowedFields.has(key)) {
          continue;
        }

        payload[key] = headerData[key];
      }
    }

    return payload;
  }

  buildLineSavePayload(params: {
    binding: RunModalPayloadBindingContext;
    row: Record<string, unknown>;
    documentWindowConfig: DocumentWindowConfig;
    dataSource: DataSourceConfig;
    changePayload?: unknown;
    pickObjectFromModule: (module: RunModalConfigModule, suffix: string) => Record<string, unknown> | undefined;
    readFieldValue: (record: Record<string, unknown>, field: string) => unknown;
    firstPresentValue: (values: unknown[]) => unknown;
  }): Record<string, unknown> {
    if (this.hasPersistedRecordId(params.row, params.dataSource)) {
      return this.buildLineUpdatePayload({
        row: params.row,
        dataSource: params.dataSource,
        changePayload: params.changePayload,
        readFieldValue: params.readFieldValue,
      });
    }

    return this.buildLineCreatePayload({
      binding: params.binding,
      row: params.row,
      documentWindowConfig: params.documentWindowConfig,
      dataSource: params.dataSource,
      pickObjectFromModule: params.pickObjectFromModule,
      firstPresentValue: params.firstPresentValue,
    });
  }

  buildLineUpdatePayload(params: {
    row: Record<string, unknown>;
    dataSource: DataSourceConfig;
    changePayload?: unknown;
    readFieldValue: (record: Record<string, unknown>, field: string) => unknown;
  }): Record<string, unknown> {
    const field = this.resolveChangedLineField(params.changePayload);
    if (!field.length || this.isBlockedLineField(field, params.dataSource)) {
      return {};
    }

    return {
      [field]: params.readFieldValue(params.row, field),
    };
  }

  buildLineCreatePayload(params: {
    binding: RunModalPayloadBindingContext;
    row: Record<string, unknown>;
    documentWindowConfig: DocumentWindowConfig;
    dataSource: DataSourceConfig;
    pickObjectFromModule: (module: RunModalConfigModule, suffix: string) => Record<string, unknown> | undefined;
    firstPresentValue: (values: unknown[]) => unknown;
  }): Record<string, unknown> {
    this.ensureLineParentFields({
      row: params.row,
      documentWindowConfig: params.documentWindowConfig,
      dataSource: params.dataSource,
      firstPresentValue: params.firstPresentValue,
    });
    this.ensureLineNo({
      binding: params.binding,
      row: params.row,
      documentWindowConfig: params.documentWindowConfig,
      pickObjectFromModule: params.pickObjectFromModule,
    });

    const source: Record<string, unknown> = { ...params.row };

    const payload: Record<string, unknown> = {};
    const allowedFields = params.dataSource.createFields?.length ? params.dataSource.createFields : undefined;
    if (allowedFields?.length) {
      for (const field of allowedFields) {
        const value = source[field];
        if (!this.hasMeaningfulPayloadValue(value)) {
          continue;
        }

        payload[field] = value;
      }
    } else {
      for (const column of params.documentWindowConfig.lineColumns ?? []) {
        const field = this.toText(column.field ?? column.id).trim();
        if (!field || !(field in source)) {
          continue;
        }

        if (!field.length || this.isBlockedLineField(field, params.dataSource) || field.startsWith('__')) {
          continue;
        }

        payload[field] = source[field];
      }
    }

    this.applyFixedParentFields({
      payload,
      fixedFields: params.dataSource.parentFixedFields,
    });

    if (allowedFields?.length) {
      for (const key of Object.keys(payload)) {
        if (!allowedFields.includes(key)) {
          delete payload[key];
        }
      }
    }

    const parentKeyField = this.toText(params.dataSource.parentKeyField).trim();
    if (
      parentKeyField.length
      && (allowedFields?.includes(parentKeyField) ?? false)
      && !this.hasMeaningfulPayloadValue(payload[parentKeyField])
    ) {
      return {};
    }

    const requiredFields = allowedFields ?? params.dataSource.createFields ?? [];
    const hasAnyValue = requiredFields.some((field) => this.hasMeaningfulPayloadValue(payload[field]));
    if (!hasAnyValue) {
      return {};
    }

    return payload;
  }

  resolveChangedLineField(changePayload?: unknown): string {
    const payload = this.toRecord(changePayload);
    if (!payload) {
      return '';
    }

    const column = this.toRecord(payload['column']);
    const columnField = this.toText(column?.['field'] ?? column?.['id']).trim();
    if (columnField.length) {
      return columnField;
    }

    return this.toText(payload['fieldKey'] ?? payload['field']).trim();
  }

  ensureLineParentFields(params: {
    row: Record<string, unknown>;
    documentWindowConfig: DocumentWindowConfig;
    dataSource: DataSourceConfig;
    firstPresentValue: (values: unknown[]) => unknown;
  }): void {
    const headerData = params.documentWindowConfig.headerData ?? {};
    const parentKeyField = this.toText(params.dataSource.parentKeyField).trim();
    if (parentKeyField.length && !this.hasMeaningfulPayloadValue(params.row[parentKeyField])) {
      const documentNoField = this.toText(params.dataSource.documentNoField).trim();
      const parentValue = params.firstPresentValue([
        headerData[parentKeyField],
        documentNoField ? headerData[documentNoField] : undefined,
      ]);
      if (parentValue !== undefined) {
        params.row[parentKeyField] = parentValue;
      }
    }

    this.applyFixedParentFields({
      payload: params.row,
      fixedFields: params.dataSource.parentFixedFields,
    });
  }

  ensureLineNo(params: {
    binding: RunModalPayloadBindingContext;
    row: Record<string, unknown>;
    documentWindowConfig: DocumentWindowConfig;
    pickObjectFromModule: (module: RunModalConfigModule, suffix: string) => Record<string, unknown> | undefined;
  }): void {
    const lineKeyField = this.resolveLineKeyField({
      binding: params.binding,
      pickObjectFromModule: params.pickObjectFromModule,
    });

    if (!lineKeyField || this.toNumber(params.row[lineKeyField]) > 0) {
      return;
    }

    params.row[lineKeyField] = this.resolveNextLineNo({
      rows: params.documentWindowConfig.lineRows ?? [],
      targetRow: params.row,
      lineKeyField,
    });
  }

  resolveLineKeyField(params: {
    binding: RunModalPayloadBindingContext;
    pickObjectFromModule: (module: RunModalConfigModule, suffix: string) => Record<string, unknown> | undefined;
  }): string {
    const lineConfig = params.pickObjectFromModule(params.binding.module, 'LineConfig');
    const configured = this.toText(lineConfig?.['lineKeyField']).trim();
    return configured;
  }

  isBlockedLineField(field: string, dataSource: DataSourceConfig): boolean {
    return field.startsWith('__') || (dataSource.updateBlockedFields ?? []).includes(field);
  }

  hasPersistedRecordId(
    row: Record<string, unknown>,
    dataSource: DataSourceConfig,
  ): boolean {
    const id = this.documentRecord.resolvePersistedRecordId(row, dataSource);
    return id !== null && id !== undefined && String(id).trim().length > 0;
  }

  hasMeaningfulPayloadValue(value: unknown): boolean {
    return value !== null && value !== undefined && String(value).trim().length > 0;
  }

  resolveNextLineNo(params: {
    rows: Record<string, unknown>[];
    targetRow: Record<string, unknown>;
    lineKeyField: string;
  }): number {
    let maxLineNo = 0;
    for (const row of params.rows) {
      if (row === params.targetRow) {
        continue;
      }

      const lineNo = this.toNumber(row[params.lineKeyField]);
      if (lineNo > maxLineNo) {
        maxLineNo = lineNo;
      }
    }

    return maxLineNo > 0 ? maxLineNo + 10000 : 10000;
  }

  applyFixedParentFields(params: {
    payload: Record<string, unknown>;
    fixedFields?: Record<string, unknown>;
  }): void {
    if (!params.fixedFields) {
      return;
    }

    for (const [key, value] of Object.entries(params.fixedFields)) {
      if (!key.trim()) {
        continue;
      }

      params.payload[key] = value;
    }
  }

  resolveRelationParentId(params: {
    headerData: Record<string, unknown>;
    parentIdFields: string[];
    readFieldValue: (record: Record<string, unknown>, field: string) => unknown;
  }): unknown {
    for (const field of params.parentIdFields) {
      const value = params.readFieldValue(params.headerData, field);
      if (this.hasMeaningfulPayloadValue(value)) {
        return value;
      }
    }

    return undefined;
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
}
