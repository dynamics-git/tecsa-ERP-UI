import { EntityContractProfile } from '../models/entity-contract.model';

export const ENTITY_CONTRACT_PROFILES: EntityContractProfile[] = [
  {
    key: 'numberSeries',
    endpointAliases: ['numberSeries'],
    identity: {primaryField: 'code', secondaryField: 'description'},
  },
  {
    key: 'purchaseOrderHeaders',
    endpointAliases: ['purchaseOrderHeaders'],
    createAllowList: [],
    updateAllowList: [],
    deleteKeyCandidates: ['systemId', 'SystemId', 'id', 'Id', 'number', 'Number', 'no', 'No']
  }
];
