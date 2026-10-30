import { NOTIFICATION_TARGET_RESOLVER } from '../../platform/public-api';
import { featurePageModules } from '../../features/feature-pages.generated';
import { Provider } from '@angular/core';
import {
  RUN_MODAL_STACK_POLICY,
  RUN_MODAL_CONFIG_RESOLVER,
  RunModalConfigResolver
} from '../../platform/public-api';
import { loadPageModule } from '../services/page-registry';

const runModalConfigResolver: RunModalConfigResolver = async (pageId: string) => {
  return loadPageModule(pageId);
};

export function providePlatformGovernance(): Provider[] {
  return [
    {provide:NOTIFICATION_TARGET_RESOLVER,useValue:(target:{resource:string},record:Record<string,unknown>)=>{
      for(const module of featurePageModules)for(const value of Object.values(module)){
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
