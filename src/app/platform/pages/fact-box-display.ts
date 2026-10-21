import { formatRecordValue } from './record-value-formatter';
export interface DetailField { field?: string; label: string; type?: string; currencyCode?: string; hidden?: boolean; factBox?: boolean | {show?: boolean}; order?: number; }
export function auditLabel(field: string): string {
  const labels: Record<string,string> = {systemcreatedat:'Created at',systemcreatedby:'Created by',systemmodifiedat:'Modified at',systemmodifiedby:'Modified by'};
  return labels[field.replace(/_/g,'').toLowerCase()] ?? '';
}
export function automaticDetailFields(columns: DetailField[], row: Record<string,unknown>): DetailField[] {
  const fields: DetailField[]=[]; const seen=new Set<string>();
  for(const column of columns) {
    const key=column.field ?? ''; seen.add(key.toLowerCase());
    if(!key || column.hidden || column.factBox===false || (typeof column.factBox==='object' && column.factBox.show===false)) continue;
    const value=row[key];
    if(value===null || value===undefined || typeof value==='object') continue;
    fields.push({...column,label:auditLabel(key)||column.label});
  }
  for(const [field,value] of Object.entries(row)) {
    if(fields.length>=24) break;
    if(seen.has(field.toLowerCase()) || value==null || typeof value==='object') continue;
    if(/password|token|secret|credential|authorization|hash|salt|etag|rowversion/i.test(field) || /^(systemId|id|companyId|workspaceId|tenantId|createdBy|modifiedBy|__.*)$/i.test(field)) continue;
    fields.push({field,label:auditLabel(field)||field.replace(/([a-z0-9])([A-Z])/g,'$1 $2').replace(/_/g,' ').replace(/^./,c=>c.toUpperCase()),type:typeof value==='boolean'?'boolean':typeof value==='number'?'number':'text'});
  }
  return fields;
}
export function detailValue(row: Record<string,unknown>, field: DetailField, user: {id:string;name:string}): string {
  const key=field.field ?? ''; const value=row[key]; const audit=key.replace(/_/g,'').toLowerCase();
  if(/^(system)?(created|modified)at$/.test(audit)) return formatRecordValue(value,{type:'datetime'});
  if(/^(system)?(created|modified)by$/.test(audit)) {
    if(value==null || value==='') return '';
    const supplied=row[key+'Name'];
    if(typeof supplied==='string' && supplied.trim()) return supplied;
    return String(value).toLowerCase()===user.id.toLowerCase() && user.name ? user.name : 'User name unavailable';
  }
  return formatRecordValue(value,field);
}
