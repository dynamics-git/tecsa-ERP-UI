export interface DataSourceConfig {
  endpoint: string;
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
