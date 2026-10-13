import { InjectionToken } from '@angular/core';

export interface RunModalStackPolicy {
  maxDepth: number;
  onOverflow: 'block' | 'replace-top';
}

export const DEFAULT_RUN_MODAL_STACK_POLICY: RunModalStackPolicy = {
  maxDepth: 50,
  onOverflow: 'block'
};

export const RUN_MODAL_STACK_POLICY = new InjectionToken<RunModalStackPolicy>('RUN_MODAL_STACK_POLICY');
