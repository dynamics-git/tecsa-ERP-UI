import { Injectable, InjectionToken } from '@angular/core';
import { Observable, of } from 'rxjs';
import { DataSourceConfig } from '../models/data-source-config.model';
import { FormSectionConfig } from '../models/field-config.model';

export interface DocumentSaveRequest {
  scope: string;
  headerData: Record<string, unknown>;
  lineRows?: Record<string, unknown>[];
  lineDataSourceConfig?: DataSourceConfig;
  meta?: Record<string, unknown>;
  dataSourceConfig?: DataSourceConfig;
  headerSections?: FormSectionConfig[];
  modifiedAtKey?: string;
}

export interface DocumentSaveResult {
  saved: boolean;
  modifiedAt?: string;
  errorCode?: string;
  errorMessage?: string;
}

export interface DocumentSavePort {
  save(request: DocumentSaveRequest): Observable<DocumentSaveResult>;
}

export const DOCUMENT_SAVE_PORT = new InjectionToken<DocumentSavePort>('DOCUMENT_SAVE_PORT');

@Injectable({
  providedIn: 'root'
})
export class NoopDocumentSavePort implements DocumentSavePort {
  save(request: DocumentSaveRequest): Observable<DocumentSaveResult> {
    void request;
    return of({
      saved: false,
      errorMessage: 'Document save port is not configured.'
    });
  }
}
