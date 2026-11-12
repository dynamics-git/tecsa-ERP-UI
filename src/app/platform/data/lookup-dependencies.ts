import type { FieldConfig, FieldLookupConfig } from '../models/field-config.model';

/** Display a saved value from the row itself; fill maps describe explicit name projections. */
export function selectedLookupCaption(field: Pick<FieldConfig, 'lookup' | 'fill' | 'displayFormat' | 'labelField' | 'bindLabel'> & {key?: string; field?: string; id?: string}, record: Record<string, unknown>): string | undefined {
  if (!field.lookup) return undefined;
  if (!field.displayFormat && (field.labelField || field.bindLabel)) return undefined;
  const key = field.key ?? field.field ?? field.id;
  if (!key) return undefined;
  const value = record[key];
  if (value === undefined || value === null || value === '') return undefined;
  const valueField = field.lookup.valueField ?? 'systemId';
  if (!field.displayFormat && field.lookup.displayField === valueField) return String(value);
  const sourceValue = (source: string): unknown => {
    if (source === valueField) return value;
    const target = Object.entries(field.fill ?? {}).find(([, sources]) => sources === source || Array.isArray(sources) && sources.length === 1 && sources[0] === source)?.[0];
    return target ? record[target] : undefined;
  };
  let missing = false;
  const render = (source: string): string => {
    const result = sourceValue(source);
    if (result === undefined || result === null || result === '') missing = true;
    return String(result ?? '');
  };
  const caption = field.displayFormat
    ? field.displayFormat.replace(/\[([^\]]+)\]/g, (_, source: string) => render(source))
    : render(field.lookup.displayField);
  return missing ? undefined : caption;
}

export interface LookupDependencyField {
  key?: string; field?: string; id?: string;
  optionsDataKey?: string;
  lookup?: FieldLookupConfig;
}
function read(record: Record<string, unknown>, path: string): unknown {
  if (path in record) return record[path];
  return path.split('.').reduce<unknown>((value, field) => value && typeof value === 'object'
    ? (value as Record<string, unknown>)[field] : undefined, record);
}
function literal(value: unknown, type?: string): string | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  if (type === 'number') return /^-?\d+(?:\.\d+)?$/.test(String(value)) ? String(value) : undefined;
  if (type === 'boolean') return value === true || value === 'true' ? 'true' : value === false || value === 'false' ? 'false' : undefined;
  return typeof value === 'string' || typeof value === 'number' ? "'" + String(value).replace(/'/g, "''") + "'" : undefined;
}
/** Builds one identical constraint for initial, searched and continuation requests. */
export function lookupQuery(lookup: FieldLookupConfig, record: Record<string, unknown>, search = '', header: Record<string, unknown> = {}): {ready: boolean; endpoint?: string; filter?: string} {
  let endpoint = lookup.endpoint;
  const clauses: string[] = [];
  if (lookup.filter?.trim()) clauses.push(lookup.filter.trim());
  for (const dependency of lookup.dependsOn ?? []) {
    if (!/^[A-Za-z_]\w*(?:[./][A-Za-z_]\w*)*$/.test(dependency.field)) return {ready: false};
    const value = literal(read(dependency.source === 'header' ? header : record, dependency.valueFrom), dependency.valueType);
    if (value === undefined) return {ready: false};
    if (dependency.in === 'path') {
      const raw = read(dependency.source === 'header' ? header : record, dependency.valueFrom);
      if (typeof raw !== 'string' || !/^[A-Za-z0-9_-]+$/.test(raw)) return {ready: false};
      endpoint = endpoint.replaceAll('{' + dependency.field + '}', encodeURIComponent(raw));
    } else clauses.push(dependency.field + ' eq ' + value);
  }
  if (/[{}]/.test(endpoint)) return {ready: false};
  if (search.trim()) {
    const query = search.trim().replace(/'/g, "''");
    clauses.push((lookup.searchFields ?? [lookup.displayField]).map(field => "contains(" + field + ", '" + query + "')").join(' or '));
  }
  return {ready: true, endpoint, filter: clauses.length ? clauses.map(clause => '(' + clause + ')').join(' and ') : undefined};
}
/** Called only after an actual edit; initial hydration never clears saved values. */
export function clearDependentLookups(fields: LookupDependencyField[], changedFields: string[], record: Record<string, unknown>, source: 'record' | 'header' = 'record'): {updates: Record<string, unknown>; previous: Record<string, unknown>; invalidated: string[]} {
  const changed = changedFields.map(key => ({key, source}));
  const processed = new Set(source === 'record' ? changedFields : []);
  const updates: Record<string, unknown> = {};
  const previous: Record<string, unknown> = {};
  const invalidated: string[] = [];
  let progress = true;
  while (progress) {
    progress = false;
    for (const field of fields) {
      const key = field.field ?? field.key ?? field.id;
      if (!key || processed.has(key) || !field.lookup?.dependsOn?.some(dependency => changed.some(change => (dependency.source ?? 'record') === change.source && (dependency.valueFrom === change.key || dependency.valueFrom.startsWith(change.key + '.'))))) continue;
      processed.add(key); changed.push({key, source:'record'}); invalidated.push(key); progress = true;
      record[field.optionsDataKey ?? '__options_' + key] = [];
      if (record[key] !== null && record[key] !== undefined && record[key] !== '') {
        previous[key] = record[key]; updates[key] = null; record[key] = null;
      }
    }
  }
  return {updates, previous, invalidated};
}
