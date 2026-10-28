import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { DataSourceConfig } from '../models/data-source-config.model';
import { DataSourceService } from './data-source.service';

@Injectable({
  providedIn: 'root'
})
export class DraftCreateService {
  constructor(private readonly dataSource: DataSourceService) {}

  createWithUnknownPropertyFallback(
    config: DataSourceConfig,
    payload: Record<string, unknown>
  ): Observable<unknown | null> {
    // Retain the public entry point, but never infer an omission contract from an error.
    // Explicit payload contracts remain owned by DataSourceService.
    if (!Object.keys(payload).length) return of(null);
    return this.dataSource.create(config, payload);
  }
}
