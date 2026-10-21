import { DataSourceConfig } from '../models/data-source-config.model';
import { HeaderConfig } from '../models/document-window-config.model';
import { LineConfig } from '../models/line-config.model';

/** Resolve optional write overrides without mutating the feature's declarations. */
export function headerDataSourceDefaults(source: DataSourceConfig, header: HeaderConfig): DataSourceConfig {
  const fields = header.sections.flatMap((section) => section.fields).filter((field) => !field.readonly);
  const writable = fields.map((field) => field.key);
  return {
    ...source,
    createFields: source.createFields ?? writable,
    updateFields: source.updateFields ?? writable,
    requiredCreateFields:
      source.requiredCreateFields ?? fields.filter((field) => field.required).map((field) => field.key),
  };
}

export function lineConfigDefaults(config: LineConfig): LineConfig {
  const resolvedFields = config.columns.map(column => {
    const key = column.field ?? column.id;
    const legacy = config.fields?.find(field => field.key === key);
    if (legacy?.valueType && column.valueType && legacy.valueType !== column.valueType) {
      throw new Error(`Conflicting value types for line field "${key}".`);
    }
    return {
      ...legacy, key, label: column.label,
      valueType: column.valueType ?? legacy?.valueType,
      readonly: column.readonly ?? legacy?.readonly,
      required: column.required ?? legacy?.required,
      requiredWhen: column.requiredWhen ?? legacy?.requiredWhen,
      readonlyWhen: column.readonlyWhen ?? legacy?.readonlyWhen,
      validation: column.validation ?? legacy?.validation,
    };
  });
  config = { ...config, fields: [...resolvedFields, ...(config.fields ?? []).filter(f => !resolvedFields.some(r => r.key === f.key))],
    columns: config.columns.map(column => ({
      ...column,
      required: column.required ?? resolvedFields.find(f => f.key === (column.field ?? column.id))?.required,
      validation: column.validation ?? resolvedFields.find(f => f.key === (column.field ?? column.id))?.validation,
      requiredWhen: column.requiredWhen ?? resolvedFields.find(f => f.key === (column.field ?? column.id))?.requiredWhen,
      readonlyWhen: column.readonlyWhen ?? resolvedFields.find(f => f.key === (column.field ?? column.id))?.readonlyWhen,
      readonly: column.readonly ?? resolvedFields.find(f => f.key === (column.field ?? column.id))?.readonly,
      valueType: column.valueType ?? resolvedFields.find(f => f.key === (column.field ?? column.id))?.valueType,
    })),
  };
  const source = config.dataSource;
  const columns = config.columns.filter((column) => !column.readonly);
  const writable = columns.map((column) => column.field ?? column.id);
  // Separate child collections may require their parent key in the payload.
  const relationFields = source.navigation
    ? []
    : [source.parentKeyField, ...Object.keys(source.parentFixedFields ?? {})].filter(
        (field): field is string => !!field,
      );
  return {
    ...config,
    dataSource: {
      ...source,
      createFields: source.createFields ?? [...new Set([...writable, ...relationFields])],
      updateFields: source.updateFields ?? writable,
      requiredCreateFields:
        source.requiredCreateFields ??
        (config.fields ?? []).filter((field) => field.required && !field.readonly).map((field) => field.key),
      meaningfulFields:
        source.meaningfulFields ??
        columns
          .filter((column) => column.defaultValue === undefined)
          .map((column) => column.field ?? column.id),
    },
  };
}
