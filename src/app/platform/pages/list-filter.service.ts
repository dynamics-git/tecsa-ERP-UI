import { Injectable } from '@angular/core';

export interface ListSearchTarget { field: string; mode?: 'contains' | 'equals'; type?: string; }

export interface ListFilterBuildInput {
  baseFilter?: string;
  viewFilter?: string;
  searchText?: string;
  advancedFilter?: string;
  searchTargets?: ListSearchTarget[];
}

@Injectable({
  providedIn: 'root'
})
export class ListFilterService {
  buildFilter(input: ListFilterBuildInput): string {
    const baseFilter = this.wrap(input.baseFilter);
    const viewFilter = this.wrap(input.viewFilter);
    const searchFilter = this.buildSearchFilter(input.searchText, input.searchTargets ?? []);
    const advancedFilter = this.wrap(input.advancedFilter);
    const segments = [baseFilter, viewFilter, searchFilter, advancedFilter].filter((segment): segment is string => Boolean(segment));

    return segments.join(' and ');
  }

  private buildSearchFilter(
    searchText: string | undefined,
    searchTargets: ListSearchTarget[]
  ): string {
    const text = (searchText ?? '').trim();
    if (!text.length) {
      return '';
    }

    const terms = text.split(/\s+/).filter((term) => term.length > 0);
    if (!terms.length) {
      return '';
    }

    const targets = searchTargets
      .map((target) => ({ field: target.field.trim(), mode: target.mode ?? 'contains' as const, type: target.type }))
      .filter((target) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(target.field));

    if (!targets.length) {
      return '';
    }

    return terms.map((term) => {
      const escaped = term.replace(/'/g, "''");
      const clauses = targets.flatMap(target => {
        if (target.type === 'boolean') {
          const value = /^(yes|true)$/i.test(term) ? 'true' : /^(no|false)$/i.test(term) ? 'false' : undefined;
          return value ? [`${target.field} eq ${value}`] : [];
        }
        if (['number','integer','decimal','currency'].includes(target.type ?? '')) return /^[+-]?\d+(?:\.\d+)?$/.test(term) ? [`${target.field} eq ${term}`] : [];
        if (target.type === 'date') return /^\d{4}-\d{2}-\d{2}$/.test(term) && !Number.isNaN(Date.parse(term)) ? [`${target.field} eq '${escaped}'`] : [];
        return [target.mode === 'equals' ? `${target.field} eq '${escaped}'` : `contains(${target.field}, '${escaped}')`];
      });
      // An incompatible term must match no records, never remove the search restriction.
      return clauses.length ? '(' + clauses.join(' or ') + ')' : '(' + targets[0].field + ' eq null and ' + targets[0].field + ' ne null)';
    }).join(' and ');
  }

  private wrap(value: string | undefined): string {
    const normalized = (value ?? '').trim();
    return normalized.length ? `(${normalized})` : '';
  }
}