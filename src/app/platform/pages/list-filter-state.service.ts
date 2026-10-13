import { Injectable } from '@angular/core';
import { ListFilterService } from './list-filter.service';

export interface ListViewFilterConfig {
  id: string;
  filter?: string;
}

export interface ListFilterStateInit {
  baseFilter?: string;
  views?: ListViewFilterConfig[];
  activeViewId?: string;
  searchFields?: string[];
  columns?: Array<{ id?: string; label?: string; field?: string; type?: string }>;
  basicEnabled?: boolean;
  advancedEnabled?: boolean;
}

type ListFilterState = {
  basicEnabled: boolean;
  advancedEnabled: boolean;
  baseFilter: string;
  views: ListViewFilterConfig[];
  activeViewId: string;
  activeViewFilter?: string;
  searchText: string;
  advancedFilter?: string;
  searchTargets: Array<{ field: string; mode: 'contains' | 'equals' }>;
};

@Injectable({
  providedIn: 'root'
})
export class ListFilterStateService {
  private readonly states = new Map<string, ListFilterState>();

  constructor(private readonly listFilters: ListFilterService) {}

  initializeFromConfig(
    scope: string,
    listConfig: {
      views?: Array<{ id: string; label: string; filter?: string }>;
      activeViewId?: string;
      searchFields?: string[];
      tools?: unknown;
      dataSurface?: {
        columns?: Array<{ id?: string; label?: string; field?: string; type?: string }>;
      };
    },
    baseFilter?: string
  ): void {
    const tools = listConfig.tools;
    const isBasicFilterEnabled = !this.isRecord(tools) || tools['filter'] !== false;
    const isAdvancedFilterEnabled = !this.isRecord(tools) || tools['advancedFilter'] !== false;

    this.initialize(scope, {
      baseFilter,
      views: listConfig.views,
      activeViewId: listConfig.activeViewId,
      searchFields: listConfig.searchFields,
      columns: listConfig.dataSurface?.columns,
      basicEnabled: isBasicFilterEnabled,
      advancedEnabled: isAdvancedFilterEnabled
    });
  }

  initialize(scope: string, init: ListFilterStateInit): void {
    const views = init.views ?? [];
    const activeViewId = init.activeViewId ?? views[0]?.id ?? '';

    this.states.set(scope, {
      basicEnabled: init.basicEnabled !== false,
      advancedEnabled: init.advancedEnabled === true,
      baseFilter: (init.baseFilter ?? '').trim(),
      views,
      activeViewId,
      activeViewFilter: this.resolveViewFilter(views, activeViewId),
      searchText: '',
      advancedFilter: undefined,
      searchTargets: this.resolveSearchTargets(init.searchFields ?? [], init.columns ?? [])
    });
  }

  applyCommand(scope: string, actionKey: string, payload: unknown): boolean {
    const state = this.states.get(scope);
    if (!state) {
      return false;
    }

    if (actionKey !== 'filterChanged' && actionKey !== 'viewChanged' && actionKey !== 'advancedFilterChanged') {
      return false;
    }

    if (actionKey === 'advancedFilterChanged') {
      if (!state.advancedEnabled) {
        return false;
      }

      const nextAdvanced = this.readAdvancedFilter(payload);
      if (nextAdvanced !== state.advancedFilter) {
        state.advancedFilter = nextAdvanced;
        return true;
      }

      return false;
    }

    if (!state.basicEnabled) {
      return false;
    }

    if (!this.isRecord(payload)) {
      return false;
    }

    let changed = false;

    const viewId = this.toText(payload['viewId']);
    if (viewId.length && viewId !== state.activeViewId) {
      state.activeViewId = viewId;
      state.activeViewFilter = this.resolveViewFilter(state.views, viewId);
      changed = true;
    }

    if (this.hasOwn(payload, 'viewFilter')) {
      const nextViewFilter = this.toText(payload['viewFilter']);
      const normalizedNextViewFilter = nextViewFilter.length ? nextViewFilter : undefined;
      if (normalizedNextViewFilter !== state.activeViewFilter) {
        state.activeViewFilter = normalizedNextViewFilter;
        changed = true;
      }
    }

    if (actionKey === 'filterChanged') {
      const searchText = this.toText(payload['searchText']);
      if (searchText !== state.searchText) {
        state.searchText = searchText;
        changed = true;
      }
    }

    return changed;
  }

  buildFilter(scope: string): string {
    const state = this.states.get(scope);
    if (!state) {
      return '';
    }

    return this.listFilters.buildFilter({
      baseFilter: state.baseFilter,
      viewFilter: state.basicEnabled ? state.activeViewFilter : undefined,
      searchText: state.basicEnabled ? state.searchText : undefined,
      advancedFilter: state.advancedEnabled ? state.advancedFilter : undefined,
      searchTargets: state.searchTargets
    });
  }

  hydrateTargetsFromRecords(scope: string, records: unknown[]): void {
    const state = this.states.get(scope);
    if (!state || state.searchTargets.length === 0 || records.length === 0) {
      return;
    }

    const firstRecord = records.find((row) => this.isRecord(row));
    if (!this.isRecord(firstRecord)) {
      return;
    }

    const available = new Set(Object.keys(firstRecord).map((key) => this.normalize(key)).filter((key) => key.length > 0));
    state.searchTargets = state.searchTargets.filter((target) => available.has(this.normalize(target.field)));
  }

  private resolveViewFilter(views: ListViewFilterConfig[], viewId: string): string | undefined {
    const view = views.find((candidate) => candidate.id === viewId);
    const filter = this.toText(view?.filter);
    return filter.length ? filter : undefined;
  }

  private resolveSearchTargets(
    requestedFields: string[],
    columns: Array<{ id?: string; label?: string; field?: string; type?: string }>
  ): Array<{ field: string; mode: 'contains' | 'equals' }> {
    const aliasMap = new Map<string, { field: string; mode: 'contains' | 'equals' }>();
    const derivedTargets: Array<{ field: string; mode: 'contains' | 'equals' }> = [];

    columns.forEach((column) => {
      if (!this.isSearchableColumnType(column.type)) {
        return;
      }

      const canonicalField = this.toText(column.field) || this.toText(column.id);
      if (!canonicalField.length) {
        return;
      }

      const target = { field: canonicalField, mode: this.resolveSearchMode(column.type) };
      derivedTargets.push(target);
      this.registerAlias(aliasMap, canonicalField, target);
      this.registerAlias(aliasMap, column.id, target);
      this.registerAlias(aliasMap, column.label, target);
    });

    if (!requestedFields.length) {
      return this.uniqueTargets(derivedTargets);
    }

    const resolved = requestedFields
      .map((field) => aliasMap.get(this.normalize(field)))
      .filter((target): target is { field: string; mode: 'contains' | 'equals' } => Boolean(target));

    return this.uniqueTargets(resolved);
  }

  private isSearchableColumnType(type: unknown): boolean {
    const normalized = this.toText(type).toLowerCase();
    if (!normalized.length) {
      return true;
    }

    return normalized === 'text' || normalized === 'badge' || normalized === 'lookup';
  }

  private resolveSearchMode(type: unknown): 'contains' | 'equals' {
    const normalized = this.toText(type).toLowerCase();
    if (normalized === 'badge') {
      return 'equals';
    }

    return 'contains';
  }

  private registerAlias(
    map: Map<string, { field: string; mode: 'contains' | 'equals' }>,
    alias: unknown,
    target: { field: string; mode: 'contains' | 'equals' }
  ): void {
    const normalized = this.normalize(alias);
    if (normalized.length && !map.has(normalized)) {
      map.set(normalized, target);
    }
  }

  private uniqueTargets(targets: Array<{ field: string; mode: 'contains' | 'equals' }>): Array<{ field: string; mode: 'contains' | 'equals' }> {
    const unique = new Map<string, { field: string; mode: 'contains' | 'equals' }>();
    targets.forEach((target) => {
      if (!unique.has(target.field)) {
        unique.set(target.field, target);
      }
    });

    return Array.from(unique.values());
  }

  private normalize(value: unknown): string {
    return this.toText(value).toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  private readAdvancedFilter(payload: unknown): string | undefined {
    if (typeof payload === 'string') {
      const direct = payload.trim();
      return direct.length ? direct : undefined;
    }

    if (!this.isRecord(payload)) {
      return undefined;
    }

    const directClause = this.toText(payload['query'] ?? payload['filter'] ?? payload['clause']);
    if (directClause.length) {
      return directClause;
    }

    const selectedColumn = this.toText(payload['selectedColumn'] ?? payload['field']);
    const searchTerm = this.toText(payload['searchTerm'] ?? payload['value']);
    if (selectedColumn.length && searchTerm.length) {
      const operator = this.toText(payload['operator']).toLowerCase();
      return this.buildAdvancedClause(selectedColumn, searchTerm, operator || 'contains');
    }

    const filters = payload['filters'];
    if (Array.isArray(filters)) {
      const clauses = filters
        .map((entry) => this.buildAdvancedClauseFromFilterEntry(entry))
        .filter((clause): clause is string => Boolean(clause));

      if (clauses.length) {
        return clauses.join(' and ');
      }
    }

    return undefined;
  }

  private buildAdvancedClauseFromFilterEntry(entry: unknown): string | undefined {
    if (!this.isRecord(entry)) {
      return undefined;
    }

    const field = this.toText(entry['field'] ?? entry['selectedColumn']);
    const value = this.toText(entry['value'] ?? entry['searchTerm']);
    const operator = this.toText(entry['operator']).toLowerCase() || 'contains';

    if (!field.length || !value.length) {
      return undefined;
    }

    return this.buildAdvancedClause(field, value, operator);
  }

  private buildAdvancedClause(field: string, rawValue: string, operator: string): string {
    const normalizedOperator = operator === 'ge' || operator === 'le' || operator === 'eq' || operator === 'startswith'
      ? operator
      : 'contains';

    if (normalizedOperator === 'eq' && /[,|]\s*/.test(rawValue)) {
      const values = rawValue
        .split(/[,|]\s*/)
        .map((value) => value.trim())
        .filter((value) => value.length > 0);

      if (!values.length) {
        return '';
      }

      return `(${values.map((value) => `${field} eq ${this.toODataLiteral(value)}`).join(' or ')})`;
    }

    if (normalizedOperator === 'contains' || normalizedOperator === 'startswith') {
      const escaped = this.escapeODataString(rawValue);
      return `${normalizedOperator}(${field}, '${escaped}')`;
    }

    return `${field} ${normalizedOperator} ${this.toODataLiteral(rawValue)}`;
  }

  private toODataLiteral(value: string): string {
    const trimmed = value.trim();
    if (!trimmed.length) {
      return "''";
    }

    if (trimmed === 'true' || trimmed === 'false') {
      return trimmed;
    }

    if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
      return trimmed;
    }

    return `'${this.escapeODataString(trimmed)}'`;
  }

  private escapeODataString(value: string): string {
    return value.replace(/'/g, "''");
  }

  private toText(value: unknown): string {
    return value === null || value === undefined ? '' : String(value).trim();
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }

  private hasOwn(record: Record<string, unknown>, key: string): boolean {
    return Object.prototype.hasOwnProperty.call(record, key);
  }
}
