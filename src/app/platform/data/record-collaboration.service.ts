import { Injectable, inject } from '@angular/core';
import { DataSourceService } from './data-source.service';
import { RestService } from '../../core/services/rest.service';
import { SessionService } from '../../core/services/session.service';
import { WorkspaceContext } from '../../core/services/workspace-context';
import type { FactBoxContext } from '../models/fact-box-context.model';
import { Observable } from 'rxjs';

export interface CollaborationEntry {
  systemId: string;
  systemRowVersion: number;
  author: string;
  systemCreatedAt: string;
  systemModifiedAt: string;
  body?: string;
  fileName?: string;
  byteSize?: number;
  mediaType?: string;
}
export interface CollaborationPage {
  data: CollaborationEntry[];
  meta: { currentPage: number; lastPage: number; total: number };
  capabilities: { read: boolean; create: boolean; modify: boolean; delete: boolean };
}
/** No cache or alternate routing: consume the parent's registered API through RestService. */
@Injectable({ providedIn: 'root' })
export class RecordCollaborationService {
  private readonly rest = inject(RestService);
  private readonly source = inject(DataSourceService);
  private readonly session = inject(SessionService);
  private readonly workspace = inject(WorkspaceContext);
  scope(): string {
    return JSON.stringify([this.workspace.slug, this.session.Company, this.session.UserId]);
  }
  path(context: FactBoxContext, kind: 'notes' | 'attachments'): string {
    if (!context.recordEndpoint || !context.companyId || context.companyId !== this.session.Company)
      throw new Error('Select a saved record in the current company.');
    return (
      '/companies/' + encodeURIComponent(context.companyId) + context.recordEndpoint + '/' + kind
    );
  }
  list(path: string, page: number): Observable<unknown> {
    return this.rest.get(path + '?page=' + page, { suppressGlobalErrorDialog: true });
  }
  saveNote(path: string, body: string, entry?: CollaborationEntry): Observable<unknown> {
    return entry
      ? this.source.update({ endpoint: path }, entry.systemId, { body }, entry.systemRowVersion)
      : this.source.create({ endpoint: path }, { body });
  }
  remove(path: string, entry: CollaborationEntry): Observable<unknown> {
    return this.source.delete({ endpoint: path }, entry.systemId, entry.systemRowVersion);
  }
  upload(path: string, file: File): Observable<unknown> {
    const data = new FormData();
    data.append('file', file);
    return this.rest.upload(path, data);
  }
  download(path: string, entry: CollaborationEntry): Observable<Blob> {
    return this.rest.download(path + '/' + entry.systemId + '/content');
  }
}
