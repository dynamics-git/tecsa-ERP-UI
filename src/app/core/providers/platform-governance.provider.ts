import { Provider } from '@angular/core';
import {
  RUN_MODAL_STACK_POLICY,
  RUN_MODAL_CONFIG_RESOLVER,
  RunModalConfigResolver
} from '../../platform/public-api';
import { loadRunModalConfigModule } from '../services/run-modal-config-registry';

const runModalConfigResolver: RunModalConfigResolver = async (pageId: string) => {
  return loadRunModalConfigModule(pageId);
};

export function providePlatformGovernance(): Provider[] {
  return [
    {
      provide: RUN_MODAL_CONFIG_RESOLVER,
      useValue: runModalConfigResolver
    },
    {
      provide: RUN_MODAL_STACK_POLICY,
      useValue: {
        maxDepth: 50,
        onOverflow: 'replace-top'
      }
    }
  ];
}
