import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class EntryResponseNormalizerService {
  normalizeSingleRecordResponse(
    response: unknown,
    fallback: Record<string, unknown>,
  ): Record<string, unknown> {
    const mergeWithFallback = (source: Record<string, unknown>): Record<string, unknown> => {
      const merged: Record<string, unknown> = { ...fallback };
      for (const [key, value] of Object.entries(source)) {
        if (value !== null && value !== undefined && String(value).trim().length > 0) {
          merged[key] = value;
        }
      }
      return merged;
    };

    if (this.isRecord(response)) {
      if (this.isRecord(response['value'])) {
        return mergeWithFallback(response['value']);
      }

      if (Array.isArray(response['value'])) {
        const first = response['value'].find((item) => this.isRecord(item));
        return this.isRecord(first) ? mergeWithFallback(first) : fallback;
      }

      const nested = response['d'];
      if (this.isRecord(nested) && Array.isArray(nested['results'])) {
        const first = nested['results'].find((item) => this.isRecord(item));
        return this.isRecord(first) ? mergeWithFallback(first) : fallback;
      }

      return mergeWithFallback(response);
    }

    if (Array.isArray(response)) {
      const first = response.find((item) => this.isRecord(item));
      return this.isRecord(first) ? mergeWithFallback(first) : fallback;
    }

    return fallback;
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }
}