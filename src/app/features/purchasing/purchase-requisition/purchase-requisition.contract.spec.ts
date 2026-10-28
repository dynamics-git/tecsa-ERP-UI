import { describe, expect, it } from 'vitest';
import { purchaseRequisitionFactBoxConfig } from './purchase-requisition.factbox.config';
import { purchaseRequisitionHeaderConfig, purchaseRequisitionLineConfig, purchaseRequisitionListConfig } from './purchase-requisition.config';

describe('Purchase Requisition server contract', () => {
  const line = purchaseRequisitionLineConfig;

  it('declares the Item and G/L choices and explicit type identity', () => {
    expect(line.typeField).toBe('lineType');
    expect(line.columns.find(c => c.id === 'lineType')?.options?.map(x => x.value)).toEqual(['item', 'gl_account']);
    expect(line.columns.find(c => c.id === 'itemId')?.lookup?.endpoint).toBe('/items');
    expect(line.columns.find(c => c.id === 'glAccountId')?.lookup?.endpoint).toBe('/glAccounts');
    expect(line.dataSource.navigation?.childCollection).toBe('lines');
  });

  it('declares active master bindings separately from create prerequisites and required indicators', () => {
    expect(line.columns.find(c => c.id === 'itemId')?.editableWhen).toEqual({field:'lineType',values:['item']});
    expect(line.columns.find(c => c.id === 'glAccountId')?.editableWhen).toEqual({field:'lineType',values:['gl_account']});
    expect(line.columns.some(c => c.required || c.requiredWhen)).toBe(false);
    expect(line.dataSource.requiredCreateFields).toBeUndefined();
  });

  it('uses existing fills and declares only supported editable fields', () => {
    expect(line.columns.find(c => c.id === 'itemId')?.fill).toEqual({description:'description'});
    expect(line.columns.find(c => c.id === 'glAccountId')?.fill).toEqual({description:'name'});
    for (const id of ['unitOfMeasureId','locationId']) {
      const column = line.columns.find(c => c.id === id)!;
      expect(column.lookup?.endpoint).toBeTruthy();
      expect(column.editableWhen).toBeUndefined();
      expect(column.readonly).not.toBe(true);
    }
    for (const id of ['lineNo','qtyPerUnitOfMeasure','estimatedAmount','convertedQuantity','remainingQuantity']) expect(line.columns.find(c => c.id === id)?.readonly).toBe(true);
  });

  it('configures list, document and FactBox directly from backend response names', () => {
    expect(purchaseRequisitionListConfig.factBox).toBe(purchaseRequisitionFactBoxConfig);
    expect(purchaseRequisitionListConfig.dataSource.endpoint).toBe('/purchaseRequisitions');
    expect(purchaseRequisitionHeaderConfig.sections.flatMap(s => s.fields).map(f => f.key)).toContain('conversionStatus');
    expect(purchaseRequisitionFactBoxConfig.sections?.flatMap(s => s.fields?.map(f => f.field) ?? [])).toContain('purchaseOrderCount');
    expect(purchaseRequisitionFactBoxConfig.sections?.flatMap(s => s.fields ?? []).find(f => f.field === 'estimatedTotal')?.type).toBe('currency');
    expect(line.columns.filter(c => Boolean(c.factBox)).map(c => c.id)).toEqual(['description','quantity','estimatedAmount']);
  });
});
