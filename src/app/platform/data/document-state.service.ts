import { normalizeFieldValue } from '../models/field-value';
import { Inject, Injectable, Optional } from '@angular/core';
import { catchError, of, take } from 'rxjs';
import { DOCUMENT_SAVE_PORT, DocumentSavePort, DocumentSaveResult } from './document-save.port';
import { FieldConfig, FieldValueType, FormSectionConfig } from '../models/field-config.model';
import { DataSourceConfig } from '../models/data-source-config.model';
import { DocumentWindowConfig } from '../models/document-window-config.model';
import { LineConfig } from '../models/line-config.model';
import { LineCalculationService } from '../document/line-calculation.service';

export interface LineChangeEvent {
  row: Record<string, unknown>;
  field: string;
  value: unknown;
  calculatedFields?: string[];
}

export interface AutosaveOptions {
  delay?: number;
  modifiedAtKey?: string;
  lineRows?: Record<string, unknown>[];
  lineDataSourceConfig?: DataSourceConfig;
  meta?: Record<string, unknown>;
  dataSourceConfig?: DataSourceConfig;
  headerSections?: FormSectionConfig[];
  onCompleted?: (result: DocumentSaveResult) => void;
  onFailed?: (result: DocumentSaveResult) => void;
}

export interface PopupActionEvent {
  popupId: string;
  actionKey: string;
  payload?: unknown;
}

export interface DocumentActionHandlers {
  lineChanged?: (payload: unknown) => void;
  lineSelectionChanged?: (payload: unknown) => void;
  headerChanged?: (payload: unknown) => void;
  headerInteracted?: (payload: unknown) => void;
  autosave?: (payload: unknown) => void;
  commands?: DocumentCommandHandlers;
  command?: (actionKey: string, payload: unknown) => void;
}

export interface DocumentCommandHandlers {
  save?: (payload: unknown) => void;
  apply?: (payload: unknown) => void;
  lineNew?: (payload: unknown) => void;
  lineInsert?: (payload: unknown) => void;
  command?: (command: string, payload: unknown) => void;
}

export interface DocumentRuntimeConfig {
  documentWindowConfig?: DocumentWindowConfig | null;
  lineConfig?: LineConfig;
}

@Injectable({
  providedIn: 'root'
})
export class DocumentStateService {
  private readonly autosaveTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly autosaveGenerations = new Map<string, number>();

  constructor(
    @Optional() @Inject(DOCUMENT_SAVE_PORT) private readonly savePort: DocumentSavePort | null,
    private readonly lineCalculation: LineCalculationService
  ) {}

  buildFieldValueTypeMap(sections: FormSectionConfig[]): Record<string, FieldValueType> {
    const map: Record<string, FieldValueType> = {};

    for (const section of sections) {
      for (const field of section.fields) {
        map[field.key] = this.resolveFieldValueType(field);
      }
    }

    return map;
  }

  buildFieldConfigMap(sections: FormSectionConfig[]): Record<string, FieldConfig> {
    const map: Record<string, FieldConfig> = {};

    for (const section of sections) {
      for (const field of section.fields) {
        map[field.key] = field;
      }
    }

    return map;
  }

  applyHeaderFieldChange(
    headerData: Record<string, unknown>,
    payload: unknown,
    valueTypeMap: Record<string, FieldValueType> = {}
  ): boolean {
    if (!this.isRecord(payload)) {
      return false;
    }

    const fieldKey = this.toText(payload['fieldKey']);
    const value = this.coerceValue(payload['value'], valueTypeMap[fieldKey]);
    let changed = false;

    if (fieldKey.length > 0) {
      headerData[fieldKey] = value;
      changed = true;
    }

    const updates = payload['updates'];
    if (this.isRecord(updates)) {
      for (const [targetKey, targetValue] of Object.entries(updates)) {
        headerData[targetKey] = this.coerceValue(targetValue, valueTypeMap[targetKey]);
        changed = true;
      }
    }

    return changed;
  }

  rollbackHeaderFieldChange(
    headerData: Record<string, unknown>,
    payload: unknown,
    valueTypeMap: Record<string, FieldValueType> = {}
  ): boolean {
    if (!this.isRecord(payload)) {
      return false;
    }

    const fieldKey = this.toText(payload['fieldKey']);
    let changed = false;

    if (fieldKey.length > 0 && 'previousValue' in payload) {
      headerData[fieldKey] = this.coerceValue(payload['previousValue'], valueTypeMap[fieldKey]);
      changed = true;
    }

    const previousUpdates = payload['previousUpdates'];
    if (this.isRecord(previousUpdates)) {
      for (const [targetKey, previousValue] of Object.entries(previousUpdates)) {
        headerData[targetKey] = this.coerceValue(previousValue, valueTypeMap[targetKey]);
        changed = true;
      }
    }

    return changed;
  }

  scheduleAutosave(scope: string, callback: () => void, delay = 400): void {
    this.clearAutosave(scope);

    const timer = setTimeout(() => {
      this.autosaveTimers.delete(scope);
      callback();
    }, delay);

    this.autosaveTimers.set(scope, timer);
  }

  clearAutosave(scope: string): void {
    const timer = this.autosaveTimers.get(scope);
    if (!timer) {
      return;
    }

    clearTimeout(timer);
    this.autosaveTimers.delete(scope);
  }

  clearAllAutosaves(): void {
    for (const timer of this.autosaveTimers.values()) {
      clearTimeout(timer);
    }

    this.autosaveTimers.clear();
  }

  touchHeaderModifiedAt(headerData: Record<string, unknown>, key: string): void {
    if (!key.trim()) {
      return;
    }

    headerData[key] = new Date().toISOString();
  }

  scheduleHeaderAutosave(
    scope: string,
    headerData: Record<string, unknown>,
    options: AutosaveOptions = {}
  ): void {
    const modifiedAtKey = options.modifiedAtKey?.trim() ?? '';
    const generation = this.nextAutosaveGeneration(scope);

    this.scheduleAutosave(scope, () => {
      const request = {
        scope,
        headerData: { ...headerData },
        lineRows: options.lineRows,
        lineDataSourceConfig: options.lineDataSourceConfig,
        meta: options.meta,
        dataSourceConfig: options.dataSourceConfig,
        headerSections: options.headerSections,
        modifiedAtKey: modifiedAtKey || undefined
      };

      if (!this.savePort) {
        if (!this.isCurrentAutosaveGeneration(scope, generation)) {
          return;
        }

        if (modifiedAtKey) {
          this.touchHeaderModifiedAt(headerData, modifiedAtKey);
        }

        options.onCompleted?.({
          saved: true,
          modifiedAt: modifiedAtKey ? this.toText(headerData[modifiedAtKey]) : new Date().toISOString()
        });
        return;
      }

      this.savePort.save(request).pipe(
        take(1),
        catchError((error: unknown) => of({
          saved: false,
          errorMessage: this.resolveErrorMessage(error)
        } as DocumentSaveResult))
      ).subscribe((result) => {
        if (!this.isCurrentAutosaveGeneration(scope, generation)) {
          return;
        }

        if (result.saved && result.modifiedAt) {
          if (modifiedAtKey) {
            headerData[modifiedAtKey] = result.modifiedAt;
          }

          options.onCompleted?.(result);
        } else {
          if (options.onFailed) {
            options.onFailed(result);
          } else {
            // Never convert a failed save to success when no failure callback is provided.
            // Surface explicit failure for shared runtime diagnostics.
            console.error(result.errorMessage || 'Save failed.');
          }
        }
      });
    }, options.delay);
  }

  private nextAutosaveGeneration(scope: string): number {
    const next = (this.autosaveGenerations.get(scope) ?? 0) + 1;
    this.autosaveGenerations.set(scope, next);
    return next;
  }

  private isCurrentAutosaveGeneration(scope: string, generation: number): boolean {
    return this.autosaveGenerations.get(scope) === generation;
  }

  handleEntryPopupAction(
    event: PopupActionEvent,
    popupId: string,
    handlers: DocumentActionHandlers,
    runtimeConfig?: DocumentRuntimeConfig
  ): boolean {
    if (event.popupId !== popupId) {
      return false;
    }

    if (event.actionKey === 'line:changed') {
      this.applyLineRuntimeCalculations(event.payload, runtimeConfig);
      handlers.lineChanged?.(event.payload);
      return true;
    }

    if (event.actionKey === 'line:selection-changed') {
      handlers.lineSelectionChanged?.(event.payload);
      return true;
    }

    if (event.actionKey === 'header:changed') {
      this.applyHeaderRuntimeCalculations(runtimeConfig);
      handlers.headerChanged?.(event.payload);
      return true;
    }

    if (event.actionKey === 'header:interacted') {
      handlers.headerInteracted?.(event.payload);
      return true;
    }

    if (event.actionKey === 'cmd:autosave') {
      if (this.resolveLineChange(event.payload)) {
        return true;
      }

      handlers.autosave?.(event.payload);
      return true;
    }

    if (event.actionKey.startsWith('cmd:')) {
      const command = event.actionKey.slice('cmd:'.length);
      if (this.handleEntryCommand(command, event.payload, handlers.commands)) {
        return true;
      }
    }

    handlers.command?.(event.actionKey, event.payload);
    return true;
  }

  calculateLineTotals(
    lineRows: Record<string, unknown>[],
    headerData: Record<string, unknown> | undefined,
    lineConfig: LineConfig
  ) {
    const totalsConfig = lineConfig.totalsCalculation;
    if (!totalsConfig) {
      return this.lineCalculation.emptyTotals;
    }

    return this.lineCalculation.calculateLineTotals(lineRows, totalsConfig, headerData);
  }

  private applyLineRuntimeCalculations(
    payload: unknown,
    runtimeConfig?: DocumentRuntimeConfig
  ): void {
    const change = this.resolveLineChange(payload);
    const calculation = runtimeConfig?.lineConfig?.calculation;
    if (!change || !calculation) {
      this.recalculateRuntimeLineTotals(runtimeConfig);
      return;
    }

    const calculatedFields = this.lineCalculation.applyCalculations(
      change.row,
      calculation,
      runtimeConfig?.documentWindowConfig?.headerData
    );
    if (calculatedFields.length) {
      const payloadRecord = this.isRecord(payload) ? payload : undefined;
      const existingFields = this.toTextArray(payloadRecord?.['calculatedFields']);
      const nextFields = [
        ...existingFields,
        ...calculatedFields.filter((field) => !existingFields.includes(field)),
      ];
      change.calculatedFields = nextFields;
      if (payloadRecord) {
        payloadRecord['calculatedFields'] = nextFields;
      }
    }

    this.recalculateRuntimeLineTotals(runtimeConfig);
  }

  private applyHeaderRuntimeCalculations(runtimeConfig?: DocumentRuntimeConfig): void {
    const calculation = runtimeConfig?.lineConfig?.calculation;
    const lineRows = runtimeConfig?.documentWindowConfig?.lineRows ?? [];
    if (calculation) {
      for (const row of lineRows) {
        this.lineCalculation.applyCalculations(
          row,
          calculation,
          runtimeConfig?.documentWindowConfig?.headerData
        );
      }
    }

    this.recalculateRuntimeLineTotals(runtimeConfig);
  }

  private recalculateRuntimeLineTotals(runtimeConfig?: DocumentRuntimeConfig): void {
    const documentWindowConfig = runtimeConfig?.documentWindowConfig;
    const lineConfig = runtimeConfig?.lineConfig;
    if (!documentWindowConfig || !lineConfig?.totalsCalculation) {
      return;
    }

    documentWindowConfig.lineTotals = this.calculateLineTotals(
      documentWindowConfig.lineRows ?? [],
      documentWindowConfig.headerData,
      lineConfig
    );
  }

  private handleEntryCommand(
    command: string,
    payload: unknown,
    handlers?: DocumentCommandHandlers
  ): boolean {
    if (!handlers) {
      return false;
    }

    switch (command) {
      case 'save':
        handlers.save?.(payload);
        return true;
      case 'apply':
        handlers.apply?.(payload);
        return true;
      case 'line-new':
        handlers.lineNew?.(payload);
        return true;
      case 'line-insert':
        handlers.lineInsert?.(payload);
        return true;
      default:
        handlers.command?.(command, payload);
        return handlers.command !== undefined;
    }
  }

  resolveLineChange(payload: unknown): LineChangeEvent | null {
    if (!this.isRecord(payload)) {
      return null;
    }

    const row = payload['row'];
    const column = payload['column'];
    if (!this.isRecord(row) || !this.isRecord(column)) {
      return null;
    }

    return {
      row,
      field: this.toText(column['field'] ?? column['id']),
      value: payload['value'],
      calculatedFields: this.toTextArray(payload['calculatedFields'])
    };
  }

  private toTextArray(value: unknown): string[] {
    return Array.isArray(value)
      ? value.map((item) => this.toText(item).trim()).filter((item) => item.length > 0)
      : [];
  }

  setNumericFields(
    row: Record<string, unknown>,
    fieldKeys: string[],
    value: number
  ): void {
    for (const key of fieldKeys) {
      row[key] = value;
    }
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }

  private toNumber(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string') {
      const normalized = value.replace(/,/g, '').trim();
      if (!normalized) {
        return null;
      }

      const parsed = Number(normalized);
      return Number.isFinite(parsed) ? parsed : null;
    }

    return null;
  }

  private toText(value: unknown): string {
    return value === null || value === undefined ? '' : String(value);
  }

  private resolveErrorMessage(error: unknown): string {
    if (this.isRecord(error)) {
      const direct = this.toText(error['message']);
      if (direct.length) {
        return direct;
      }

      const nestedError = error['error'];
      if (this.isRecord(nestedError)) {
        const nested = this.toText(nestedError['message'] ?? nestedError['Message'] ?? nestedError['error_description']);
        if (nested.length) {
          return nested;
        }
      }
    }

    if (error instanceof Error && error.message.length) {
      return error.message;
    }

    return 'Save failed.';
  }

  private resolveFieldValueType(field: FieldConfig): FieldValueType {
    if (field.valueType) {
      return field.valueType;
    }

    if (field.type === 'number' || field.type === 'currency') {
      return 'number';
    }

    if (field.type === 'boolean') {
      return 'boolean';
    }

    if (field.type === 'date') {
      return 'date';
    }

    return 'text';
  }

  private coerceValue(value: unknown, valueType: FieldValueType | undefined): unknown {
    return normalizeFieldValue(value, valueType);
  }
}
