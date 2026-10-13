import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class RuntimeValueMapperService {
  isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }

  toText(value: unknown): string {
    return value === null || value === undefined ? '' : String(value);
  }

  toNumber(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string') {
      const normalized = value.replace(/,/g, '').trim();
      if (!normalized) {
        return null;
      }

      const parsed = Number(normalized);
      return Number.isFinite(parsed) ? parsed : null;
    }

    return null;
  }

  toRecordList(source: unknown): Record<string, unknown>[] {
    if (Array.isArray(source)) {
      return source.filter((record): record is Record<string, unknown> => this.isRecord(record));
    }

    if (this.isRecord(source) && Array.isArray(source['value'])) {
      return source['value'].filter((record): record is Record<string, unknown> => this.isRecord(record));
    }

    return [];
  }

  toODataId(value: unknown): string {
    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }

    const normalized = this.toText(value).trim();
    if (!normalized.length) {
      return "''";
    }

    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(normalized)) {
      return normalized;
    }

    return `'${normalized.replace(/'/g, "''")}'`;
  }

  resolveApiEndpoints(source: unknown): string[] {
    const endpoints = Array.isArray(source) ? source : typeof source === 'string' ? [source] : [];
    return endpoints
      .map((endpoint) => this.toText(endpoint).trim())
      .filter((endpoint) => endpoint.length > 0);
  }

  resolveConfiguredFields(source: string | string[] | undefined): string[] {
    const fields = Array.isArray(source) ? source : source ? [source] : [];
    return fields.map((field) => field.trim()).filter((field) => field.length > 0);
  }
}
