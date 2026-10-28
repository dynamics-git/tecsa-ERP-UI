import { CoreMetadata } from '../../data/entity-contract.service';

// Relevant public metadata extracted from backend 7c010bc api-capabilities.v1.json.
// Domain hints are partial; this fixture intentionally includes only consumed nullable hints.
export const prCoreContract: CoreMetadata = {
  contractVersion: '1.0', entities: {},
  endpoints: [
    {"path":"/api/v1/companies/{companyId}/glAccounts","methods":["GET"],"type":"collection","queryProfiles":["glAccounts"]},
    {"path":"/api/v1/companies/{companyId}/items","methods":["GET"],"type":"collection","queryProfiles":["items"]},
    {"path":"/api/v1/companies/{companyId}/locations","methods":["GET"],"type":"collection","queryProfiles":["location"]},
    {"path":"/api/v1/companies/{companyId}/numberSeries","methods":["GET"],"type":"collection","queryProfiles":["numberSeries"]},
    {"path":"/api/v1/companies/{companyId}/purchaseRequisitions","methods":["GET"],"type":"collection","queryProfiles":["purchaseRequisitions"]},
    {"path":"/api/v1/companies/{companyId}/purchaseRequisitions","methods":["POST"],"type":"write","inputFields":{"number":{"nullable":true},"selectedNoSeriesId":{"nullable":true},"requiredDate":{"nullable":true},"purpose":{"nullable":true},"locationId":{"nullable":true}},"queryProfiles":[]},
    {"path":"/api/v1/companies/{companyId}/purchaseRequisitions/{requisitionId}/lines","methods":["GET"],"type":"nested-collection","queryProfiles":["purchaseRequisitionLine"]},
    {"path":"/api/v1/companies/{companyId}/purchaseRequisitions/{requisitionId}/lines","methods":["POST"],"type":"write","inputFields":{"itemId":{"nullable":true},"glAccountId":{"nullable":true},"unitOfMeasureId":{"nullable":true},"locationId":{"nullable":true},"requiredDate":{"nullable":true}},"queryProfiles":[]},
    {"path":"/api/v1/companies/{companyId}/purchaseRequisitions/{requisitionId}/lines/{systemId}","methods":["DELETE"],"type":"write","queryProfiles":[]},
    {"path":"/api/v1/companies/{companyId}/purchaseRequisitions/{requisitionId}/lines/{systemId}","methods":["GET"],"type":"record","queryProfiles":[]},
    {"path":"/api/v1/companies/{companyId}/purchaseRequisitions/{requisitionId}/lines/{systemId}","methods":["PATCH"],"type":"write","inputFields":{"itemId":{"nullable":true},"glAccountId":{"nullable":true},"unitOfMeasureId":{"nullable":true},"locationId":{"nullable":true},"requiredDate":{"nullable":true}},"queryProfiles":[]},
    {"path":"/api/v1/companies/{companyId}/purchaseRequisitions/{systemId}","methods":["GET"],"type":"record","queryProfiles":[]},
    {"path":"/api/v1/companies/{companyId}/purchaseRequisitions/{systemId}","methods":["PATCH"],"type":"write","inputFields":{"requiredDate":{"nullable":true},"purpose":{"nullable":true},"locationId":{"nullable":true}},"queryProfiles":[]},
    {"path":"/api/v1/companies/{companyId}/unitsOfMeasure","methods":["GET"],"type":"collection","queryProfiles":["unitOfMeasure"]},
  ],
  queryProfiles: {
  "glAccounts": {
    "search": [
      "number",
      "name",
      "searchName"
    ]
  },
  "items": {
    "search": [
      "number",
      "description",
      "description2",
      "searchDescription"
    ]
  },
  "location": {
    "search": [
      "code",
      "name",
      "city"
    ]
  },
  "numberSeries": {
    "search": [
      "code",
      "description"
    ]
  },
  "purchaseRequisitions": {
    "search": [
      "number",
      "purpose"
    ]
  },
  "purchaseRequisitionLine": {
    "search": [
      "description"
    ]
  },
  "unitOfMeasure": {
    "search": [
      "code",
      "description",
      "internationalStandardCode"
    ]
  }
}
};
