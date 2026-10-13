import { Injectable } from '@angular/core';

export interface ListFilterBuildInput {
  baseFilter?: string;
  viewFilter?: string;
  searchText?: string;
  advancedFilter?: string;
  searchTargets?: Array<{ field: string; mode?: 'contains' | 'equals' }>;
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
    searchTargets: Array<{ field: string; mode?: 'contains' | 'equals' }>
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
      .map((target) => ({ field: target.field.trim(), mode: target.mode ?? 'contains' as const }))
      .filter((target) => target.field.length > 0);

    if (!targets.length) {
      return '';
    }

    return terms.map((term) => {
      const escaped = term.replace(/'/g, "''");
      const selectedTarget = this.selectSearchTarget(targets, escaped);

      if (selectedTarget.mode === 'equals') {
        return `(${selectedTarget.field} eq '${escaped}')`;
      }

      return `(contains(${selectedTarget.field}, '${escaped}'))`;
    }).join(' and ');
  }

  private selectSearchTarget(
    targets: Array<{ field: string; mode: 'contains' | 'equals' }>,
    term: string
  ): { field: string; mode: 'contains' | 'equals' } {
    const normalized = term.toLowerCase();
    const numberLike = /^\d+$/.test(normalized);

    if (numberLike) {
      const numberField = targets.find((target) => {
        const key = target.field.toLowerCase();
        return key === 'number' || key === 'no' || key.endsWith('number') || key.endsWith('no');
      });

      if (numberField) {
        return numberField;
      }
    }

    return targets[0];
  }

  private wrap(value: string | undefined): string {
    const normalized = (value ?? '').trim();
    return normalized.length ? `(${normalized})` : '';
  }
}