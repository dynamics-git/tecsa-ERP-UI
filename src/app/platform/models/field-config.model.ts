import type { CommandConfig } from './command-config.model';

export type FieldType =
  | 'text'
  | 'number'
  | 'date'
  | 'boolean'
  | 'currency'
  | 'select'
  | 'dropdown'
  | 'lookup'
  | 'textarea'
  | 'badge';

export type FieldValueType = 'text' | 'number' | 'boolean' | 'date';

export interface FieldOptionConfig {
  label: string;
  value: unknown;
  api?: string | string[];
}

export type FieldFillConfig = Record<string, string | string[]>;

export interface FieldLookupConfig {
  endpoint: string;
  valueField: string;
  displayField: string;
  searchFields?: string[];
  allowOpenCard?: boolean;
}

export interface FieldValidationConfig {
  min?: number;
  max?: number;
  maxLength?: number;
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

export interface FieldConfig {
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
