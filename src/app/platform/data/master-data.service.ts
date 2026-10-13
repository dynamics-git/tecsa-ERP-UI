import { Injectable } from '@angular/core';
import { from, Observable, of } from 'rxjs';
import { catchError, map, mergeMap, reduce } from 'rxjs/operators';
import { DataSourceService } from './data-source.service';

export type MasterEndpointMap = Record<string, string[]>;

type CachedMasterList = {
  records: Record<string, unknown>[];
  cachedAt: number;
};

const MASTER_DATA_CACHE_TTL_MS = 5 * 60 * 1000;
const MASTER_DATA_FAILURE_TTL_MS = 30 * 1000;
const MASTER_DATA_BATCH_SIZE = 3;

@Injectable({
  providedIn: 'root',
})
export class MasterDataService {
  private readonly endpointCache = new Map<string, CachedMasterList>();
  private readonly failedEndpoints = new Map<string, number>();

  constructor(private readonly dataSource: DataSourceService) {}

  loadFirstAvailableList(endpoints: string[]): Observable<Record<string, unknown>[]> {
    const normalized = endpoints
      .map((endpoint) => endpoint.trim())
      .filter((endpoint) => endpoint.length > 0);

    const [first, ...rest] = normalized;
    if (!first) {
      return of([] as Record<string, unknown>[]);
    }

    const cached = this.endpointCache.get(first);
    if (cached && Date.now() - cached.cachedAt <= MASTER_DATA_CACHE_TTL_MS) {
      return of(cached.records);
    }

    if (cached) {
      this.endpointCache.delete(first);
    }

    const failedAt = this.failedEndpoints.get(first);
    if (failedAt && Date.now() - failedAt <= MASTER_DATA_FAILURE_TTL_MS) {
      return rest.length ? this.loadFirstAvailableList(rest) : of([] as Record<string, unknown>[]);
    }

    if (failedAt) {
      this.failedEndpoints.delete(first);
    }

    return this.dataSource.loadList({ endpoint: first }).pipe(
      map((response) => {
        const records = this.toRecordList(response);
        this.endpointCache.set(first, {
          records,
          cachedAt: Date.now(),
        });
        return records;
      }),
      catchError(() => {
        this.failedEndpoints.set(first, Date.now());
        return rest.length
          ? this.loadFirstAvailableList(rest)
          : of([] as Record<string, unknown>[]);
      }),
    );
  }

  loadMasterLists<T extends MasterEndpointMap>(
    mapConfig: T,
  ): Observable<{ [K in keyof T]: Record<string, unknown>[] }> {
    const entries = Object.entries(mapConfig) as Array<[keyof T, string[]]>;
    if (!entries.length) {
      return of({} as { [K in keyof T]: Record<string, unknown>[] });
    }

    return from(entries).pipe(
      mergeMap(
        ([key, endpoints]) =>
          this.loadFirstAvailableList(endpoints).pipe(
            map((records) => ({ key, records })),
          ),
        MASTER_DATA_BATCH_SIZE,
      ),
      reduce((acc, item) => {
        acc[item.key] = item.records;
        return acc;
      }, {} as { [K in keyof T]: Record<string, unknown>[] }),
    );
  }

  invalidate(endpoint?: string): void {
    const normalized = endpoint?.trim();
    if (!normalized) {
      this.endpointCache.clear();
      this.failedEndpoints.clear();
      return;
    }

    this.endpointCache.delete(normalized);
    this.failedEndpoints.delete(normalized);
  }

  toSelectOptions(
    source: unknown,
    valueFields: string[] = [],
    labelFields: string[] = [],
  ): Array<{ label: string; value: string }> {
    const valueKeys = valueFields.map((field) => field.trim()).filter((field) => field.length > 0);
    const labelKeys = labelFields.map((field) => field.trim()).filter((field) => field.length > 0);
    if (!valueKeys.length) {
      return [];
    }

    const records = this.toRecordList(source);
    return records
      .map((record) => {
        const value = this.readFirstText(record, valueKeys);
        const name = this.readFirstText(record, labelKeys);
        const label = name ? `${value} - ${name}` : value;
        return { label, value, record };
      })
      .filter((option) => option.value.length > 0);
  }

  toRecordList(source: unknown): Record<string, unknown>[] {
    if (Array.isArray(source)) {
      return source.filter((record): record is Record<string, unknown> => this.isRecord(record));
    }

    if (this.isRecord(source) && Array.isArray(source['value'])) {
      return source['value'].filter((record): record is Record<string, unknown> =>
        this.isRecord(record),
      );
    }

    return [];
  }

  private readFirstText(record: Record<string, unknown>, fields: string[]): string {
    for (const field of fields) {
      const value = this.toText(record[field]);
      if (value.length > 0) {
        return value;
      }
    }

    return '';
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }

  private toText(value: unknown): string {
    return value === null || value === undefined ? '' : String(value);
  }
}
