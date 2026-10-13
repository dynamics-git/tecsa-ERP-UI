export type FilterOperator = 'contains' | 'startswith' | 'eq' | 'ge' | 'le';

export interface FilterField {
  field: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'dropdown';
  operator?: FilterOperator;
  placeholder?: string;
  options?: Array<{ value: unknown; label: string }>;
  defaultValue?: unknown;
  apiUrl?: string;
  valueField?: string;
  labelField?: string;
}

export interface ListFilterConfig {
  enabled: boolean;
  storageKey?: string;
  fields?: FilterField[];
}