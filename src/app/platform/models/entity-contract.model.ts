export type ContractOperation = 'create' | 'update' | 'delete';

export interface EntityContractProfile {
  key: string;
  endpointAliases: string[];
  createAllowList?: string[];
  updateAllowList?: string[];
  outboundFieldMap?: Record<string, string>;
  omitFields?: string[];
  deleteKeyCandidates?: string[];
}
