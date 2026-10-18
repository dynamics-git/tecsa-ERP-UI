export interface DataSourceConfig {
  endpoint: string;
  /** Transport format only; business APIs are independent of pages. */
  transport?: 'odata' | 'laravel';
  /** Backend-owned field capabilities declared by page configuration. */
  updateFields?: string[];
  requiredCreateFields?: string[];
  oneOfCreateFields?: string[];
  positiveCreateFields?: string[];
  /** Fields the Laravel resource accepts as equality filter parameters. */
  filterFields?: string[];
  maxPageSize?: number;
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
    style?: 'odata' | 'rest';
    parentEndpoint: string;
    childCollection: string;
    parentIdFields?: string[];
    top?: number;
  };
}
