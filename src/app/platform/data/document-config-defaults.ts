import { ListPageColumnConfig } from '../models/page-config.model';
import { DataSourceConfig } from '../models/data-source-config.model';
import { HeaderConfig } from '../models/document-window-config.model';
import { LineConfig } from '../models/line-config.model';

/** Resolve optional write overrides without mutating the feature's declarations. */
export function headerDataSourceDefaults(source: DataSourceConfig, header: HeaderConfig): DataSourceConfig {
  const declared = header.sections.flatMap(section => section.fields);
  const fields = declared.filter(field => !field.readonly);
  const writable = fields.map((field) => field.key);
  return {
    ...source,
    createFields: (source.createFields ?? writable).filter(key => !declared.some(field => field.key === key && field.readonly)),
    updateFields: (source.updateFields ?? fields.filter(field => !field.readonlyAfterCreate).map(field => field.key))
      .filter(key => !source.updateBlockedFields?.includes(key) && !declared.some(field => field.key === key && (field.readonly || field.readonlyAfterCreate))),
    requiredCreateFields: source.requiredCreateFields ?? fields.filter((field) => field.required).map((field) => field.key),
  };
}

export function lineConfigDefaults(config: LineConfig): LineConfig {
  const resolvedFields = config.columns.map((column) => {
    const key = column.field ?? column.id;
    const legacy = config.fields?.find((field) => field.key === key);
    if (legacy?.valueType && column.valueType && legacy.valueType !== column.valueType) {
      throw new Error(`Conflicting value types for line field "${key}".`);
    }
    return {
      ...legacy,
      key,
      label: column.label,
      valueType: column.valueType ?? legacy?.valueType,
      readonly: column.readonly ?? legacy?.readonly,
      required: column.required ?? legacy?.required,
      requiredWhen: column.requiredWhen ?? legacy?.requiredWhen,
      readonlyWhen: column.readonlyWhen ?? legacy?.readonlyWhen,
      validation: column.validation ?? legacy?.validation,
    };
  });
  config = {
    ...config,
    fields: [...resolvedFields, ...(config.fields ?? []).filter((f) => !resolvedFields.some((r) => r.key === f.key))],
    columns: config.columns.map((column) => ({
      ...column,
      required: column.required ?? resolvedFields.find((f) => f.key === (column.field ?? column.id))?.required,
      validation: column.validation ?? resolvedFields.find((f) => f.key === (column.field ?? column.id))?.validation,
      requiredWhen: column.requiredWhen ?? resolvedFields.find((f) => f.key === (column.field ?? column.id))?.requiredWhen,
      readonlyWhen: column.readonlyWhen ?? resolvedFields.find((f) => f.key === (column.field ?? column.id))?.readonlyWhen,
      readonly: column.readonly ?? resolvedFields.find((f) => f.key === (column.field ?? column.id))?.readonly,
      valueType: column.valueType ?? resolvedFields.find((f) => f.key === (column.field ?? column.id))?.valueType,
    })),
  };
  const source = config.dataSource;
  const columns = config.columns.filter((column) => !column.readonly);
  const writable = columns.map((column) => column.field ?? column.id);
  // Separate child collections may require their parent key in the payload.
  const relationFields = source.navigation
    ? []
    : [source.parentKeyField, ...Object.keys(source.parentFixedFields ?? {})].filter((field): field is string => !!field);
  return {
    ...config,
    dataSource: {
      ...source,
      createFields: (source.createFields ?? [...new Set([...writable, ...relationFields])])
        .filter(key => !config.columns.some(column => (column.field ?? column.id) === key && column.readonly)),
      updateFields: (source.updateFields ?? columns.filter(column => !column.readonlyAfterCreate).map(column => column.field ?? column.id))
        .filter(key => !source.updateBlockedFields?.includes(key) && !config.columns.some(column => (column.field ?? column.id) === key && (column.readonly || column.readonlyAfterCreate))),
      requiredCreateFields:
        source.requiredCreateFields ?? (config.fields ?? []).filter((field) => field.required && !field.readonly).map((field) => field.key),
      meaningfulFields:
        source.meaningfulFields ?? columns.filter((column) => column.defaultValue === undefined).map((column) => column.field ?? column.id),
    },
  };
}

/** List labels, types and filter controls reuse the explicitly declared card fields. */
export function listColumns(
  header: HeaderConfig,
  columns: Array<string | (Partial<ListPageColumnConfig> & { field: string })>,
): ListPageColumnConfig[] {
  const fields = header.sections.flatMap((section) => section.fields);
  const declared = new Set(columns.map(column => typeof column === 'string' ? column : column.field));
  const systemColumns: Record<string, ListPageColumnConfig> = {
    systemCreatedAt: {field: 'systemCreatedAt', label: 'Created at', type: 'datetime', width: '160px'},
    systemModifiedAt: {field: 'systemModifiedAt', label: 'Modified at', type: 'datetime', width: '160px'},
  };
  const allColumns: typeof columns = [...columns, ...fields.filter(field => !declared.has(field.key)).map(field => ({field: field.key, hidden: true}))];
  return allColumns.map((column, index) => {
    const override = typeof column === 'string' ? { field: column } : column;
    const field = fields.find((field) => field.key === override.field);
    const system = systemColumns[override.field];
    if (!field && !system && (!override.label || !override.type)) throw new Error('Declare the list field: ' + override.field);
    return {
      label: field?.label ?? system?.label ?? override.label!,
      type: field?.valueType ?? (field?.type === 'boolean' ? 'boolean' : system?.type ?? override.type ?? 'text'),
      width: system?.width ?? (index === 0 ? '140px' : index === 1 ? '280px' : undefined),
      isPrimary: index === 0,
      ...(field?.options ? { filter: { type: 'select' as const, options: field.options } } : {}),
      ...(field?.lookup
        ? {
            filter: {
              type: 'dropdown' as const,
              apiUrl: field.lookup.endpoint,
              valueField: field.lookup.valueField,
              labelField: field.lookup.displayField,
            },
          }
        : {}),
      ...override,
    };
  });
}
