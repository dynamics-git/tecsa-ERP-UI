import { InjectionToken } from '@angular/core';
import { MonoTypeOperatorFunction, timeout } from 'rxjs';

export interface RuntimeTimeoutPolicy {
  /** Explicit host override only. Omitted means wait for the actual response. */
  requestTimeoutMs?: number;
  hydrationTimeoutMs?: number;
}

export const DEFAULT_RUNTIME_TIMEOUT_POLICY: RuntimeTimeoutPolicy = {};

/** No invented deadline for ERP work. Preserve deliberately supplied overrides. */
export function optionalRequestTimeout<T>(milliseconds?: number): MonoTypeOperatorFunction<T> {
  return milliseconds !== undefined && Number.isFinite(milliseconds) && milliseconds > 0
    ? timeout<T>(milliseconds)
    : source => source;
}

export const RUNTIME_TIMEOUT_POLICY = new InjectionToken<RuntimeTimeoutPolicy>(
  'RUNTIME_TIMEOUT_POLICY',
  {
    providedIn: 'root',
    factory: () => DEFAULT_RUNTIME_TIMEOUT_POLICY,
  },
);
