import { Injectable, InjectionToken } from '@angular/core';
import { Observable, of } from 'rxjs';
import { DataSourceConfig } from '../models/data-source-config.model';
import { FormSectionConfig } from '../models/field-config.model';

export interface EntrySaveRequest {
  scope: string;
  headerData: Record<string, unknown>;
  lineRows?: Record<string, unknown>[];
  lineDataSourceConfig?: DataSourceConfig;
  meta?: Record<string, unknown>;
  dataSourceConfig?: DataSourceConfig;
  headerSections?: FormSectionConfig[];
  modifiedAtKey?: string;
}

export interface EntrySaveResult {
  saved: boolean;
  modifiedAt?: string;
  errorCode?: string;
  errorMessage?: string;
}

export interface EntrySavePort {
  save(request: EntrySaveRequest): Observable<EntrySaveResult>;
}

export const ENTRY_SAVE_PORT = new InjectionToken<EntrySavePort>('ENTRY_SAVE_PORT');

@Injectable({
  providedIn: 'root'
})
export class NoopEntrySavePort implements EntrySavePort {
  save(request: EntrySaveRequest): Observable<EntrySaveResult> {
    void request;
    return of({
      saved: false,
      errorMessage: 'Entry save port is not configured.'
    });
  }
}
