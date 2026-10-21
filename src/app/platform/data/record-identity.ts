import type { RecordIdentityConfig } from '../models/record-identity.model';
import type { ListPageConfig } from '../models/page-config.model';
import { ENTITY_CONTRACT_PROFILES } from './entity-contract-profiles';

function text(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
}
function read(row: unknown, path?: string): string {
  if (!path || !row || typeof row !== 'object') return '';
  const record = row as Record<string, unknown>;
  const direct = Object.keys(record).find(key => key.toLowerCase() === path.toLowerCase());
  if (direct) return text(record[direct]);
  return text(path.split('.').reduce<unknown>((value, key) => {
    if (!value || typeof value !== 'object') return undefined;
    const object = value as Record<string, unknown>;
    const match = Object.keys(object).find(candidate => candidate.toLowerCase() === key.toLowerCase());
    return match ? object[match] : undefined;
  }, row));
}
export function resourceIdentity(endpoint?: string, profileKey?: string): RecordIdentityConfig {
  const resource = endpoint?.split('?')[0]?.split('/').filter(Boolean).pop()?.toLowerCase();
  const profile = profileKey
    ? ENTITY_CONTRACT_PROFILES.find(profile => profile.key.toLowerCase() === profileKey.toLowerCase())
    : ENTITY_CONTRACT_PROFILES.find(profile => profile.endpointAliases.some(alias => alias.toLowerCase() === resource));
  return profile?.identity ?? {};
}
export function resolveRecordIdentity(row: unknown, config: RecordIdentityConfig): {primary: string; secondary: string} {
  const primary = read(row, config.primaryField);
  const secondary = read(row, config.secondaryField);
  return {primary, secondary: secondary === primary ? '' : secondary};
}
export function resolvePageIdentity(row: unknown, config?: ListPageConfig): {primary: string; secondary: string} {
  const primary = config?.dataSurface?.columns.find(column => column.isPrimary);
  const defaults = resourceIdentity(config?.dataSource?.endpoint, config?.dataSource?.contractProfileKey);
  return resolveRecordIdentity(row, {
    primaryField: config?.identity?.primaryField ?? config?.dataSource?.documentNoField ?? primary?.field ?? primary?.id ?? defaults.primaryField,
    secondaryField: config?.identity?.secondaryField ?? primary?.subtitleField ?? defaults.secondaryField,
  });
}
export function resolveLookupIdentity(row: unknown, lookup: {endpoint: string; displayField: string; identity?: RecordIdentityConfig}): string {
  const defaults = resourceIdentity(lookup.endpoint);
  const identity = resolveRecordIdentity(row, {
    primaryField: lookup.identity?.primaryField ?? lookup.displayField ?? defaults.primaryField,
    secondaryField: lookup.identity?.secondaryField ?? defaults.secondaryField,
  });
  return [identity.primary, identity.secondary].filter(Boolean).join(' — ');
}
