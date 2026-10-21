import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class DocumentResponseNormalizerService {
  normalizeSingleRecordResponse(
    response: unknown,
    fallback: Record<string, unknown>,
  ): Record<string, unknown> {
    // A server-provided null or empty value is authoritative. Only omitted fields use the fallback.
    const mergeWithFallback = (source: Record<string, unknown>): Record<string, unknown> => ({
      ...fallback,
      ...source,
    });

    if (this.isRecord(response)) {
      if (this.isRecord(response['data'])) return { ...fallback, ...response['data'] };
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
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
