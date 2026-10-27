import type { RecordIdentityConfig } from './record-identity.model';
import type { CommandConfig } from './command-config.model';

export type FieldType =
  | 'text'
  | 'number'
  | 'datetime'
  | 'time'
  | 'email'
  | 'url'
  | 'phone'
  | 'date'
  | 'boolean'
  | 'currency'
  | 'select'
  | 'dropdown'
  | 'lookup'
  | 'textarea'
  | 'badge';

import type { FieldValueType } from './field-value';
export type { FieldValueType } from './field-value';

export interface FieldOptionConfig {
  label: string;
  value: unknown;
  api?: string | string[];
}

export type FieldFillConfig = Record<string, string | string[]>;

export interface LookupDependencyConfig {
  /** Bind a parent identity into the declared REST path instead of a query filter. */
  in?: 'path' | 'filter';
  /** Line lookups may explicitly depend on a field in their parent header. */
  source?: 'record' | 'header';
  /** Field on the lookup resource to constrain. */
  field: string;
  /** Field on the current header or line record supplying the value. */
  valueFrom: string;
  valueType?: 'text' | 'number' | 'boolean';
}

export interface FieldLookupConfig {
  /** Child APIs may expose collection reads without a record GET. */
  recordRead?: 'record' | 'collection';
  /** All dependencies must have values before a lookup can be searched. */
  dependsOn?: LookupDependencyConfig[];
  /** Fixed business filter combined with dependency and search clauses. */
  filter?: string;
  identity?: RecordIdentityConfig;
  endpoint: string;
  valueField?: string;
  displayField: string;
  searchFields?: string[];
  /** Use cursor only when the backend resource declares cursor support. */
  paging?: 'offset' | 'cursor';
  allowOpenCard?: boolean;
}

export interface FieldValidationConfig {
  min?: number | string;
  max?: number | string;
  maxLength?: number;
  /** Maximum total digits for decimal fields. */
  precision?: number;
  /** Maximum fractional digits for decimal fields. */
  scale?: number;
  pattern?: string;
  message?: string;
}

export interface FieldMessagesConfig {
  validationFailed?: string;
  saveFailed?: string;
}

export interface FieldTargetConfig {
  key: string;
  source: string;
  fallbackSources?: string[];
  clearOnEmpty?: boolean;
}

export interface FieldFactBoxConfig {
  show?: boolean;
  sectionId?: string;
  sectionTitle?: string;
  label?: string;
  order?: number;
  fallback?: string;
  buttons?: CommandConfig[];
}

/** Declarative condition evaluated against the current header or line record. */
export interface FieldCondition { field: string; values: unknown[]; negate?: boolean; }

export interface FieldConfig {
  /** Exclude from Enter quick entry without removing normal Tab access. */
  quickEntry?: boolean;
  requiredWhen?: FieldCondition;
  readonlyWhen?: FieldCondition;
  hiddenWhen?: FieldCondition;
  key: string;
  label: string;
  type?: FieldType;
  valueType?: FieldValueType;
  required?: boolean;
  readonly?: boolean;
  readonlyAfterCreate?: boolean;
  disabled?: boolean;
  hidden?: boolean;
  placeholder?: string;
  defaultValue?: unknown;
  options?: FieldOptionConfig[];
  api?: string | string[];
  optionsDataKey?: string;
  optionsEndpoints?: string[];
  optionsSkipWhenSuperAdmin?: boolean;
  labelField?: string | string[];
  valueField?: string | string[];
  bindLabel?: string;
  bindValue?: string;
  displayFormat?: string;
  fill?: FieldFillConfig;
  targets?: FieldTargetConfig[];
  lookup?: FieldLookupConfig;
  validation?: FieldValidationConfig;
  messages?: FieldMessagesConfig;
  width?: string;
  sectionId?: string;
  factBox?: boolean | FieldFactBoxConfig;
}

export interface FormSectionConfig {
  id: string;
  title?: string;
  fields: FieldConfig[];
}
