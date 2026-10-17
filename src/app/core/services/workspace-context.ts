import { Injectable } from '@angular/core';
export function workspaceSlug(pathname:string):string {
 return /^\/w\/([a-z0-9][a-z0-9-]{2,99})(?:\/|$)/.exec(pathname)?.[1]??'';
}
@Injectable({providedIn:'root'})
export class WorkspaceContext {
 readonly slug=workspaceSlug(typeof window==='undefined'?'/':window.location.pathname);
 readonly baseHref=this.slug?'/w/'+this.slug+'/':'/';
 apiUrl(url:string,base:string):string {
  const root=base.replace(/\/$/,'');
  return this.slug && url.startsWith(root+'/')?root+'/workspaces/'+this.slug+url.slice(root.length):url;
 }
 storageKey(key:string):string{return this.slug?'erp-workspace:'+this.slug+':'+key:key;}
}
