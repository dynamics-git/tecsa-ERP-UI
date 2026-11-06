import {describe, expect, it} from 'vitest';
import {purchaseRequisitionHeaderConfig as header, purchaseRequisitionLineConfig as line, purchaseRequisitionListConfig as page} from './purchase-requisition.config';
import {purchaseRequisitionFactBoxConfig as factBox} from './purchase-requisition.factbox.config';
import {prFieldContractFixture, purchaseRequisitionLineConfig as resolved} from '../../../testing/pr-reference.fixture';

describe('Thin PR declaration against its real PostgreSQL field contract', () => {
  it('resolves the Page source while declaring the Header-Line link in Angular', () => {
    expect(page.objectId).toBe(10000);
    expect(page.dataSource).toEqual({defaultSort:'number desc',pageSize:25,autoGenerateNumber:true,omitEmptyFields:['number'],headerPKProp:'number',writableStates:{field:'status',values:['open']}});
    expect(line.dataSource).toMatchObject({endpoint:'/purchaseRequisitionLines',headerPKProp:'number',lineFKProp:'documentNumber',parentFieldMap:{documentType:'documentType'}});
    expect(resolved.dataSource).toMatchObject({endpoint:'/purchaseRequisitionLines',keyField:'systemId',headerPKProp:'number',lineFKProp:'documentNumber',parentFieldMap:{documentType:'documentType'}});
  });
  it('uses one persisted No. with conditional Item and GL lookup presentation', () => {
    const choices=line.columns.filter(column=>column.displayColumn==='number');
    expect(choices.map(column=>column.field)).toEqual(['number','number']);
    expect(choices.map(column=>column.lookup?.valueField)).toEqual(['number','number']);
    expect(choices.map(column=>column.lookup?.endpoint)).toEqual(['/items','/glAccounts']);
    expect(line.columns.find(column=>column.id==='lineType')?.clearFieldsOnChange).toEqual(['number','unitOfMeasureCode','locationCode']);
  });
  it('declares only published fields and leaves physical validation to Core', () => {
    const sources=prFieldContractFixture.data.entities;
    for(const field of header.sections.flatMap(section=>section.fields).filter(field=>field.key!=='documentTypeLabel'))
      expect(field.key in sources.purchaseRequisitions.fields).toBe(true);
    expect(header.sections.flatMap(section=>section.fields).find(field=>field.key==='documentTypeLabel'))
      .toMatchObject({type:'text',readonly:true,defaultValue:'Purchase Requisition'});
    for(const column of line.columns)expect((column.field??column.id) in sources.purchaseRequisitionLines.fields).toBe(true);
    expect(line.columns.find(column=>column.id==='description')?.validation).toBeUndefined();
    expect(resolved.columns.find(column=>column.id==='description')?.validation?.maxLength).toBe(100);
    expect(line.columns.find(column=>column.id==='quantity')?.defaultValue).toBe('1');
    expect(line.columns.find(column=>column.id==='quantity')?.validation?.custom).toBeTypeOf('function');
  });
  it('keeps workflow declarations, live preview, totals and collaboration behaviour', () => {
    expect(header.toolbarButtons.map(command=>command.apiAction?.name)).toEqual(['submit','approve','reject','reopen','cancel']);
    expect(line.calculation).toEqual([{target:'estimatedAmount',formula:'quantity * estimatedUnitCost',precision:6}]);
    expect(factBox).toMatchObject({enabled:true,notes:true,attachments:true});
    expect(factBox.sections?.map(section=>section.id)).toEqual(['requisition','amounts','audit']);
  });
});
