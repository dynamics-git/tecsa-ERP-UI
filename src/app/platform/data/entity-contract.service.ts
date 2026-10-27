import { FieldConfig } from '../models/field-config.model';
import { FieldValueType } from '../models/field-value';
import { Injectable } from '@angular/core';
import { ENTITY_CONTRACT_PROFILES } from './entity-contract-profiles';
import { DataSourceConfig } from '../models/data-source-config.model';
import { ContractOperation, EntityContractProfile } from '../models/entity-contract.model';

export interface CoreField {
  type: string;
  create: boolean;
  update: boolean;
  read: boolean;
  required?: boolean;
  nullable?: boolean;
  default?: unknown;
  maxLength?: number;
  min?: number;
  max?: number;
  precision?: number;
  scale?: number;
  values?: string[];
}
export interface CoreEntity {
  kind: 'generic' | 'domain';
  path: string;
  singleton?: boolean;
  addressKey?: string;
  updateMethod?: 'PUT' | 'PATCH';
  endpoint: string;
  key: string;
  parent?: { entity: string; parameter: string } | null;
  fields: Record<string, CoreField>;
  operations: Record<string, boolean>;
}
export interface CoreMetadata {
  contractVersion: string;
  entities: Record<string, CoreEntity>;
  endpoints: Array<{
    path: string;
    methods: string[];
    type: string;
    inputFields?: Record<string, unknown>;
  }>;
}

@Injectable({
  providedIn: 'root',
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

  private metadata?: CoreMetadata;
  clearMetadata(): void {
    this.metadata = undefined;
  }
  acceptMetadata(response: unknown): boolean {
    const data = this.isRecord(response) ? response['data'] : undefined;
    if (
      !this.isRecord(data) ||
      data['contractVersion'] !== '1.0' ||
      !this.isRecord(data['entities']) ||
      !Array.isArray(data['endpoints'])
    )
      return false;
    if (
      !Object.values(data['entities']).every(
        (entity) =>
          this.isRecord(entity) &&
          ['generic', 'domain'].includes(String(entity['kind'])) &&
          typeof entity['path'] === 'string' &&
          this.isRecord(entity['fields']) &&
          this.isRecord(entity['operations']),
      )
    )
      return false;
    if (
      !data['endpoints'].every(
        (endpoint) =>
          this.isRecord(endpoint) &&
          typeof endpoint['path'] === 'string' &&
          Array.isArray(endpoint['methods']),
      )
    )
      return false;
    for (const entity of Object.values(data['entities']) as Record<string, unknown>[]) {
      if (typeof entity['key'] !== 'string' || typeof entity['endpoint'] !== 'string') return false;
      if (
        !Object.values(entity['operations'] as object).every((value) => typeof value === 'boolean')
      )
        return false;
      if (
        !Object.values(entity['fields'] as object).every(
          (field) =>
            this.isRecord(field) &&
            typeof field['type'] === 'string' &&
            ['read', 'create', 'update'].every((flag) => typeof field[flag] === 'boolean'),
        )
      )
        return false;
    }
    this.metadata = data as unknown as CoreMetadata;
    return true;
  }
  private path(source: DataSourceConfig): string {
    if (source.navigation)
      return (
        '/' +
        source.navigation.parentEndpoint.replace(/^\//, '') +
        '/{parent}/' +
        source.navigation.childCollection
      );
    return (
      '/' +
      source.endpoint
        .split('?')[0]
        .replace(/^\/companies\/[^/]+\//, '')
        .replace(/^\/+|\/+$/g, '')
    );
  }
  private entity(source: DataSourceConfig): CoreEntity | undefined {
    if (source.addressStyle === 'odata') return undefined;
    // Nested relationships remain explicit; never identify all child APIs as "lines".
    return Object.values(this.metadata?.entities ?? {}).find(
      (entity) =>
        entity.kind === 'generic' &&
        this.matchesPath('/' + entity.path.replace(/^\//, ''), this.path(source)),
    );
  }
  private matchesPath(template: string, path: string): boolean {
    const parts = template.split('/'),
      actual = path.split('/');
    return (
      parts.length === actual.length &&
      parts.every((part, index) => part === actual[index] || /^\{[^}]+\}$/.test(part))
    );
  }
  resolveSource(source: DataSourceConfig): DataSourceConfig {
    if (source.addressStyle === 'odata') return source;
    const entity = this.entity(source);
    if (entity)
      return {
        ...source,
        singleton: source.singleton ?? entity.singleton,
        keyField: source.keyField ?? entity.addressKey ?? entity.key,
        supportsCreate: source.supportsCreate === false ? false : entity.operations['create'],
        supportsUpdate: source.supportsUpdate === false ? false : entity.operations['update'],
        supportsDelete: source.supportsDelete === false ? false : entity.operations['delete'],
      };
    // Domain inputFields are hints only: never derive a write allowlist from them.
    const path = this.path(source);
    const matches = (template: string, record: boolean) => {
      const relative = template.replace(/^.*\/companies\/\{companyId\}/, '');
      const parts = relative.split('/'),
        actual = path.split('/');
      if (parts.length !== actual.length + (record ? 1 : 0)) return false;
      return (
        actual.every((part, index) => parts[index] === part || /^\{[^}]+\}$/.test(parts[index])) &&
        (!record || /^\{[^}]+\}$/.test(parts.at(-1)!))
      );
    };
    const endpoints = this.metadata?.endpoints ?? [];
    if (!endpoints.some((e) => matches(e.path, false) || matches(e.path, true))) return source;
    return {
      ...source,
      supportsCreate:
        source.supportsCreate !== false &&
        endpoints.some((e) => matches(e.path, false) && e.methods.includes('POST')),
      supportsUpdate:
        source.supportsUpdate !== false &&
        endpoints.some(
          (e) =>
            matches(e.path, !source.singleton) &&
            e.methods.includes(source.singleton ? 'PUT' : 'PATCH'),
        ),
      supportsDelete:
        source.supportsDelete !== false &&
        endpoints.some((e) => matches(e.path, true) && e.methods.includes('DELETE')),
    };
  }
  updateMethod(source: DataSourceConfig): 'PUT' | 'PATCH' {
    return source.singleton ? 'PUT' : (this.entity(source)?.updateMethod ?? 'PATCH');
  }
  resolveField(source: DataSourceConfig, field: FieldConfig): FieldConfig {
    const entity = this.entity(source);
    const metadata = entity?.fields[field.key];
    if (!metadata) return field;
    const types: Record<string, FieldValueType> = {
      uuid: 'guid',
      enum: 'text',
      text: 'text',
      code: 'code',
      decimal: 'decimal',
      integer: 'integer',
      boolean: 'boolean',
      date: 'date',
      datetime: 'datetime',
    };
    const validation = Object.fromEntries(
      ['maxLength', 'min', 'max', 'precision', 'scale']
        .filter((key) => key in metadata)
        .map((key) => [key, metadata[key as keyof CoreField]]),
    );
    return {
      ...field,
      type: field.type ?? (metadata.type === 'enum' && !field.lookup ? 'select' : undefined),
      options: field.options ?? metadata.values?.map((value) => ({ label: value, value })),
      valueType: field.valueType ?? types[metadata.type],
      required:
        field.required ?? (field.requiredWhen ? undefined : metadata.create && metadata.required),
      readonlyWhen:
        field.readonlyWhen ??
        (!metadata.create && metadata.update
          ? { field: entity!.key, values: [undefined, null, ''] }
          : undefined),
      readonly: field.readonly ?? (!metadata.create && !metadata.update),
      readonlyAfterCreate: field.readonlyAfterCreate ?? (metadata.create && !metadata.update),
      defaultValue:
        field.defaultValue !== undefined
          ? field.defaultValue
          : metadata.default !== undefined
            ? metadata.default
            : metadata.nullable
              ? null
              : undefined,
      validation: { ...validation, ...field.validation },
    };
  }

  usesGenericContract(config: DataSourceConfig): boolean { return !!this.entity(config); }

  /** Check tracked user edits before page payload builders can filter them. */
  assertEditedFields(config: DataSourceConfig, operation: 'create' | 'update', record: Record<string, unknown>, fields: Iterable<string>): void {
    if (!this.entity(config)) return; // Legacy/domain explicit contracts retain their existing behavior.
    this.sanitizePayload(config, operation, Object.fromEntries([...fields].map(key => [key, record[key]])));
  }

  sanitizePayload(
    config: DataSourceConfig,
    operation: Exclude<ContractOperation, 'delete'>,
    payload: unknown,
  ): unknown {
    if (!this.isRecord(payload)) {
      return payload;
    }

    const profile = this.resolveProfile(config);
    const configured = operation === 'create' ? config.createFields : config.updateFields;
    const allowed =
      configured ?? (operation === 'create' ? profile?.createAllowList : profile?.updateAllowList);
    const outboundFieldMap = this.buildOutboundFieldMap(profile);
    const omitted = this.buildOmittedFieldSet(profile);
    const sanitized: Record<string, unknown> = {};
    const entity = this.entity(config);
    if (entity && !entity.operations[operation])
      throw new Error("This resource does not support " + operation + ". Your edits are retained.");

    for (const [key, value] of Object.entries(payload)) {
      if (key.trim().startsWith('__')) {
        continue;
      }

      const mappedKey = outboundFieldMap.get(this.normalizeToken(key)) ?? key;
      // Authoritative flags apply before optional client filtering. Never turn a rejected edit into success.
      if (entity && (!entity.fields[mappedKey]?.[operation] ||
          (allowed && !allowed.includes(mappedKey)) ||
          (operation === 'update' && config.updateBlockedFields?.includes(mappedKey)) ||
          omitted.has(this.normalizeToken(key)) || omitted.has(this.normalizeToken(mappedKey)) ||
          (config.omitEmptyFields?.includes(mappedKey) && (value === '' || value === null || value === undefined)))) {
        throw new Error('Cannot save field "' + mappedKey + '" for this operation. Your edits are retained.');
      }
      if (
        config.omitEmptyFields?.includes(mappedKey) &&
        (value === '' || value === null || value === undefined)
      )
        continue;
      if (allowed && !allowed.includes(mappedKey)) continue;
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
    return new Set(
      (profile?.omitFields ?? [])
        .map((field) => this.normalizeToken(field))
        .filter((field) => field.length > 0),
    );
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
    return String(value ?? '')
      .trim()
      .toLowerCase();
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }
}
