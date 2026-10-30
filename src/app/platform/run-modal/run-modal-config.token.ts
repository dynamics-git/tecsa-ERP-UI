import { InjectionToken } from '@angular/core';

export type RunModalContext = Record<string, unknown>;

export type PageModule = {
  [key: string]: unknown;
};

export type RunModalConfigResolver = (pageId: string) => Promise<PageModule | undefined>;

export const RUN_MODAL_CONFIG_RESOLVER = new InjectionToken<RunModalConfigResolver>(
  'RUN_MODAL_CONFIG_RESOLVER',
  {providedIn:'root',factory:()=>async()=>undefined}
);
