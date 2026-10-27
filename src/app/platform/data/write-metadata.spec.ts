import { describe, expect, it } from 'vitest';
import { headerDataSourceDefaults, lineConfigDefaults } from './document-config-defaults';
import { DocumentConfigDataService } from './document-config-data.service';
import { LineMasterService } from './line-master.service';
import { EntityContractService } from './entity-contract.service';
import { LineConfig } from '../models/line-config.model';
import { purchaseRequisitionLineConfig } from '../../features/purchasing/purchase-requisition/purchase-requisition.config';

const service = new DocumentConfigDataService(new LineMasterService());
const contract = new EntityContractService();
const config: LineConfig = {
  placement: {mode:'end'}, toolbarButtons: [],
  dataSource: {endpoint:'/fixtures', createFields:['description','code','amount','serverInput'], updateFields:['description','code','amount','serverInput','blocked'], updateBlockedFields:['blocked']},
  columns: [
    {id:'description',label:'Description'},
    {id:'code',label:'Code',readonlyAfterCreate:true},
    {id:'amount',label:'Amount',readonly:true},
    {id:'blocked',label:'Blocked'},
  ],
};

describe('Write metadata without duplicate page block lists',()=>{
  it('excludes readonly values on create and readonlyAfterCreate values on update while preserving explicit server inputs',()=>{
    const row={description:'Example',code:'A',amount:900,serverInput:42,blocked:'x',undeclared:'x'};
    expect(service.buildLineCreatePayload(row,config)).toEqual({description:'Example',code:'A',serverInput:42});
    expect(service.buildLineUpdatePayload(row,Object.keys(row),config)).toEqual({description:'Example',serverInput:42});
  });
  it('enforces the same rules in resolved header allowlists and final transport sanitization',()=>{
    const source=headerDataSourceDefaults(config.dataSource,{dialogTitle:'Fixture',toolbarButtons:[],sections:[{id:'general',fields:[
      {key:'description',label:'Description'}, {key:'code',label:'Code',readonlyAfterCreate:true}, {key:'amount',label:'Amount',readonly:true},
    ]}]});
    const row={description:'Example',code:'A',amount:900,serverInput:42,blocked:'x'};
    expect(contract.sanitizePayload(source,'create',row)).toEqual({description:'Example',code:'A',serverInput:42});
    expect(contract.sanitizePayload(source,'update',row)).toEqual({description:'Example',serverInput:42});
  });
  it('protects PR calculated fields with only their readonly declarations',()=>{
    const {updateBlockedFields,meaningfulFields,...source}=purchaseRequisitionLineConfig.dataSource;
    const pr=lineConfigDefaults({...purchaseRequisitionLineConfig,dataSource:source});
    const row={lineType:'item',itemId:123,quantity:'2',estimatedUnitCost:'5',qtyPerUnitOfMeasure:'10',estimatedAmount:'10',convertedQuantity:'0',remainingQuantity:'2'};
    expect(service.buildLineUpdatePayload(row,Object.keys(row),pr)).toEqual({lineType:'item',itemId:123,quantity:'2',estimatedUnitCost:'5'});
    const draft=service.createEmptyLineRow(pr,{}, {defaultType:'item',emptyType:' ',byType:{}},{});
    expect(pr.dataSource.meaningfulFields!.some(key=>!!draft[key])).toBe(false);
    expect(pr.dataSource.meaningfulFields).toContain('description');
    expect(pr.dataSource.meaningfulFields).not.toContain('estimatedAmount');
    expect(service.buildLineCreatePayload(draft,pr)).toBeNull();
    draft['itemId']=123;
    expect(service.buildLineCreatePayload(draft,pr, ['itemId'])).not.toHaveProperty('locationId');
  });
});
