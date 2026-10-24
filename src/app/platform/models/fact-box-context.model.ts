/** A saved record addressed through its existing company-scoped API. */
export interface FactBoxContext {
  /** Register custom editors with the existing UnsavedChangesService using this host scope. */
  unsavedScope?: object;
  recordEndpoint?: string;
  companyId?: string;
  pageId?: string;
  record?: Readonly<Record<string, unknown>>;
  action?: (actionKey: string) => void;
}
