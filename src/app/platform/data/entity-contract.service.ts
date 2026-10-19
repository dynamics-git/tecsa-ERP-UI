import { Injectable } from '@angular/core';
import { ENTITY_CONTRACT_PROFILES } from './entity-contract-profiles';
import { DataSourceConfig } from '../models/data-source-config.model';
import { ContractOperation, EntityContractProfile } from '../models/entity-contract.model';

@Injectable({
  providedIn: 'root'
})
export class EntityContractService {
  private readonly profilesByKey = new Map<string, EntityContractProfile>();
  private readonly profilesByEndpoint = new Map<string, EntityContractProfile>();

  constructor() {
    for (const profile of ENTITY_CONTRACT_PROFILES) {
      const key = this.normalizeToken(profile.key);
      if (key) {
        this.profilesByKey.set(key, profile);
      }

      for (const alias of profile.endpointAliases) {
        const endpoint = this.normalizeToken(alias);
        if (endpoint) {
          this.profilesByEndpoint.set(endpoint, profile);
        }
      }
    }
  }

  sanitizePayload(
    config: DataSourceConfig,
    operation: Exclude<ContractOperation, 'delete'>,
    payload: unknown
  ): unknown {
    if (!this.isRecord(payload)) {
      return payload;
    }

    const profile = this.resolveProfile(config);
    const configured = operation === 'create' ? config.createFields : config.updateFields;
    const allowed = configured ?? (operation === 'create' ? profile?.createAllowList : profile?.updateAllowList);
    const outboundFieldMap = this.buildOutboundFieldMap(profile);
    const omitted = this.buildOmittedFieldSet(profile);
    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(payload)) {
      if (key.trim().startsWith('__')) {
        continue;
      }

      const mappedKey = outboundFieldMap.get(this.normalizeToken(key)) ?? key;
      if (config.omitEmptyFields?.includes(mappedKey) && (value === '' || value === null || value === undefined)) continue;
      if (allowed?.length && !allowed.includes(mappedKey)) continue;
      if (operation === 'update' && config.updateBlockedFields?.includes(mappedKey)) continue;
      if (omitted.has(this.normalizeToken(key)) || omitted.has(this.normalizeToken(mappedKey))) {
        continue;
      }

      sanitized[mappedKey] = value;
    }

    return sanitized;
  }

  getDeleteKeyCandidates(config?: DataSourceConfig): string[] {
    const profile = config ? this.resolveProfile(config) : undefined;
    if (!profile?.deleteKeyCandidates?.length) {
      return [];
    }

    return [...profile.deleteKeyCandidates];
  }

  private resolveProfile(config: DataSourceConfig): EntityContractProfile | undefined {
    const key = this.normalizeToken(config.contractProfileKey);
    if (key && this.profilesByKey.has(key)) {
      return this.profilesByKey.get(key);
    }

    const endpoint = this.normalizeToken(this.extractEndpointName(config.endpoint));
    if (!endpoint) {
      return undefined;
    }

    return this.profilesByEndpoint.get(endpoint);
  }

  private buildOutboundFieldMap(profile?: EntityContractProfile): Map<string, string> {
    const map = new Map<string, string>();
    const configured = profile?.outboundFieldMap;
    if (!configured) {
      return map;
    }

    for (const [source, target] of Object.entries(configured)) {
      const normalizedSource = this.normalizeToken(source);
      const normalizedTarget = String(target ?? '').trim();
      if (!normalizedSource || !normalizedTarget) {
        continue;
      }

      map.set(normalizedSource, normalizedTarget);
    }

    return map;
  }

  private buildOmittedFieldSet(profile?: EntityContractProfile): Set<string> {
    return new Set((profile?.omitFields ?? [])
      .map((field) => this.normalizeToken(field))
      .filter((field) => field.length > 0));
  }

  private extractEndpointName(endpoint: string): string {
    const trimmed = endpoint.trim();
    if (!trimmed.length) {
      return '';
    }

    const [withoutQuery] = trimmed.split('?');
    const withoutSlashes = withoutQuery.replace(/^\/+|\/+$/g, '');
    return withoutSlashes;
  }

  private normalizeToken(value: unknown): string {
    return String(value ?? '').trim().toLowerCase();
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }
}
