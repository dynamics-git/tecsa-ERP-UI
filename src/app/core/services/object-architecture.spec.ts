import { describe, expect, it } from 'vitest';
import { buildPageRegistry, resolvePageModule, resolvePageObject, resolvePageType } from './page-registry';
import { PageModule, PageType } from '../../platform/public-api';
import { pageObjectDefinition } from '../../platform/models/object-definition.model';
import { purchaseRequisitionListConfig, purchaseRequisitionLineConfig } from '../../features/purchasing/purchase-requisition/purchase-requisition.config';
import { PurchaseRequisitionPage } from '../../features/purchasing/purchase-requisition/purchase-requisition';
import { DocumentConfigDataService } from '../../platform/data/document-config-data.service';
import { LineMasterService } from '../../platform/data/line-master.service';

function moduleFor(pageId: string, pageType: PageType, objectId: number, objectName = pageId): PageModule {
  return { ExamplePage: class {}, listConfig: { pageId, pageType, object: {
    objectType: 'page', objectId, objectName,
    sourceTable: {objectType: 'table', objectId: 10000, objectName: 'Purchase Requisition'},
  } } };
}

describe('Object identity through the existing configured page runtime', () => {
  it('resolves PR Object ID to the same module, component, pageId and document mode', () => {
    const entry = resolvePageObject(10000)!;
    expect(entry.pageId).toBe('purchase-requisition');
    expect(entry.moduleRef).toBe(resolvePageModule('purchase-requisition'));
    expect(Object.values(entry.moduleRef)).toContain(PurchaseRequisitionPage);
    expect(resolvePageType(entry.pageId)).toBe('document');
    expect(entry.object).toBe(purchaseRequisitionListConfig.object);
    expect(entry.object.sourceTable.objectId).toBe(10000);
    expect(entry.object.codeunit?.objectId).toBe(10000);
    expect(resolvePageObject(999999)).toBeUndefined();
  });

  it.each(['list', 'card', 'document', 'worksheet'] as const)('retains the existing %s page mode', kind => {
    const pages = buildPageRegistry([moduleFor('sample', kind, 50000)]);
    expect(pages.get('sample')?.pageType).toBe(kind);
    expect(pages.get('sample')?.object?.objectId).toBe(50000);
  });

  it('rejects duplicate identities and names, invalid IDs and wrongly typed references', () => {
    expect(() => buildPageRegistry([moduleFor('one', 'list', 50000), moduleFor('two', 'card', 50000)])).toThrow('Duplicate Page Object');
    expect(() => buildPageRegistry([moduleFor('one', 'list', 50000, 'Same'), moduleFor('two', 'card', 50001, 'same')])).toThrow('Duplicate Page Object');
    for (const id of [0, -1, 1.5, 2147483648]) {
      expect(() => buildPageRegistry([moduleFor('bad', 'list', id)])).toThrow('Invalid page object');
    }
    expect(() => pageObjectDefinition({objectType:'page',objectId:50000,objectName:'Bad',sourceTable:{objectType:'page',objectId:10000,objectName:'Wrong'}})).toThrow('Invalid table object');
  });

  it('keeps PR record UUIDs separate from document-number/type Header–Line binding', () => {
    expect(purchaseRequisitionListConfig.dataSource.keyField).toBe('systemId');
    expect(purchaseRequisitionLineConfig.dataSource.keyField).toBe('systemId');
    const core = new DocumentConfigDataService(new LineMasterService());
    const header = {systemId:'header-record-uuid',number:'PR-000001',documentType:'purchase_requisition'};
    const row = core.createEmptyLineRow(purchaseRequisitionLineConfig, header, {defaultType:'item',emptyType:'',byType:{}}, {});
    expect(row['documentNumber']).toBe(header.number);
    expect(row['documentType']).toBe(header.documentType);
    expect(row['systemId']).toBeUndefined();
    expect(row['objectId']).toBeUndefined();
    expect(purchaseRequisitionLineConfig.dataSource.parentFieldMap).toEqual({documentType:'documentType'});
    expect(purchaseRequisitionLineConfig.dataSource.defaultSort).toBe('lineNo asc');
  });
});
