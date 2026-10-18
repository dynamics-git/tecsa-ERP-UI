import { Injectable } from '@angular/core';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { DataSourceConfig } from '../../platform/models/data-source-config.model';
import { FormSectionConfig } from '../../platform/models/field-config.model';
import { DataSourceService } from '../../platform/data/data-source.service';
import { EntryPayloadService } from '../../platform/data/entry-payload.service';
import { EntryRecordService } from '../../platform/data/entry-record.service';
import { EntrySavePort, EntrySaveRequest, EntrySaveResult } from '../../platform/data/entry-save.port';

@Injectable({
  providedIn: 'root'
})
export class EntrySaveService implements EntrySavePort {
  constructor(
    private readonly dataSource: DataSourceService,
    private readonly entryPayload: EntryPayloadService,
    private readonly entryRecord: EntryRecordService
  ) {}

  save(request: EntrySaveRequest): Observable<EntrySaveResult> {
    const dataSource = this.resolveDataSourceConfig(request);
    const headerSections = this.resolveHeaderSections(request);
    const modifiedAtKey = this.resolveModifiedAtKey(request);

    if (!dataSource || !headerSections.length) {
      return of({
        saved: false,
        errorMessage: 'Entry save configuration is missing (dataSourceConfig/headerSections).'
      });
    }

    const id = this.entryRecord.resolveRecordId(request.headerData, dataSource);
    if (!id) {
      return of({
        saved: false,
        errorMessage: 'Missing document identifier.'
      });
    }

    const fullPayload = this.entryPayload.buildHeaderUpdatePayload(request.headerData, headerSections);
    const payload = dataSource.transport === 'laravel' && dataSource.updateFields
      ? Object.fromEntries(Object.entries(fullPayload).filter(([key]) => dataSource.updateFields!.includes(key)))
      : fullPayload;
    if (dataSource.transport === 'laravel' && !Object.keys(payload).length) return of({ saved: true });
    return this.dataSource.update(dataSource, id, payload, Number(request.headerData['systemRowVersion'])).pipe(
      switchMap((response) => this.persistLineRows(request).pipe(
        map((lineSaveResult) => {
          if (!lineSaveResult.saved) {
            return lineSaveResult;
          }

          return {
            saved: true,
            modifiedAt: this.resolveModifiedAt(response, modifiedAtKey) ?? new Date().toISOString()
          } as EntrySaveResult;
        })
      )),
      catchError((error: unknown) =>
        of({
          saved: false,
          errorMessage: this.resolveErrorMessage(error)
        })
      )
    );
  }

  private resolveModifiedAt(response: unknown, modifiedAtKey: string): string | null {
    const record = this.asRecord(response);
    if (!record) {
      return null;
    }

    const modifiedAt = record[modifiedAtKey];
    if (modifiedAt === null || modifiedAt === undefined || modifiedAt === '') {
      return null;
    }

    return String(modifiedAt);
  }

  private resolveDataSourceConfig(request: EntrySaveRequest): DataSourceConfig | null {
    return request.dataSourceConfig ?? null;
  }

  private resolveHeaderSections(request: EntrySaveRequest): FormSectionConfig[] {
    return request.headerSections?.length ? request.headerSections : [];
  }

  private resolveModifiedAtKey(request: EntrySaveRequest): string {
    return request.modifiedAtKey?.trim() ?? '';
  }

  private persistLineRows(request: EntrySaveRequest): Observable<EntrySaveResult> {
    const lineDataSource = request.lineDataSourceConfig;
    const lineRows = request.lineRows ?? [];

    if (!lineDataSource || !lineRows.length) {
      return of({ saved: true });
    }

    const operations = lineRows
      .map((row) => this.buildLinePersistOperation(request.headerData, row, lineDataSource))
      .filter((operation): operation is Observable<unknown> => operation !== null);

    if (!operations.length) {
      return of({ saved: true });
    }

    return forkJoin(operations).pipe(
      map(() => ({ saved: true } as EntrySaveResult)),
      catchError((error: unknown) => of({
        saved: false,
        errorMessage: this.resolveErrorMessage(error)
      }))
    );
  }

  private buildLinePersistOperation(
    headerData: Record<string, unknown>,
    row: Record<string, unknown>,
    lineDataSource: DataSourceConfig
  ): Observable<unknown> | null {
    const rowId = this.entryRecord.resolveRecordId(row, lineDataSource);
    const payload = this.buildLinePayload(headerData, row, lineDataSource);

    if (rowId !== null && rowId !== undefined && rowId !== '' && lineDataSource.supportsUpdate !== false) {
      return this.dataSource.update(lineDataSource, rowId, payload);
    }

    if (lineDataSource.supportsCreate === false || !this.shouldCreateLine(payload, lineDataSource.parentKeyField)) {
      return null;
    }

    return this.dataSource.create(lineDataSource, payload);
  }

  private buildLinePayload(
    headerData: Record<string, unknown>,
    row: Record<string, unknown>,
    lineDataSource: DataSourceConfig
  ): Record<string, unknown> {
    const payload: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(row)) {
      if (key.startsWith('__')) {
        continue;
      }

      if (key === 'Id' || key === 'id' || key === 'SystemId' || key === 'systemId') {
        continue;
      }

       if (key === 'Number') {
        if (!('No' in payload) || payload['No'] === '' || payload['No'] === null || payload['No'] === undefined) {
          payload['No'] = value;
        }
        continue;
      }

      payload[key] = value;
    }

    delete payload['Number'];

    const parentKeyField = lineDataSource.parentKeyField?.trim();
    if (parentKeyField) {
      const parentValue = this.firstPresentValue([
        payload[parentKeyField],
        lineDataSource.documentNoField ? headerData[lineDataSource.documentNoField] : undefined,
        headerData[parentKeyField],
        headerData['Number'],
        headerData['No']
      ]);

      if (parentValue !== null && parentValue !== undefined && String(parentValue).trim().length > 0) {
        payload[parentKeyField] = parentValue;
      }
    }

    this.applyFixedParentFields(payload, lineDataSource.parentFixedFields);
    return payload;
  }

  private firstPresentValue(values: unknown[]): unknown {
    return values.find((value) => value !== null && value !== undefined && String(value).trim().length > 0);
  }

  private applyFixedParentFields(payload: Record<string, unknown>, fixedFields?: Record<string, unknown>): void {
    if (!fixedFields) {
      return;
    }

    for (const [key, value] of Object.entries(fixedFields)) {
      if (!key.trim()) {
        continue;
      }

      payload[key] = value;
    }
  }

  private shouldCreateLine(payload: Record<string, unknown>, parentKeyField?: string): boolean {
    const parentKey = parentKeyField?.trim();

    for (const [key, value] of Object.entries(payload)) {
      if (parentKey && key === parentKey) {
        continue;
      }

      if (key === 'Type') {
        continue;
      }

      if (typeof value === 'string' && value.trim().length > 0) {
        return true;
      }

      if (typeof value === 'number' && value !== 0) {
        return true;
      }

      if (typeof value === 'boolean' && value) {
        return true;
      }
    }

    return false;
  }

  private resolveErrorMessage(error: unknown): string {
    const nestedMessage = this.extractNestedErrorMessage(error);
    if (nestedMessage) {
      return nestedMessage;
    }

    if (error instanceof Error && error.message.trim()) {
      return error.message;
    }

    if (typeof error === 'string' && error.trim()) {
      return error;
    }

    const message = this.asRecord(error)?.['message'];
    if (typeof message === 'string' && message.trim()) {
      return message;
    }

    return 'Unable to save changes.';
  }

  private extractNestedErrorMessage(error: unknown): string {
    const outer = this.asRecord(error);
    if (!outer) {
      return '';
    }

    const body = this.asRecord(outer['error']);
    const bodyMessage = body?.['message'];
    if (typeof bodyMessage === 'string' && bodyMessage.trim()) {
      return bodyMessage.trim();
    }

    const nested = this.asRecord(body?.['error']);
    const nestedMessage = nested?.['message'];
    if (typeof nestedMessage === 'string' && nestedMessage.trim()) {
      return nestedMessage.trim();
    }

    const fromTopLevel = outer['message'];
    if (typeof fromTopLevel === 'string' && fromTopLevel.trim()) {
      return fromTopLevel.trim();
    }

    return '';
  }

  private asRecord(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== 'object') {
      return null;
    }

    return value as Record<string, unknown>;
  }
}
