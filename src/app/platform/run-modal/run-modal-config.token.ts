import { InjectionToken } from '@angular/core';

export type RunModalContext = Record<string, unknown>;

export type RunModalConfigModule = {
  [key: string]: unknown;
};

export type RunModalConfigResolver = (pageId: string) => Promise<RunModalConfigModule | undefined>;

export const RUN_MODAL_CONFIG_RESOLVER = new InjectionToken<RunModalConfigResolver>(
  'RUN_MODAL_CONFIG_RESOLVER'
);
