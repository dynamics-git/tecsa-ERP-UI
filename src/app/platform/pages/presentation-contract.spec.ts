import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe,it,expect,vi } from 'vitest';
import { of } from 'rxjs';
import { automaticDetailFields,detailValue } from './fact-box-display';
import { ListFilterPanel } from './list-filter-panel/list-filter-panel';
import { buildFieldFilter } from './list-filter-expression';
import { ListFilterService } from './list-filter.service';
import { ListFilterStateService } from './list-filter-state.service';
import { ListExportService } from './list-export.service';
import { ListPersonalizationService } from './list-personalization.service';
import { SessionService } from '../../core/services/session.service';
import { LineCalculationService } from '../document/line-calculation.service';
import { DocumentWindow } from '../document/document-window/document-window';
import { DATA_REST_SERVICE } from '../data/data-source.service';

describe('Shared filters, exports, details and document layout',()=>{
 it('builds escaped text, numeric ranges and boolean filters, and rejects invalid operators',()=>{
  expect(buildFieldFilter('code',"O'Brien",'eq')).toBe("code eq 'O''Brien'");
  expect(buildFieldFilter('quantity','10..20','expression','number')).toContain('quantity ge 10 and quantity le 20');
  expect(buildFieldFilter('quantity','2.5','ge','decimal')).toBe('quantity ge 2.5');
  expect(buildFieldFilter('active','false','eq','boolean')).toBe('active eq false');
  expect(()=>buildFieldFilter('quantity','abc','eq','number')).toThrow();
  expect(()=>buildFieldFilter('code','A..Z','expression','text')).toThrow();
  expect(()=>buildFieldFilter('not a field','x','eq')).toThrow();
 });
 it('keeps boolean and exact decimal semantics in dynamically derived filter controls',()=>{
  TestBed.configureTestingModule({imports:[ListFilterPanel],providers:[provideRouter([]),{provide:DATA_REST_SERVICE,useValue:{get:()=>of([])}}]});const f=TestBed.createComponent(ListFilterPanel);
  f.componentRef.setInput('columns',[{field:'amount',label:'Amount',type:'decimal'},{field:'active',label:'Active',type:'boolean'}]);f.detectChanges();
  expect(f.componentInstance.getValueInputType('amount')).toBe('text');expect(f.componentInstance.resolvedFilterOptions.find(option=>option.field==='active')?.valueType).toBe('boolean');f.destroy();
 });
 it('combines base, selected view, search and typed advanced filters and avoids unchanged reloads',()=>{
  const service=new ListFilterStateService(new ListFilterService());
  service.initialize('fixture',{baseFilter:'active eq true',views:[{id:'open',filter:"status eq 'Open'"}],activeViewId:'open',columns:[{field:'code',type:'text'},{field:'quantity',type:'number'}],advancedEnabled:true});
  expect(service.applyCommand('fixture','filterChanged',{searchText:"O'Brien"})).toBe(true);
  expect(service.applyCommand('fixture','filterChanged',{searchText:"O'Brien"})).toBe(false);
  expect(service.applyCommand('fixture','advancedFilterChanged',{field:'quantity',value:'2',operator:'ge'})).toBe(true);
  const filter=service.buildFilter('fixture');expect(filter).toContain("O''Brien");expect(filter).toContain("status eq 'Open'");expect(filter).toContain('quantity ge 2');expect(filter).toContain('active eq true');
 });
 it('isolates saved preferences by user and company, and survives malformed browser storage',()=>{
  const session={UserId:'fixture-user',Company:'fixture-A',Email:''};TestBed.configureTestingModule({providers:[{provide:SessionService,useValue:session}]});
  const preferences=TestBed.inject(ListPersonalizationService);
  expect(preferences.write('fixture','layout',{density:'compact'})).toBe(true);
  expect(preferences.read('fixture','layout',{})).toEqual({density:'compact'});
  session.Company='fixture-B';expect(preferences.read('fixture','layout',{})).toEqual({});
  session.Company='fixture-A';session.UserId='other-user';expect(preferences.read('fixture','layout',{})).toEqual({});
  const read=vi.spyOn(Storage.prototype,'getItem').mockReturnValue('{bad-json');expect(preferences.read('fixture','layout',{})).toEqual({});read.mockRestore();
 });
 it('uses configured fields plus four audit values for fallback and excludes arbitrary raw API metadata',()=>{
  const fields=automaticDetailFields([{field:'code',label:'Code'},{field:'private',label:'Private',factBox:false}],{code:'PR',private:'hidden',systemCreatedAt:'2026-10-22T09:30:00Z',systemCreatedBy:'u1',systemModifiedAt:'2026-10-22T09:31:00Z',systemModifiedBy:'u2',internalQueue:'RAW',accessToken:'secret'});
  expect(fields.map(field=>field.field)).toEqual(['code','systemCreatedAt','systemCreatedBy','systemModifiedAt','systemModifiedBy']);
  expect(fields[1].label).toBe('Created at');
  const row={systemCreatedAt:'2026-10-22T09:30:00Z',systemCreatedBy:'u1',systemModifiedBy:'u2',systemModifiedByName:'Another user'};
  expect(detailValue(row,{field:'systemCreatedBy',label:'Created by'},{id:'u1',name:'Fixture user'})).toBe('Fixture user');
  expect(detailValue(row,{field:'systemModifiedBy',label:'Modified by'},{id:'u1',name:'Fixture user'})).toBe('Another user');
  expect(detailValue(row,{field:'systemCreatedAt',label:'Created at'},{id:'u1',name:'Fixture user'})).not.toMatch(/GMT|T09|Z$/);
 });
 it('calculates declared line rules and totals without executing arbitrary JavaScript',()=>{
  const service=new LineCalculationService(),row={quantity:2,unitPrice:10};
  expect(service.applyCalculations(row,[{target:'amount',formula:'quantity * unitPrice',precision:2}])).toEqual(['amount']);
  expect((row as any).amount).toBe(20);
  expect(service.applyCalculations(row,[{target:'amount',formula:'quantity * unitPrice',precision:2}])).toEqual([]);
  expect(service.calculateLineTotals([row,{amount:30}],{defaults:{subtotal:'',sst:'',total:'',difference:''},totals:{subtotal:{kind:'sum',field:'amount'}}}).subtotal).toContain('50');
 });
 it('renders header, lines with totals, then the following header in configured order, with one FactBox toggle',()=>{
  TestBed.configureTestingModule({imports:[DocumentWindow],providers:[provideRouter([]),{provide:DATA_REST_SERVICE,useValue:{get:()=>of([])}}]});
  const f=TestBed.createComponent(DocumentWindow);
  f.componentRef.setInput('headerSections',[{id:'general',title:'General',fields:[{key:'code',label:'Code'}]},{id:'shipping',title:'Shipping',fields:[{key:'address',label:'Address'}]}]);
  f.componentRef.setInput('headerData',{code:'PR',address:'Fixture address'});
  f.componentRef.setInput('lineColumns',[{id:'quantity',label:'Quantity',valueType:'number'}]);f.componentRef.setInput('lineRows',[{quantity:2}]);f.componentRef.setInput('linePlacement',{mode:'after-section',afterSectionId:'general'});
  f.componentRef.setInput('footerSections',[{id:'totals',title:'Totals',rows:[{id:'total',label:'Total',value:'20.00'}]}]);f.detectChanges();
  const names=Array.from(f.nativeElement.querySelectorAll('.entry-work > section')).map((el:any)=>el.querySelector('h3')?.textContent?.trim());
  expect(names).toEqual(['General','Lines','Totals','Shipping']);expect(f.nativeElement.querySelectorAll('app-fact-box-toggle').length).toBe(1);
  f.componentRef.setInput('factBoxConfig',{enabled:false});f.detectChanges();expect(f.nativeElement.querySelectorAll('app-fact-box-toggle').length).toBe(0);f.destroy();
 });
 it('uses shared worksheet row details without per-page sections and follows the selected row',()=>{
  TestBed.configureTestingModule({imports:[DocumentWindow],providers:[provideRouter([]),{provide:DATA_REST_SERVICE,useValue:{get:()=>of([])}}]});
  const f=TestBed.createComponent(DocumentWindow);
  const rows=[{description:'First row',amount:'12.340000',category:'C1',private:'Hidden value',accessToken:'Secret value'}, {description:'Second row',amount:'56.780000',category:'C1'}];
  f.componentRef.setInput('worksheet',true);f.componentRef.setInput('factBoxConfig',{enabled:true});
  f.componentRef.setInput('lineColumns',[{id:'description',label:'Description'}, {id:'amount',label:'Amount',valueType:'decimal'}, {id:'category',label:'Category',cellType:'select',options:[{value:'C1',label:'Category one'}]}, {id:'private',label:'Private',hidden:true}]);
  f.componentRef.setInput('lineRows',rows);f.detectChanges();
  const details=()=>f.nativeElement.querySelector('.entry-info')?.textContent ?? '';
  expect(details()).toContain('Row details');expect(details()).toContain('First row');expect(details()).toContain('12.340000');expect(details()).toContain('Category one');
  expect(details()).not.toContain('Hidden value');expect(details()).not.toContain('Secret value');
  f.componentInstance.handleLineSelectionChanged({activeRow:rows[1],selectedRows:[rows[1]],selectedIndexes:[1]});f.changeDetectorRef.markForCheck();f.detectChanges();
  expect(details()).toContain('Second row');expect(details()).not.toContain('First row');
  f.componentRef.setInput('lineRows',[]);f.detectChanges();expect(details()).toContain('Select a row');
  f.componentRef.setInput('factBoxConfig',{enabled:false});f.detectChanges();expect(f.nativeElement.querySelector('.entry-info')).toBeNull();f.destroy();
 });
 it('exports CSV with formula protection, quoting and leading zeros without fetching more data',async()=>{
  const service=new ListExportService();let captured:Blob|undefined;
  const original=URL.createObjectURL;URL.createObjectURL=(blob:any)=>{captured=blob;return 'blob:fixture';};
  const click=vi.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(()=>{});
  try {await service.export('csv',{title:'Fixture',fileName:'fixture',headers:['Code','Text'],rows:[['00001','=1+1'],['PR','Quoted "text"']]});
    const text=await new Promise<string>(resolve=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.readAsText(captured!);});
    expect(text).toContain('"00001"'); expect(text).toContain(String.fromCharCode(39) + '=1+1'); expect(text).toContain('"Quoted ""text"""'); expect(click).toHaveBeenCalledOnce();
  } finally {URL.createObjectURL=original;click.mockRestore();}
 });
 it('reports a blocked print window without silently succeeding',async()=>{
  const open=vi.spyOn(window,'open').mockReturnValue(null);try{await expect(new ListExportService().export('print',{title:'Fixture',fileName:'fixture',headers:[],rows:[]})).rejects.toThrow('Allow the print window');}finally{open.mockRestore();}
 });
});
