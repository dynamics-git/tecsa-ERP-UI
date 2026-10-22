import { TestBed } from '@angular/core/testing';
import { describe, it, expect } from 'vitest';
import { of } from 'rxjs';
import { DynamicForm } from '../../shared/ui/dynamic-form/dynamic-form';
import { DATA_REST_SERVICE } from '../data/data-source.service';
import { FieldValidationService } from './field-validation.service';
import { DocumentConfigDataService } from '../data/document-config-data.service';
import { LineConfig } from '../models/line-config.model';
import { DocumentStateService } from '../data/document-state.service';
import { DocumentLines } from './document-lines/document-lines';
import { FieldConfig } from '../models/field-config.model';
import { normalizeFieldValue, fieldValuesEqual, compareDecimalValues, fieldEditorValue, fieldInputType } from '../models/field-value';
import { fieldIsHidden, fieldIsReadonly } from '../models/field-state';
import { lookupQuery, clearDependentLookups } from '../data/lookup-dependencies';

describe('Shared configurable field contract with synthetic records', () => {
  const validation = new FieldValidationService();
  const valid = (type: FieldConfig['valueType'], value: unknown) => validation.validateField({key:'value', label:'Value', valueType:type},value).valid;
  it('applies conditional required, visibility and readonly rules from the same record',()=>{
    const field:FieldConfig={key:'reference',label:'Reference',requiredWhen:{field:'status',values:['Released']}};
    expect(validation.validateField(field,'',{status:'Open'}).valid).toBe(true);
    expect(validation.validateField(field,'',{status:'Released'}).valid).toBe(false);
    expect(fieldIsHidden({hiddenWhen:{field:'kind',values:['Service']}},{kind:'Service'})).toBe(true);
    expect(fieldIsReadonly({readonlyWhen:{field:'status',values:['Open'],negate:true}},{status:'Released'})).toBe(true);
  });
  it('does not dirty records for repeated shared header events',()=>{
    const state=TestBed.inject(DocumentStateService),header={code:'PR'};
    expect(state.applyHeaderFieldChange(header,{fieldKey:'code',value:' pr ',previousValue:'PR'},{code:'code'})).toBe(false);
    expect(state.applyHeaderFieldChange(header,{fieldKey:'code',value:'VEND',previousValue:'PR'},{code:'code'})).toBe(true);
    expect(header.code).toBe('VEND');
  });
  it('hydrates saved blanks without reapplying defaults and keeps backend line numbers out of create payloads',()=>{
    const data=TestBed.inject(DocumentConfigDataService),sections=[{id:'general',fields:[{key:'description',label:'Description',defaultValue:'Default'}]}];
    expect(data.buildHeaderData({description:null},sections)['description']).toBeNull();
    expect(data.buildHeaderData({description:''},sections)['description']).toBe('');
    expect(data.buildHeaderSeed(sections)['description']).toBe('Default');
    const config:LineConfig={placement:{mode:'end'},lineKeyField:'lineNo',toolbarButtons:[],columns:[{id:'code',label:'Code',valueType:'code'},{id:'lineNo',label:'Line No.',readonly:true}],dataSource:{endpoint:'/lines',createFields:['code','lineNo'],requiredCreateFields:['code']}};
    expect(data.buildLineCreatePayload({code:' pr ',lineNo:10000,__entryPlaceholder:true},config)).toEqual({code:'PR'});
    expect(data.buildLineCreatePayload({code:'PR'},{...config,dataSource:{endpoint:'/lines',createFields:[]}})).toBeNull();
  });
  it('normalizes codes but preserves text casing and leading zeros', () => {
    expect(normalizeFieldValue('  pr001  ','code')).toBe('PR001');
    expect(normalizeFieldValue('  Mixed Case  ','text')).toBe('  Mixed Case  ');
    expect(fieldValuesEqual('PR001',' pr001 ','code')).toBe(true);
  });
  it('preserves decimal precision in normalization, comparison and the editor type', () => {
    expect(normalizeFieldValue('9007199254740993.1200','decimal')).toBe('9007199254740993.1200');
    expect(fieldValuesEqual('0001.2000','1.2','decimal')).toBe(true);
    expect(compareDecimalValues('9007199254740993.12','9007199254740993.11')).toBe(1);
    expect(fieldInputType('decimal')).toBe('text');
    expect(valid('integer','9007199254740993')).toBe(false);
    expect(valid('integer','2.5')).toBe(false);
    expect(valid('number','wrong')).toBe(false);
  });
  it('validates exact decimal precision, scale and boundaries', () => {
    const field: FieldConfig = {key:'amount',label:'Amount',valueType:'decimal',validation:{precision:6,scale:2,min:0,max:9999.99}};
    expect(validation.validateField(field,'9999.99').valid).toBe(true);
    for (const value of ['10000.00','1.001','-0.01','NaN']) expect(validation.validateField(field,value).valid).toBe(false);
  });
  it('accepts blank optional values and requires values without rejecting zero or false', () => {
    expect(valid('date','')).toBe(true);
    const field: FieldConfig = {key:'value',label:'Value',required:true};
    for (const value of ['',null,undefined,' ']) expect(validation.validateField(field,value).valid).toBe(false);
    for (const value of [false,0]) expect(validation.validateField(field,value).valid).toBe(true);
  });
  it('compares large decimal bounds without rounding their declared limits',()=>{
    const field:FieldConfig={key:'amount',label:'Amount',valueType:'decimal',validation:{max:'9007199254740993.12'}};
    expect(validation.validateField(field,'9007199254740993.12').valid).toBe(true);
    expect(validation.validateField(field,'9007199254740993.13').valid).toBe(false);
  });
  it('enforces date/time bounds and reports invalid configured patterns without crashing',()=>{
    const field:FieldConfig={key:'date',label:'Date',valueType:'date',validation:{min:'2026-10-01',max:'2026-10-31'}};
    expect(validation.validateField(field,'2026-10-22').valid).toBe(true);expect(validation.validateField(field,'2026-11-01').valid).toBe(false);
    expect(validation.validateField({key:'time',label:'Time',valueType:'time',validation:{max:'09:30'}},'09:30:00').valid).toBe(true);
    expect(validation.validateField({key:'value',label:'Value',validation:{pattern:'['}},'anything').errors[0]).toContain('configuration');
  });
  it('checks real calendar dates and time boundaries', () => {
    expect(valid('date','2024-02-29')).toBe(true);
    expect(valid('date','2025-02-29')).toBe(false);
    expect(valid('date','2026-13-01')).toBe(false);
    expect(valid('datetime','2026-10-22T09:30:20Z')).toBe(true);
    expect(valid('datetime','2026-02-30T09:30:00Z')).toBe(false);
    expect(valid('datetime','2026-10-22T24:30:00Z')).toBe(false);
    expect(valid('time','23:59:59')).toBe(true);
    expect(valid('time','24:00')).toBe(false);
    expect(fieldInputType('datetime')).toBe('datetime-local');
    const instant='2026-10-22T09:30:20.123Z';
    expect(normalizeFieldValue(fieldEditorValue(instant,'datetime'),'datetime')).toBe(instant);
  });
  it('validates identifiers, email and URLs without making ordinary text uppercase', () => {
    expect(valid('guid','7fc8ef9c-60be-44d8-808a-c64271b244c9')).toBe(true);
    expect(valid('guid','not-an-id')).toBe(false);
    expect(valid('email','user@example.com')).toBe(true);
    expect(valid('email','user@')).toBe(false);
    expect(valid('url','https://example.com')).toBe(true);
    expect(valid('url','javascript:alert(1)')).toBe(false);
  });
  it('keeps invalid edits visible with a field-level message and does not emit a save change',()=>{
    TestBed.configureTestingModule({imports:[DynamicForm],providers:[{provide:DATA_REST_SERVICE,useValue:{get:()=>of([])}}]});
    const fixture=TestBed.createComponent(DynamicForm), form=fixture.componentInstance;
    const field:FieldConfig={key:'quantity',label:'Quantity',valueType:'integer',required:true};
    fixture.componentRef.setInput('sections',[{id:'general',fields:[field]}]);fixture.componentRef.setInput('data',{quantity:2});fixture.detectChanges();
    let emitted=0;form.fieldChanged.subscribe(()=>emitted++);form.updateFieldValue(field,'2.5');fixture.changeDetectorRef.markForCheck();fixture.detectChanges();
    expect(form.data['quantity']).toBe(2);expect(form.getFieldValue(field)).toBe('2.5');expect(emitted).toBe(0);expect(fixture.nativeElement.querySelector('[role=alert]').textContent).toContain('whole number');
    form.updateFieldValue(field,3);fixture.detectChanges();expect(form.errors.size).toBe(0);expect(emitted).toBe(1);fixture.destroy();
  });
  it('keeps configured defaults out of filler cells until a real row starts', () => {
    TestBed.configureTestingModule({imports:[DocumentLines],providers:[{provide:DATA_REST_SERVICE,useValue:{get:()=>of([])}}]});
    const fixture = TestBed.createComponent(DocumentLines);
    const column = {id:'quantity',label:'Quantity',valueType:'decimal' as const,defaultValue:'1'};
    const row: Record<string, unknown> = {quantity:'1',__entryPlaceholder:true};
    fixture.componentRef.setInput('columns',[column]);
    fixture.componentRef.setInput('rows',[row]); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('tbody input').value).toBe('');
    expect(row['quantity']).toBe('1');
    delete row['__entryPlaceholder']; fixture.changeDetectorRef.markForCheck(); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('tbody input').value).toBe('1');
    fixture.destroy();
  });
  it('shows validation beside an edited grid cell',()=>{
    TestBed.configureTestingModule({imports:[DocumentLines],providers:[{provide:DATA_REST_SERVICE,useValue:{get:()=>of([])}}]});
    const f=TestBed.createComponent(DocumentLines),column={id:'quantity',label:'Quantity',valueType:'integer' as const},row={quantity:2};
    f.componentRef.setInput('columns',[column]);f.componentRef.setInput('rows',[row]);f.detectChanges();
    f.componentInstance.updateCellValue(column,row,2.5);f.changeDetectorRef.markForCheck();f.detectChanges();
    expect(f.nativeElement.querySelector('[role=alert]').textContent).toContain('whole number');f.destroy();
  });
  it('renders one field per config, preserves explicit blanks, and emits only actual edits', async () => {
    TestBed.configureTestingModule({imports:[DynamicForm],providers:[{provide:DATA_REST_SERVICE,useValue:{get:()=>of([])}}]});
    const fixture=TestBed.createComponent(DynamicForm), form=fixture.componentInstance;
    const fields: FieldConfig[] = [{key:'code',label:'Code',valueType:'code',required:true}, {key:'description',label:'Description',defaultValue:'Default'}, {key:'active',label:'Active',type:'boolean'}, {key:'amount',label:'Amount',valueType:'decimal'}];
    fixture.componentRef.setInput('sections',[{id:'general',fields}]);
    fixture.componentRef.setInput('data',{code:'PR',description:null,active:false,amount:'9007199254740993.12'});
    fixture.detectChanges();
    expect(form.getFieldValue(fields[1])).toBe('');
    const inputs=fixture.nativeElement.querySelectorAll('input');
    expect(inputs.length).toBe(4);
    expect(inputs[3].value).toBe('9007199254740993.12');
    let changes=0; form.fieldChanged.subscribe(()=>changes++);
    form.notifyFieldInteracted(fields[0]); form.updateFieldValue(fields[0],' pr ');
    expect(changes).toBe(0);
    form.updateFieldValue(fields[0],'vend'); expect(changes).toBe(1);
    expect(form.data['code']).toBe('VEND');
    fixture.destroy();
  });
  it('uses the same safe business constraints for lookup opening, search and paging', () => {
    const lookup={endpoint:'/bins',valueField:'id',displayField:'code',filter:'active eq true',dependsOn:[{field:'locationId',valueFrom:'location'}]};
    expect(lookupQuery(lookup,{}).ready).toBe(false);
    expect(lookupQuery(lookup,{location:"O'Brien"},'bin').filter).toBe("(active eq true) and (locationId eq 'O''Brien') and (contains(code, 'bin'))");
    expect(lookupQuery({...lookup,dependsOn:[{field:'quantity',valueFrom:'quantity',valueType:'number'}]},{quantity:0}).ready).toBe(true);
  });
  it('supports explicit header-to-line dependencies without confusing a same-named line field',()=>{
    const lookup={endpoint:'/bins',valueField:'id',displayField:'code',dependsOn:[{source:'header' as const,field:'locationId',valueFrom:'location'}]};
    expect(lookupQuery(lookup,{location:'LINE'},'',{location:'HEADER'}).filter).toBe("(locationId eq 'HEADER')");
    const row={location:'LINE',bin:'old'};
    expect(clearDependentLookups([{key:'bin',lookup}],['location'],row).updates).toEqual({});
    expect(clearDependentLookups([{key:'bin',lookup}],['location'],row,'header').updates).toEqual({bin:null});
  });
  it('clears invalid dependent selections and chained choices, retaining previous values for save handling', () => {
    const fields=[{key:'bin',lookup:{endpoint:'/bins',valueField:'id',displayField:'code',dependsOn:[{field:'location',valueFrom:'location'}]}},{key:'shelf',lookup:{endpoint:'/shelves',valueField:'id',displayField:'code',dependsOn:[{field:'bin',valueFrom:'bin'}]}}];
    const row={location:'B',bin:'old-bin',shelf:'old-shelf'};
    const result=clearDependentLookups(fields,['location'],row);
    expect(result.updates).toEqual({bin:null,shelf:null});
    expect(result.previous).toEqual({bin:'old-bin',shelf:'old-shelf'});
    expect(clearDependentLookups(fields,[],row).updates).toEqual({});
  });
});
