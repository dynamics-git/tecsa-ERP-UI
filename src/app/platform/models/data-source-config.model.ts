export interface DataWriteContext {
  readonly operation: 'create' | 'update' | 'delete';
  readonly endpoint: string;
  readonly id: unknown;
  readonly payload: Readonly<Record<string, unknown>> | undefined;
}
export interface DataWriteSuccess extends DataWriteContext {
  readonly record: Readonly<Record<string, unknown>> | undefined;
}
export interface DataWriteFailure extends DataWriteContext { readonly error: unknown; }
/** Optional synchronous callbacks. Before callbacks may return an error to veto a write.
 * After callbacks observe confirmed API success; they are not database transaction hooks. */
export interface DataWriteHooks {
  beforeCreate?: (context: DataWriteContext) => string | void;
  beforeUpdate?: (context: DataWriteContext) => string | void;
  beforeDelete?: (context: DataWriteContext) => string | void;
  afterCreate?: (context: DataWriteSuccess) => undefined;
  afterUpdate?: (context: DataWriteSuccess) => undefined;
  afterDelete?: (context: DataWriteSuccess) => undefined;
  onError?: (context: DataWriteFailure) => undefined;
}

export interface DataSourceConfig {
  endpoint: string;
  hooks?: DataWriteHooks;
  /** Additional resource families changed by business policies during CRUD. Commands invalidate all reads. */
  invalidates?: string[];
  /** REST is the ERP contract. Legacy syntax is an explicit compatibility option. */
  addressStyle?: 'rest' | 'odata';
  singleton?: boolean;
  updateFields?: string[];
  requiredCreateFields?: string[];
  omitEmptyFields?: string[];
  meaningfulFields?: string[];
  permissions?: { create?: 'create' | 'modify' | 'delete'; update?: 'create' | 'modify' | 'delete'; delete?: 'create' | 'modify' | 'delete' };
  paging?: 'offset' | 'cursor';
  writableStates?: { field: string; values: unknown[] };
  newRecordDefaults?: Record<string, unknown>;
  contractProfileKey?: string;
  keyField?: string;
  parentKeyField?: string;
  parentFixedFields?: Record<string, unknown>;
  createFields?: string[];
  updateBlockedFields?: string[];
  documentNoField?: string;
  contextDocumentNoField?: string;
  lineNo?: boolean;
  autoGenerateNumber?: boolean;
  lazyCreateOnFirstInput?: boolean;
  defaultSort?: string;
  defaultFilter?: string;
  pageSize?: number;
  supportsCreate?: boolean;
  supportsUpdate?: boolean;
  supportsDelete?: boolean;
  navigation?: {
    parentEndpoint: string;
    childCollection: string;
    parentIdFields?: string[];
    top?: number;
  };
}
