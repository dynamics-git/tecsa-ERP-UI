import { Injectable } from '@angular/core';
import { Observable, firstValueFrom, forkJoin, of } from 'rxjs';
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
}

@Injectable({
  providedIn: 'root'
})
export class LineCommandService {
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
      const targetRow = payloadRow ?? options.activeRow ?? lineRows[lineRows.length - 1];
      if (targetRow) {
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
    if (!persistedIds.length) {
      return of(void 0);
    }

    return forkJoin(persistedIds.map((id) => deleteById(id))).pipe(map(() => void 0));
  }

  async deleteRows(options: {
    lineRows: Record<string, unknown>[];
    payload: unknown;
    activeRow?: Record<string, unknown>;
    selectedIndexes?: number[];
    resolveId: (row: Record<string, unknown>) => unknown;
    deleteById: (id: unknown) => Observable<unknown>;
    confirmDelete?: (count: number) => Promise<boolean>;
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
      confirmed: false
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

    if (persistedIds.length) {
      await firstValueFrom(this.executePersistedDeletes(persistedIds, options.deleteById));
    }

    return {
      ...plan,
      persistedIds,
      deleted: true,
      confirmed: true
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
