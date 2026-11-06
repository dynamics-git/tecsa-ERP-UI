// Test-only DTO captured from the real fieldContracts endpoint in an isolated
// PostgreSQL transaction. This is not runtime schema or another field registry.
import dto from './pr-field-contract.fixture.json';
import { EntityContractService } from '../platform/data/entity-contract.service';
import { lineConfigDefaults } from '../platform/data/document-config-defaults';
import {
  purchaseRequisitionHeaderConfig as declaredHeader,
  purchaseRequisitionLineConfig as declaredLines,
  purchaseRequisitionListConfig as declaredPage,
} from '../features/purchasing/purchase-requisition/purchase-requisition.config';

export const prFieldContractFixture = dto;
export const prPageContractFixture = {...dto, data: {...dto.data,
  entities: {purchaseRequisitions: dto.data.entities.purchaseRequisitions},
}};
export const prLineContractFixture = {data: {contractVersion: '1.0', endpoints: [],
  entities: {purchaseRequisitionLines: dto.data.entities.purchaseRequisitionLines},
}};
const contracts = new EntityContractService();
if (!contracts.acceptPageMetadata(prPageContractFixture, declaredPage.objectId)) throw new Error('Invalid PostgreSQL PR source fixture');
contracts.acceptSourceMetadata(prLineContractFixture, '/purchaseRequisitionLines');
const bound = contracts.resolvePage(declaredPage, declaredLines);
// Behaviour-only suites start after binding. Separate integration suites exercise
// the actual Object ID request, permission snapshot and unbound declarations.
export const purchaseRequisitionListConfig = {...bound.config, objectId: undefined};
export const purchaseRequisitionHeaderConfig = {...declaredHeader, sections: declaredHeader.sections.map(section => ({...section,
  fields: section.fields.map(field => contracts.resolveField(bound.config.dataSource, field)),
}))};
export const purchaseRequisitionLineConfig = lineConfigDefaults({...bound.lineConfig!, columns: bound.lineConfig!.columns.map(column => {
  const field = contracts.resolveField(bound.lineConfig!.dataSource, {...column, key: column.field ?? column.id});
  return {...column, ...field, id: column.id, field: column.field, type: column.type ?? field.type};
})});
