import type { LineConfig } from '../models/line-config.model';
import { fieldIsReadonly } from '../models/field-state';
import { RecordDeleteService } from '../data/record-delete.service';
import { Injectable, inject } from '@angular/core';
import { Observable, defer, from } from 'rxjs';
import { map } from 'rxjs/operators';

export interface LineDeletePlan {
  targetRows: Record<string, unknown>[];
  remainingRows: Record<string, unknown>[];
  persistedIds: unknown[];
  selectedIndexes: number[];
}

export interface LineDeleteResult extends LineDeletePlan {
  deleted: boolean;
  confirmed: boolean;
  failures: Array<{target: Record<string, unknown>; error: unknown}>;
}

@Injectable({
  providedIn: 'root'
})
export class LineCommandService {
  private readonly deletes = inject(RecordDeleteService);
  /** Copy only declared, editable create inputs. Identity/ownership/calculations never transfer. */
  copyEditableValues(source: Record<string, unknown>, draft: Record<string, unknown>, config: LineConfig): Record<string, unknown> {
    const calculated = Array.isArray(config.calculation) ? config.calculation : config.calculation?.rules ?? [];
    const protectedFields = new Set([
      'systemId', 'id', 'systemRowVersion', 'systemCreatedAt', 'systemCreatedBy', 'systemModifiedAt', 'systemModifiedBy',
      'companyId', 'status', config.dataSource.keyField, config.lineKeyField, config.parentKeyField,
      config.dataSource.parentKeyField, ...Object.keys(config.dataSource.parentFixedFields ?? {}), ...Object.keys(config.dataSource.parentFieldMap ?? {}),
      ...calculated.filter(rule => rule.targetSource !== 'header').map(rule => rule.target),
    ]);
    const values: Record<string, unknown> = {};
    for (const field of config.dataSource.createFields ?? []) {
      const column = config.columns.find(column => (column.field ?? column.id) === field);
      if (!column || column.hidden || column.cellType === 'icon' || protectedFields.has(field) || /^(system(id|rowversion|createdat|createdby|modifiedat|modifiedby)|companyid|lineno|status)$/i.test(field.replace(/_/g,'')) || field.startsWith('__') ||
          fieldIsReadonly(column, source) || fieldIsReadonly(column, draft) || source['__lookupRestricted_' + field] === true ||
          column.editableWhen && !column.editableWhen.values.includes(source[column.editableWhen.field])) continue;
      if (Object.hasOwn(source, field)) values[field] = structuredClone(source[field]);
    }
    return values;
  }

  planDeleteRequest(options: {
    lineRows: Record<string, unknown>[];
    payload: unknown;
    activeRow?: Record<string, unknown>;
    selectedIndexes?: number[];
    idFields?: string[];
  }): LineDeletePlan {
    const lineRows = options.lineRows ?? [];
    const payloadSelectedIndexes = this.resolvePayloadSelectedIndexes(options.payload);
    const selectedIndexes = payloadSelectedIndexes.length ? payloadSelectedIndexes : (options.selectedIndexes ?? []);

    let targetRows: Record<string, unknown>[] = [];
    if (selectedIndexes.length) {
      const indexSet = new Set(selectedIndexes.filter((index) => index >= 0 && index < lineRows.length));
      targetRows = lineRows.filter((_row, index) => indexSet.has(index));
    } else {
      const payloadRow = this.resolvePayloadRow(options.payload);
      const targetRow = payloadRow ?? options.activeRow;
      if (targetRow && lineRows.includes(targetRow)) {
        targetRows = [targetRow];
      }
    }

    const remainingRows = lineRows.filter((row) => !targetRows.includes(row));
    const persistedIds = this.resolvePersistedIds(targetRows, options.idFields ?? ['SystemId', 'systemId', 'Id', 'id']);

    return {
      targetRows,
      remainingRows,
      persistedIds,
      selectedIndexes: [...new Set(selectedIndexes)].sort((a, b) => a - b)
    };
  }

  executePersistedDeletes(
    persistedIds: unknown[],
    deleteById: (id: unknown) => Observable<unknown>
  ): Observable<void> {
    return defer(() => from(this.deletes.execute({targets: persistedIds, resolveId: id => id, deleteById}))).pipe(map(result => {
      if (result.failures.length) throw result.failures[0].error;
    }));
  }

  async deleteRows(options: {
    lineRows: Record<string, unknown>[];
    payload: unknown;
    activeRow?: Record<string, unknown>;
    selectedIndexes?: number[];
    resolveId: (row: Record<string, unknown>) => unknown;
    deleteById: (id: unknown) => Observable<unknown>;
    confirmDelete?: (count: number) => Promise<boolean>;
    canContinue?: () => boolean;
  }): Promise<LineDeleteResult> {
    const plan = this.planDeleteRequest({
      lineRows: options.lineRows,
      payload: options.payload,
      activeRow: options.activeRow,
      selectedIndexes: options.selectedIndexes
    });

    const resultBase = {
      ...plan,
      deleted: false,
      confirmed: false,
      failures: [] as LineDeleteResult['failures']
    };

    if (!plan.targetRows.length) {
      return resultBase;
    }

    const confirmed = options.confirmDelete ? await options.confirmDelete(plan.targetRows.length) : true;
    if (!confirmed) {
      return resultBase;
    }

    const persistedIds = this.uniqueIds(
      plan.targetRows
        .map((row) => options.resolveId(row))
        .filter((id) => id !== null && id !== undefined && String(id).trim().length > 0)
    );

    const result = await this.deletes.execute({
      targets: plan.targetRows,
      resolveId: options.resolveId,
      deleteById: options.deleteById,
      allowLocal: true,
      canContinue: options.canContinue,
    });
    return {
      ...plan,
      targetRows: result.deleted,
      remainingRows: options.lineRows.filter(row => !result.deleted.includes(row)),
      persistedIds,
      deleted: result.deleted.length > 0,
      confirmed: true,
      failures: result.failures,
    };
  }

  private resolvePayloadSelectedIndexes(payload: unknown): number[] {
    if (!this.isRecord(payload)) {
      return [];
    }

    const selectedIndexes = payload['selectedIndexes'];
    if (!Array.isArray(selectedIndexes)) {
      return [];
    }

    const normalized = selectedIndexes
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value) && value >= 0);

    return [...new Set(normalized)].sort((a, b) => a - b);
  }

  private resolvePayloadRow(payload: unknown): Record<string, unknown> | undefined {
    if (!this.isRecord(payload)) {
      return undefined;
    }

    const row = payload['row'];
    return this.isRecord(row) ? row : undefined;
  }

  private resolvePersistedIds(rows: Record<string, unknown>[], idFields: string[]): unknown[] {
    const ids = rows
      .map((row) => {
        for (const field of idFields) {
          const value = row[field];
          if (value !== undefined && value !== null && String(value).trim().length > 0) {
            return value;
          }
        }

        return undefined;
      })
      .filter((value) => value !== undefined && value !== null && String(value).trim().length > 0) as unknown[];

    const seen = new Set<string>();
    const unique: unknown[] = [];

    for (const id of ids) {
      const key = String(id).trim();
      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      unique.push(id);
    }

    return unique;
  }

  private uniqueIds(ids: unknown[]): unknown[] {
    const seen = new Set<string>();
    const unique: unknown[] = [];

    for (const id of ids) {
      const key = String(id).trim();
      if (!key || seen.has(key)) {
        continue;
      }

      seen.add(key);
      unique.push(id);
    }

    return unique;
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }
}
