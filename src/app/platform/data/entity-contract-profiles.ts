import { EntityContractProfile } from '../models/entity-contract.model';

export const ENTITY_CONTRACT_PROFILES: EntityContractProfile[] = [
  {
    key: 'purchaseOrderHeaders',
    endpointAliases: ['purchaseOrderHeaders'],
    createAllowList: [],
    updateAllowList: [],
    deleteKeyCandidates: ['systemId', 'SystemId', 'id', 'Id', 'number', 'Number', 'no', 'No']
  }
];
