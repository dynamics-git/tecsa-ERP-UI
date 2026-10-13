import { Injectable } from '@angular/core';
import { FieldFillConfig } from '../models/field-config.model';

export interface LineOption {
  label: string;
  value: unknown;
}

export interface LineMasterBucket {
  options: LineOption[];
  records: Record<string, unknown>[];
}

export interface LineMasterRegistry {
  defaultType: string;
  emptyType: string;
  byType: Record<string, LineMasterBucket>;
  aliases?: Record<string, string>;
}

export interface LineTypeChangeProfile {
  clearFields: string[];
  zeroFields: string[];
  optionFieldMap?: Record<string, LineOption[]>;
  numberOptionFieldKey?: string;
}

@Injectable({
  providedIn: 'root',
})
export class LineMasterService {
  resolveType(rawType: unknown, registry: LineMasterRegistry): string {
    const normalized = this.toText(rawType).trim();
    if (!normalized) {
      return registry.emptyType;
    }

    return registry.aliases?.[normalized] ?? normalized;
  }

  getOptionsForType(type: string, registry: LineMasterRegistry): LineOption[] {
    if (type === registry.emptyType) {
      return [];
    }

    return registry.byType[type]?.options ?? [];
  }

  applyFill(
    row: Record<string, unknown>,
    master: Record<string, unknown>,
    fill: FieldFillConfig | undefined,
  ): void {
    if (!fill) {
      return;
    }

    for (const [targetField, sourceFields] of Object.entries(fill)) {
      const value = this.readFirstSourceValue(master, sourceFields);
      if (value !== undefined) {
        row[targetField] = value;
      }
    }
  }

  applyTypeChange(
    row: Record<string, unknown>,
    rawType: unknown,
    registry: LineMasterRegistry,
    profile: LineTypeChangeProfile,
  ): string {
    const type = this.resolveType(rawType, registry);
    const clearFields = profile.clearFields;
    const zeroFields = profile.zeroFields;

    for (const field of clearFields) {
      row[field] = '';
    }

    for (const field of zeroFields) {
      row[field] = 0;
    }

    this.assignTypeOptions(
      row,
      type,
      registry,
      profile.optionFieldMap,
      profile.numberOptionFieldKey,
    );
    return type;
  }

  assignTypeOptions(
    row: Record<string, unknown>,
    type: string,
    registry: LineMasterRegistry,
    optionFieldMap?: Record<string, LineOption[]>,
    numberOptionFieldKey = '',
  ): void {
    if (numberOptionFieldKey) {
      row[numberOptionFieldKey] = this.getOptionsForType(type, registry);
    }

    if (!optionFieldMap) {
      return;
    }

    for (const [field, options] of Object.entries(optionFieldMap)) {
      row[field] = options;
    }
  }

  private readFirstSourceValue(
    source: Record<string, unknown>,
    fields: string | string[],
  ): unknown {
    const candidates = Array.isArray(fields) ? fields : [fields];
    for (const field of candidates) {
      const value = source[field];
      if (value !== null && value !== undefined && String(value).length) {
        return value;
      }
    }

    return undefined;
  }

  private toText(value: unknown): string {
    return value === null || value === undefined ? '' : String(value);
  }
}
