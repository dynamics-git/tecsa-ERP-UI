import type { RecordIdentityConfig } from './record-identity.model';
export type ContractOperation = 'create' | 'update' | 'delete';

export interface EntityContractProfile {
  key: string;
  endpointAliases: string[];
  identity?: RecordIdentityConfig;
  createAllowList?: string[];
  updateAllowList?: string[];
  outboundFieldMap?: Record<string, string>;
  omitFields?: string[];
  deleteKeyCandidates?: string[];
}
