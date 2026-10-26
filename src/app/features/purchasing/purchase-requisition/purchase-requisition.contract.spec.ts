import { describe, expect, it } from 'vitest';
import { FieldValidationService } from '../../../platform/document/field-validation.service';
import { lineConfigDefaults } from '../../../platform/data/document-config-defaults';
import { DocumentConfigDataService } from '../../../platform/data/document-config-data.service';
import { LineMasterService } from '../../../platform/data/line-master.service';
import { purchaseRequisitionFactBoxConfig } from './purchase-requisition.factbox.config';
import { purchaseRequisitionHeaderConfig, purchaseRequisitionLineConfig, purchaseRequisitionListConfig } from './purchase-requisition.config';

describe('Purchase Requisition server contract', () => {
  const line = lineConfigDefaults(purchaseRequisitionLineConfig);

  it('declares the Item and G/L choices and explicit type identity', () => {
    expect(line.typeField).toBe('lineType');
    expect(line.columns.find(c => c.id === 'lineType')?.options?.map(x => x.value)).toEqual(['item', 'gl_account']);
    expect(line.columns.find(c => c.id === 'itemId')?.lookup?.endpoint).toBe('/items');
    expect(line.columns.find(c => c.id === 'glAccountId')?.lookup?.endpoint).toBe('/glAccounts');
    expect(line.dataSource.navigation?.childCollection).toBe('lines');
  });

  it('requires the correct master per type without demanding one on the other type', () => {
    const validator = new FieldValidationService();
    const itemField = line.fields!.find(f => f.key === 'itemId')!;
    const glField = line.fields!.find(f => f.key === 'glAccountId')!;
    expect(validator.validateField(itemField, null, { lineType: 'item' }).valid).toBe(false);
    expect(validator.validateField(glField, null, { lineType: 'item' }).valid).toBe(true);
    expect(validator.validateField(glField, null, { lineType: 'gl_account' }).valid).toBe(false);
    expect(validator.validateField(itemField, null, { lineType: 'gl_account' }).valid).toBe(true);
  });

  it('creates valid draft defaults and never writes calculated or server-owned columns', () => {
    const service = new DocumentConfigDataService(new LineMasterService());
    const registry = { defaultType: 'item', emptyType: ' ', byType: {} };
    const row = service.createEmptyLineRow(line, {}, registry, {});
    expect(row['lineType']).toBe('item');
    expect(row['quantity']).toBe('1');
    expect(row['itemId']).toBeNull();
    expect(line.dataSource.createFields).toContain('glAccountId');
    expect(line.dataSource.createFields).not.toContain('lineNo');
    expect(line.dataSource.createFields).not.toContain('estimatedAmount');
    const updated = service.buildLineUpdatePayload({
      lineType: 'gl_account', itemId: null, glAccountId: '123',
      unitOfMeasureId: null, locationId: null, estimatedAmount: '99',
    }, ['lineType','itemId','glAccountId','unitOfMeasureId','locationId','estimatedAmount'], line);
    expect(updated).toEqual({lineType:'gl_account',itemId:null,glAccountId:'123',unitOfMeasureId:null,locationId:null});
  });

  it('configures list, document and FactBox directly from backend response names', () => {
    expect(purchaseRequisitionListConfig.factBox).toBe(purchaseRequisitionFactBoxConfig);
    expect(purchaseRequisitionListConfig.dataSource.endpoint).toBe('/purchaseRequisitions');
    expect(purchaseRequisitionHeaderConfig.sections.flatMap(s => s.fields).map(f => f.key)).toContain('conversionStatus');
    expect(purchaseRequisitionFactBoxConfig.sections?.flatMap(s => s.fields?.map(f => f.field) ?? [])).toContain('purchaseOrderCount');
    expect(line.columns.filter(c => Boolean(c.factBox)).map(c => c.id)).toEqual(['description','quantity','estimatedAmount']);
  });
});
