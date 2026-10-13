import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
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
    return this.createRecursive(config, payload);
  }

  private createRecursive(
    config: DataSourceConfig,
    payload: Record<string, unknown>
  ): Observable<unknown | null> {
    if (!Object.keys(payload).length) {
      return of(null);
    }

    return this.dataSource.create(config, payload).pipe(
      map((response) => response),
      catchError((error: unknown) => {
        const propertyName = this.extractUnknownPropertyName(error);
        if (!propertyName || !(propertyName in payload)) {
          return of(null);
        }

        const retryPayload = { ...payload };
        delete retryPayload[propertyName];
        return this.createRecursive(config, retryPayload);
      })
    );
  }

  private extractUnknownPropertyName(error: unknown): string {
    if (!this.isRecord(error)) {
      return '';
    }

    const body = error['error'];
    if (!this.isRecord(body)) {
      return '';
    }

    const nested = body['error'];
    if (!this.isRecord(nested)) {
      return '';
    }

    const message = this.toText(nested['message']);
    const match = message.match(/property\s+'([^']+)'\s+does\s+not\s+exist/i);
    return match?.[1] ?? '';
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }

  private toText(value: unknown): string {
    return value === null || value === undefined ? '' : String(value);
  }
}
