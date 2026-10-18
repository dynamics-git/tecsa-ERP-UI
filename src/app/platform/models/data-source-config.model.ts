export interface DataSourceConfig {
  endpoint: string;
  /** Laravel uses REST paths, { data } envelopes and page/perPage pagination. */
  transport?: 'odata' | 'laravel';
  contractProfileKey?: string;
  keyField?: string;
  parentKeyField?: string;
  parentFixedFields?: Record<string, unknown>;
  createFields?: string[];
  updateBlockedFields?: string[];
  /** Explicit Laravel PATCH allowlist, enforced before sending a request. */
  updateFields?: string[];
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
