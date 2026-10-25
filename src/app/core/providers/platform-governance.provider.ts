import { NOTIFICATION_TARGET_RESOLVER } from '../../platform/public-api';
import { runModalPageModules } from '../../features/run-modal-page-modules';
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
    {provide:NOTIFICATION_TARGET_RESOLVER,useValue:(target:{resource:string},record:Record<string,unknown>)=>{
      for(const module of runModalPageModules)for(const value of Object.values(module)){
        const page=value as {pageId?:string;dataSource?:{endpoint:string}};
        if(page?.pageId && page.dataSource?.endpoint==='/' + target.resource)return {pageId:page.pageId,headerData:record};
      }
      return undefined;
    }},
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
