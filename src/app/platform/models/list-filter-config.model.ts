import type { FieldValueType } from './field-value';
export type FilterOperator = 'contains' | 'startswith' | 'eq' | 'ne' | 'gt' | 'ge' | 'lt' | 'le' | 'expression';

export interface ListFilterFieldConfig {
  field: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'dropdown';
  operator?: FilterOperator;
  valueType?: FieldValueType;
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
  fields?: ListFilterFieldConfig[];
}