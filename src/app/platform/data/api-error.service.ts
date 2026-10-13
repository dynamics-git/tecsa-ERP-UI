import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ApiErrorService {
  toMessage(error: unknown, fallback: string): string {
    if (error instanceof Error && error.message.trim()) {
      return this.trimCorrelationId(error.message);
    }

    if (typeof error === 'string' && error.trim()) {
      return this.trimCorrelationId(error);
    }

    if (this.isRecord(error)) {
      const outerError = error['error'];
      if (this.isRecord(outerError)) {
        const nestedError = outerError['error'];
        if (this.isRecord(nestedError) && typeof nestedError['message'] === 'string' && nestedError['message'].trim()) {
          return this.trimCorrelationId(nestedError['message']);
        }

        if (typeof outerError['message'] === 'string' && outerError['message'].trim()) {
          return this.trimCorrelationId(outerError['message']);
        }
      }

      if (typeof error['message'] === 'string' && error['message'].trim()) {
        return this.trimCorrelationId(error['message']);
      }
    }

    return this.trimCorrelationId(fallback);
  }

  private trimCorrelationId(raw: string): string {
    const marker = 'correlationid';
    const lowerRaw = raw.toLowerCase();
    const markerIndex = lowerRaw.indexOf(marker);
    const trimmed = markerIndex >= 0 ? raw.slice(0, markerIndex) : raw;
    return trimmed.trim().replace(/[\s,:-]+$/, '');
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }
}