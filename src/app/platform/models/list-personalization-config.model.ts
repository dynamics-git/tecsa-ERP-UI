import type { FilterOperator } from './list-filter-config.model';

export interface ListAppliedFilter {
  field: string;
  operator: FilterOperator;
  value: string;
}

export interface ListPersonalizationState {
  columnOrder: string[];
  hiddenColumns: string[];
  columnWidths: Record<string, number>;
  density: 'compact' | 'comfortable' | 'spacious';
  factBoxOpen: boolean;
  groupingField?: string;
  frozenThrough?: string;
}

export interface ListSavedView {
  id: string;
  label: string;
  filters: ListAppliedFilter[];
  sort?: string;
  viewFilter?: string;
  personalization: ListPersonalizationState;
}

export interface ListPersonalizationConfig {
  enabled?: boolean;
  storageKey?: string;
}
