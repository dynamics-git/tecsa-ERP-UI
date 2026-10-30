import {TestBed} from '@angular/core/testing';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {provideRouter} from '@angular/router';
import {DocumentLines} from '../../document/document-lines/document-lines';
import {DynamicForm} from '../../../shared/ui/dynamic-form/dynamic-form';
import {DataSourceService} from '../../data/data-source.service';
import {FieldValidationService} from '../../document/field-validation.service';
import {purchaseRequisitionLineConfig} from '../../../features/purchasing/purchase-requisition/purchase-requisition.config';

const quantity = purchaseRequisitionLineConfig.columns.find(c=>c.id==='quantity')!;
afterEach(()=>TestBed.resetTestingModule());
describe('PR reference for optional shared field validation',()=>{
 it('checks only the edited Quantity, with no rule imposed by ordinary save validation',()=>{
  const validation=new FieldValidationService();
  const field={...quantity,key:'quantity'};
  expect(validation.validateField(field,'2',{},true).errors[0]).toContain('Choose Type');
  expect(validation.validateField(field,'2',{lineType:'item'},true).errors[0]).toContain('Choose No.');
  expect(validation.validateField(field,'2',{lineType:'item',itemId:123},true).valid).toBe(true);
  expect(validation.validateField(field,'2',{lineType:'gl_account',glAccountId:456},true).valid).toBe(true);
  expect(validation.validateField(field,'2',{}).valid).toBe(true);
  expect(validation.validateField({...field,validation:undefined},'2',{},true).valid).toBe(true);
 });
 it('runs built-in validation first and handles validator failures without accepting the edit',()=>{
  const validation=new FieldValidationService(), custom=vi.fn(()=>undefined);
  const field={...quantity,key:'quantity',validation:{custom}};
  expect(validation.validateField(field,'bad',{},true).valid).toBe(false);
  expect(custom).not.toHaveBeenCalled();
  expect(validation.validateField({...field,validation:{custom:()=>{throw new Error('test');}}},'2',{},true).valid).toBe(false);
 });
 it('retains invalid header input and runs fill only after validation succeeds',()=>{
  TestBed.configureTestingModule({imports:[DynamicForm],providers:[provideRouter([])]});
  const f=TestBed.createComponent(DynamicForm), form=f.componentInstance;
  const custom=vi.fn(({record}: {record:Readonly<Record<string,unknown>>})=>record['itemId']===123 ? undefined : 'Choose No.');
  const field={key:'quantity',label:'Quantity',type:quantity.type,validation:{custom},targets:[{key:'description',source:'description'}]};
  f.componentRef.setInput('sections',[{id:'general',fields:[field]}]);
  f.componentRef.setInput('data',{quantity:'1'});f.detectChanges();
  const changed=vi.spyOn(form.fieldChanged,'emit');
  form.updateFieldValue(field,'3');expect(changed).not.toHaveBeenCalled();expect(form.data['quantity']).toBe('1');expect(form.getFieldValue(field)).toBe('3');
  form.data['itemId']=123;form.updateFieldValue(field,'3');expect(changed).toHaveBeenCalledOnce();expect(form.data['quantity']).toBe('3');
  f.destroy();
 });
 it('validates a line before clear/fill and retains the invalid editor value',()=>{
  TestBed.configureTestingModule({imports:[DocumentLines],providers:[provideRouter([])]});
  const f=TestBed.createComponent(DocumentLines),grid=f.componentInstance;
  const column={...quantity,clearFieldsOnChange:['description'],fill:{description:'description'}};
  const row:Record<string,unknown>={lineType:'item',quantity:'1',description:'Keep'};
  grid.columns=[column];grid.rows=[row];const changed=vi.spyOn(grid.rowChanged,'emit');
  grid.updateCellValue(column,row,'3');expect(changed).not.toHaveBeenCalled();expect(row).toMatchObject({quantity:'1',description:'Keep'});expect(grid.getCellValue(row,column)).toBe('3');
  row['itemId']=123;grid.updateCellValue(column,row,'3');expect(changed).toHaveBeenCalledOnce();expect(row['quantity']).toBe('3');expect(grid.cellError(row,column)).toBe('');f.destroy();
 });
 it('validates each selected PR line independently during bulk Quantity editing',()=>{
  TestBed.configureTestingModule({imports:[DocumentLines],providers:[provideRouter([])]});
  const f=TestBed.createComponent(DocumentLines),grid=f.componentInstance;
  const rows=[{lineType:'item',itemId:123,quantity:'1'},{lineType:'item',quantity:'1'}];
  grid.columns=[quantity];grid.rows=rows;grid.showSelection=true;grid.enableBulkEditFromSelection=true;
  grid.toggleRowSelection(0,true);grid.toggleRowSelection(1,true);
  const changed=vi.spyOn(grid.rowChanged,'emit');grid.updateCellValue(quantity,rows[0],'3');
  expect(changed).toHaveBeenCalledOnce();expect(rows[0].quantity).toBe('3');expect(rows[1].quantity).toBe('1');expect(grid.getCellValue(rows[1],quantity)).toBe('3');expect(grid.cellError(rows[1],quantity)).toContain('Choose No.');f.destroy();
 });
 it('rejects invalid pasted Quantity before mutation and clears an editor draft after corrected paste',async()=>{
  TestBed.configureTestingModule({imports:[DocumentLines],providers:[provideRouter([])]});
  const f=TestBed.createComponent(DocumentLines),grid=f.componentInstance;
  const row:Record<string,unknown>={systemId:'line',lineType:'item',quantity:'1'};
  grid.columns=[quantity];grid.rows=[row];const changed=vi.spyOn(grid.rowChanged,'emit');
  grid.updateCellValue(quantity,row,'3');await grid.pasteText('4',0,0);
  expect(changed).not.toHaveBeenCalled();expect(row['quantity']).toBe('1');expect(grid.clipboardMessage).toContain('Choose No.');
  row['itemId']=123;await grid.pasteText('4',0,0);expect(changed).toHaveBeenCalledOnce();expect(grid.getCellValue(row,quantity)).toBe('4');expect(grid.cellError(row,quantity)).toBe('');f.destroy();
 });

 it('allows afterValidate updates only to declared writable fields and validates their values',()=>{
  const validation=new FieldValidationService();
  const field={...quantity,key:'quantity',validation:{afterValidate:()=>({description:'Reviewed'})}};
  const fields=[field,{key:'description',label:'Description',validation:{maxLength:20}}];
  expect(validation.validateField(field,'2',{itemId:123},true,fields).updates).toEqual({description:'Reviewed'});
  expect(validation.validateField(field,'2',{},true,[field,{key:'description',label:'Description',readonly:true}]).valid).toBe(false);
  expect(validation.validateField(field,'2',{},true,[field]).valid).toBe(false);
  expect(validation.validateField(field,'2',{},true,[field,{key:'description',label:'Description',validation:{maxLength:2}}]).valid).toBe(false);
 });
 it('applies validated updates before the line-change event and its calculations',()=>{
  TestBed.configureTestingModule({imports:[DocumentLines],providers:[provideRouter([])]});const f=TestBed.createComponent(DocumentLines),grid=f.componentInstance;
  const column={...quantity,validation:{afterValidate:({value}: {value:unknown})=>({description:'Quantity '+value})}};
  const row={lineType:'item',itemId:123,quantity:'1',description:'Old'};grid.columns=[column,{id:'description',label:'Description'}];grid.rows=[row];
  const changed=vi.spyOn(grid.rowChanged,'emit');grid.updateCellValue(column,row,'2');expect(row.description).toBe('Quantity 2');expect(changed).toHaveBeenCalledWith(expect.objectContaining({updatedFields:['description']}));f.destroy();
 });

});

function deferred<T>() { let resolve!:(value:T)=>void; const promise=new Promise<T>(done=>resolve=done);return {promise,resolve}; }
describe('PR reference for optional asynchronous field validation',()=>{
 it('keeps header input pending and ignores an older response',async()=>{
  TestBed.configureTestingModule({imports:[DynamicForm],providers:[provideRouter([])]});
  const f=TestBed.createComponent(DynamicForm),form=f.componentInstance,a=deferred<string|undefined>(),b=deferred<string|undefined>();
  const field={key:'purpose',label:'Purpose',validation:{customAsync:vi.fn().mockReturnValueOnce(a.promise).mockReturnValueOnce(b.promise)}};
  form.sections=[{id:'general',fields:[field]}];form.data={purpose:'Old'};
  const changed=vi.spyOn(form.fieldChanged,'emit');form.updateFieldValue(field,'First');form.updateFieldValue(field,'Latest');
  expect(form.data['purpose']).toBe('Old');expect(form.getFieldValue(field)).toBe('Latest');expect(form.validate()).toBe(false);
  b.resolve(undefined);await vi.waitFor(()=>expect(form.data['purpose']).toBe('Latest'));
  a.resolve('Obsolete error');await Promise.resolve();await Promise.resolve();expect(form.getFieldValue(field)).toBe('Latest');expect(form.errors.size).toBe(0);expect(changed).toHaveBeenCalledOnce();f.destroy();
 });
 it('retains a rejected line value and saves only the corrected retry',async()=>{
  TestBed.configureTestingModule({imports:[DocumentLines],providers:[provideRouter([])]});
  const f=TestBed.createComponent(DocumentLines),grid=f.componentInstance;
  const column={...quantity,validation:{customAsync:vi.fn().mockRejectedValueOnce(new Error('Offline')).mockResolvedValueOnce(undefined)}};
  const row={quantity:'1'};grid.columns=[column];grid.rows=[row];const changed=vi.spyOn(grid.rowChanged,'emit');
  grid.updateCellValue(column,row,'3');await vi.waitFor(()=>expect(grid.cellError(row,column)).toContain('Try again'));
  expect(row.quantity).toBe('1');expect(grid.getCellValue(row,column)).toBe('3');expect(changed).not.toHaveBeenCalled();
  grid.updateCellValue(column,row,'4');await vi.waitFor(()=>expect(row.quantity).toBe('4'));expect(changed).toHaveBeenCalledOnce();f.destroy();
 });
 it('never applies a line result validated against changed prerequisites',async()=>{
  TestBed.configureTestingModule({imports:[DocumentLines],providers:[provideRouter([])]});
  const f=TestBed.createComponent(DocumentLines),grid=f.componentInstance,pending=deferred<string|undefined>();
  const column={...quantity,validation:{customAsync:()=>pending.promise}},row={quantity:'1',itemId:123};grid.columns=[column];grid.rows=[row];
  const changed=vi.spyOn(grid.rowChanged,'emit');grid.updateCellValue(column,row,'3');row.itemId=456;pending.resolve(undefined);
  await vi.waitFor(()=>expect(grid.cellError(row,column)).toContain('Record changed'));expect(row.quantity).toBe('1');expect(grid.getCellValue(row,column)).toBe('3');expect(changed).not.toHaveBeenCalled();f.destroy();
 });
 it('ignores completion after the editor is destroyed',async()=>{
  TestBed.configureTestingModule({imports:[DynamicForm],providers:[provideRouter([])]});
  const f=TestBed.createComponent(DynamicForm),form=f.componentInstance,pending=deferred<string|undefined>();
  const field={key:'purpose',label:'Purpose',validation:{customAsync:()=>pending.promise}};form.data={purpose:'Old'};
  const changed=vi.spyOn(form.fieldChanged,'emit');form.updateFieldValue(field,'New');f.destroy();pending.resolve(undefined);await Promise.resolve();await Promise.resolve();expect(changed).not.toHaveBeenCalled();expect(form.data['purpose']).toBe('Old');
 });
 it('waits for remote paste validation before changing a PR line',async()=>{
  TestBed.configureTestingModule({imports:[DocumentLines],providers:[provideRouter([])]});
  const f=TestBed.createComponent(DocumentLines),grid=f.componentInstance,pending=deferred<string|undefined>();
  const column={...quantity,validation:{customAsync:()=>pending.promise}},row={systemId:'line',quantity:'1'};grid.columns=[column];grid.rows=[row];
  const changed=vi.spyOn(grid.rowChanged,'emit'),paste=grid.pasteText('5',0,0);expect(row.quantity).toBe('1');expect(changed).not.toHaveBeenCalled();pending.resolve(undefined);await paste;expect(row.quantity).toBe('5');expect(changed).toHaveBeenCalledOnce();f.destroy();
 });
});

describe('PR async validation scope and bulk safety',()=>{
 it('retains input without emitting a write after company/session context changes',async()=>{
  TestBed.configureTestingModule({imports:[DynamicForm],providers:[provideRouter([])]});
  let current=true;vi.spyOn(TestBed.inject(DataSourceService),'captureWriteScope').mockImplementation(() => ()=>current);
  const f=TestBed.createComponent(DynamicForm),form=f.componentInstance,pending=deferred<string|undefined>();
  const field={key:'purpose',label:'Purpose',validation:{customAsync:()=>pending.promise}};form.data={purpose:'Old'};
  const changed=vi.spyOn(form.fieldChanged,'emit');form.updateFieldValue(field,'New');current=false;pending.resolve(undefined);
  await vi.waitFor(()=>expect(form.errors.get('purpose')).toContain('Record changed'));expect(changed).not.toHaveBeenCalled();expect(form.getFieldValue(field)).toBe('New');f.destroy();
 });
 it('validates selected lines independently with async rules',async()=>{
  TestBed.configureTestingModule({imports:[DocumentLines],providers:[provideRouter([])]});const f=TestBed.createComponent(DocumentLines),grid=f.componentInstance;
  const column={...quantity,validation:{customAsync:async({record}:{record:Readonly<Record<string,unknown>>})=>record['itemId'] ? undefined : 'Choose No.'}};
  const rows=[{itemId:123,quantity:'1'},{quantity:'1'}];grid.rows=rows;grid.columns=[column];grid.showSelection=true;grid.enableBulkEditFromSelection=true;grid.toggleRowSelection(0,true);grid.toggleRowSelection(1,true);
  const changed=vi.spyOn(grid.rowChanged,'emit');grid.updateCellValue(column,rows[0],'3');
  await vi.waitFor(()=>expect(grid.cellError(rows[1],column)).toBe('Choose No.'));expect(changed).toHaveBeenCalledOnce();expect(rows[0].quantity).toBe('3');expect(rows[1].quantity).toBe('1');expect(grid.getCellValue(rows[1],column)).toBe('3');f.destroy();
 });
 it('applies only the latest line edit when responses complete out of order',async()=>{
  TestBed.configureTestingModule({imports:[DocumentLines],providers:[provideRouter([])]});const f=TestBed.createComponent(DocumentLines),grid=f.componentInstance,a=deferred<string|undefined>(),b=deferred<string|undefined>();
  const column={...quantity,validation:{customAsync:vi.fn().mockReturnValueOnce(a.promise).mockReturnValueOnce(b.promise)}},row={quantity:'1'};grid.rows=[row];grid.columns=[column];const changed=vi.spyOn(grid.rowChanged,'emit');
  grid.updateCellValue(column,row,'2');grid.updateCellValue(column,row,'3');b.resolve(undefined);await vi.waitFor(()=>expect(row.quantity).toBe('3'));a.resolve(undefined);await Promise.resolve();await Promise.resolve();expect(row.quantity).toBe('3');expect(changed).toHaveBeenCalledOnce();f.destroy();
 });
});
