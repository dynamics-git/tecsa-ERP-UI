import { InjectionToken } from '@angular/core';

export interface RuntimeTimeoutPolicy {
  requestTimeoutMs: number;
  hydrationTimeoutMs: number;
}

export const DEFAULT_RUNTIME_TIMEOUT_POLICY: RuntimeTimeoutPolicy = {
  requestTimeoutMs: 15000,
  hydrationTimeoutMs: 8000,
};

export const RUNTIME_TIMEOUT_POLICY = new InjectionToken<RuntimeTimeoutPolicy>(
  'RUNTIME_TIMEOUT_POLICY',
  {
    providedIn: 'root',
    factory: () => DEFAULT_RUNTIME_TIMEOUT_POLICY,
  },
);
