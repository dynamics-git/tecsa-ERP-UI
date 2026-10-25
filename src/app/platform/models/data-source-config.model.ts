export interface DataSourceConfig {
  endpoint: string;
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
