import { TestBed } from '@angular/core/testing';
import { ChangeDetectorRef } from '@angular/core';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { DocumentLines } from './document-lines/document-lines';
import { LineCommandService } from './line-command.service';
import { FieldValidationService } from './field-validation.service';
import { RecordDeleteService } from '../data/record-delete.service';
import { DataSourceService } from '../data/data-source.service';
import { DocumentHydrationOrchestratorService } from '../data/document-hydration-orchestrator.service';
import { ListPersonalizationService } from '../pages/list-personalization.service';
import { readTabularText, writeTabularText } from '../data/tabular-text';
import { of, Subject } from 'rxjs';
import { LineConfig, LineColumnConfig } from '../models/line-config.model';

afterEach(()=>TestBed.resetTestingModule());
const quantity:LineColumnConfig={id:'quantity',label:'Quantity',valueType:'decimal',required:true,validation:{scale:6}};
function editor(columns:LineColumnConfig[]=[quantity], loadList=vi.fn(),inScope=()=>true) {
  TestBed.configureTestingModule({providers:[{provide:DocumentHydrationOrchestratorService,useValue:{}},{provide:ListPersonalizationService,useValue:{}}]});
  const source={getCachedLookup:vi.fn(),loadList,captureWriteScope:()=>inScope} as unknown as DataSourceService;
  const instance=TestBed.runInInjectionContext(()=>new DocumentLines(source,{markForCheck:vi.fn()} as unknown as ChangeDetectorRef,new FieldValidationService()));
  instance.columns=columns;return instance;
}
describe('Shared power-user line behavior',()=>{
  it('reads quoted Excel text, preserves decimals and rejects malformed or unbounded input',()=>{
    expect(readTabularText('"A\tB"\t12345678901234.123456\r\n"line\ntext"\t"a""b"\r\n')).toEqual([['A\tB','12345678901234.123456'],['line\ntext','a"b']]);
    expect(()=>readTabularText('a\tb\nc')).toThrow(/rectangular/);
    expect(()=>readTabularText('"unclosed')).toThrow(/unclosed/);
    expect(()=>readTabularText('a\nb\nc',2)).toThrow(/at most 2/);
    expect(writeTabularText([['=HYPERLINK("bad")','-12.500000','@name']])).toBe('"\'=HYPERLINK(""bad"")"\t-12.500000\t\'@name');
  });
  it('copies only editable create fields, excluding ownership, identity, status and calculations',()=>{
    TestBed.configureTestingModule({providers:[{provide:RecordDeleteService,useValue:{}}]});
    const service=TestBed.runInInjectionContext(()=>new LineCommandService());
    const config:LineConfig={placement:{mode:'end'},toolbarButtons:[],lineKeyField:'lineNo',dataSource:{endpoint:'/lines',keyField:'systemId',parentKeyField:'documentId',createFields:['systemId','lineNo','documentId','quantity','amount','status','hiddenValue','restricted']},columns:[
      {id:'systemId',label:'ID'},{id:'lineNo',label:'Line'},{id:'documentId',label:'Parent'},quantity,{id:'amount',label:'Amount'},
      {id:'status',label:'Status'},{id:'hiddenValue',label:'Hidden',hidden:true},{id:'restricted',label:'Restricted'}],
      calculation:[{target:'amount',formula:'quantity * 2'}]};
    expect(service.copyEditableValues({systemId:'old',lineNo:10000,documentId:'old-parent',quantity:'2.123456',amount:'999',status:'posted',hiddenValue:'secret',restricted:'x',__lookupRestricted_restricted:true},{documentId:'new-parent'},config)).toEqual({quantity:'2.123456'});
  });
  it('F8 updates only the focused cell through the normal change event without copying identity',()=>{
    const grid=editor();grid.showSelection=true;grid.enableBulkEditFromSelection=true;
    grid.rows=[{systemId:'one',quantity:'2.123456'},{systemId:'two',quantity:'1'},{systemId:'three',quantity:'9'}];
    grid.toggleAllRowsSelection(true);const changes=vi.fn();grid.rowChanged.subscribe(changes);
    const key=new KeyboardEvent('keydown',{key:'F8',cancelable:true});
    grid.handleCellKeydown(key,quantity,grid.rows[1],1);
    expect(key.defaultPrevented).toBe(true);expect(grid.rows[1]).toEqual({systemId:'two',quantity:'2.123456'});
    expect(grid.rows[2]['quantity']).toBe('9');expect(changes).toHaveBeenCalledTimes(1);
    expect(changes.mock.calls[0][0]).toMatchObject({previousValue:'1',value:'2.123456'});
  });
  it('Fill Down respects per-row readonly and a locked document',()=>{
    const column={...quantity,readonlyWhen:{field:'locked',values:[true]}};
    const grid=editor([column]);grid.rows=[{quantity:'5'},{quantity:'1',locked:true},{quantity:'2'}];grid.showSelection=true;grid.toggleAllRowsSelection(true);
    grid.handleCellKeydown(new KeyboardEvent('keydown',{key:'d',ctrlKey:true,cancelable:true}),column,grid.rows[0],0);
    expect(grid.rows.map(r=>r['quantity'])).toEqual(['5','1','5']);
    grid.disabled=true;grid.rows[0]['quantity']='8';grid.handleCellKeydown(new KeyboardEvent('keydown',{key:'F8'}),column,grid.rows[2],2);
    expect(grid.rows[2]['quantity']).toBe('5');
  });
  it('pastes into a blank line immediately with no preview or Apply step',async()=>{
    const grid=editor([{id:'description',label:'Description',valueType:'text'},quantity]);grid.rows=[{__entryPlaceholder:true}];
    const actions=vi.fn();grid.action.subscribe(actions);await grid.pasteText('Paper\t2.123456\nToner\t3');
    expect(actions).toHaveBeenCalledExactlyOnceWith({actionKey:'cmd:line-paste',payload:{rows:[{__entryPlaceholder:true,description:'Paper',quantity:'2.123456'},{description:'Toner',quantity:'3'}]}});
    expect(grid.clipboardMessage).toBe('');
  });
  it('updates the selected existing cells through one normal change event per row without copying identity',async()=>{
    const grid=editor([{id:'description',label:'Description'},quantity]);
    grid.rows=[{systemId:'a',systemRowVersion:5,description:'Old',quantity:'1'},{systemId:'b',systemRowVersion:9,description:'Keep',quantity:'2'}];
    const changed=vi.fn();grid.rowChanged.subscribe(changed);const creates=vi.fn();grid.action.subscribe(creates);
    await grid.pasteText('Updated\t3.123456',0,0);
    expect(grid.rows[0]).toEqual({systemId:'a',systemRowVersion:5,description:'Updated',quantity:'3.123456'});
    expect(grid.rows[1]['description']).toBe('Keep');expect(changed).toHaveBeenCalledTimes(1);
    expect(changed.mock.calls[0][0]).toMatchObject({updatedFields:['description'],value:'3.123456'});expect(creates).not.toHaveBeenCalled();
  });
  it('rejects the entire invalid range before changing any row or emitting a write',async()=>{
    const grid=editor();grid.rows=[{quantity:'1'},{quantity:'2'}];const changed=vi.fn();grid.rowChanged.subscribe(changed);
    await grid.pasteText('3\n12.1234567');expect(grid.rows.map(row=>row['quantity'])).toEqual(['1','2']);expect(changed).not.toHaveBeenCalled();expect(grid.clipboardMessage).toContain('Line 2');
  });
  it('supports 100 new rows with bounded lookup verification and deduplicates repeated codes',async()=>{
    const load=vi.fn(()=>of({value:[{systemId:'item-uuid',number:'ITEM-001'}]}));
    const grid=editor([{id:'itemId',label:'Item',lookup:{endpoint:'/items',valueField:'systemId',displayField:'number'}}],load),actions=vi.fn();grid.action.subscribe(actions);
    await grid.pasteText(Array(100).fill('ITEM-001').join('\n'));
    expect(load).toHaveBeenCalledTimes(1);expect(load.mock.calls[0]).toMatchObject([{endpoint:'/items',defaultFilter:"(number eq 'ITEM-001')"},{top:2,count:false}]);
    expect(actions.mock.calls[0][0].payload.rows).toHaveLength(100);expect(actions.mock.calls[0][0].payload.rows[0]['itemId']).toBe('item-uuid');
    await grid.pasteText(Array(101).fill('ITEM-001').join('\n'));expect(actions).toHaveBeenCalledTimes(1);expect(grid.clipboardMessage).toContain('at most 100');
  });
  it('does not apply paste after document, company scope or target data changes during lookup resolution',async()=>{
    for(const change of ['document','scope','row']) {
      TestBed.resetTestingModule();let allowed=true;const response=new Subject<unknown>();
      const grid=editor([{id:'itemId',label:'Item',lookup:{endpoint:'/items',valueField:'systemId',displayField:'number'}}],vi.fn(()=>response),()=>allowed);
      grid.rows=[{itemId:'old'}];const changed=vi.fn();grid.rowChanged.subscribe(changed);const pending=grid.pasteText('ITEM-001');
      if(change==='document')grid.headerData={systemId:'other'};else if(change==='scope')allowed=false;else grid.rows[0]['itemId']='changed';
      response.next({value:[{systemId:'item',number:'ITEM-001'}]});response.complete();await pending;
      expect(changed).not.toHaveBeenCalled();expect(grid.clipboardMessage).toMatch(/changed/);
    }
  });
  it('respects inapplicable account fields and blocks unverified or readonly pasted cells',async()=>{
    const load=vi.fn(()=>of({value:[{systemId:'item-id',number:'PAPER'}]}));
    const grid=editor([{id:'lineType',label:'Type',defaultValue:'item',options:[{value:'item',label:'Item'}]},
      {id:'itemId',label:'Item',lookup:{endpoint:'/items',valueField:'systemId',displayField:'number'}},
      {id:'glAccountId',label:'Account',editableWhen:{field:'lineType',values:['gl_account']}},
      {id:'description',label:'Description'},quantity],load);
    const actions=vi.fn();grid.action.subscribe(actions);
    await grid.pasteText('item\tPAPER\t\tQA paper\t4');expect(actions).toHaveBeenCalledTimes(1);
    expect(actions.mock.calls[0][0].payload.rows[0]).toMatchObject({lineType:'item',itemId:'item-id',description:'QA paper',quantity:'4'});
    await grid.pasteText('item\tPAPER\tforbidden\tQA paper\t4');expect(actions).toHaveBeenCalledTimes(1);expect(grid.clipboardMessage).toContain('Account is not editable');
    grid.disabled=true;await grid.pasteText('item\tPAPER\t\tNo write\t4');expect(actions).toHaveBeenCalledTimes(1);
  });
  it('Ctrl+V uses its clicked cell anchor and row-menu Paste uses the same direct operation',async()=>{
    const grid=editor([quantity]);grid.rows=[{quantity:'1'},{quantity:'2'}];
    const event={clipboardData:{getData:()=> '7'},preventDefault:vi.fn(),stopPropagation:vi.fn()} as unknown as ClipboardEvent;
    grid.handlePaste(event,quantity,1);await vi.waitFor(()=>expect(grid.rows[1]['quantity']).toBe('7'));expect(grid.rows[0]['quantity']).toBe('1');expect(event.preventDefault).toHaveBeenCalled();
    const readText=vi.fn().mockResolvedValue('9');Object.defineProperty(navigator,'clipboard',{configurable:true,value:{readText}});
    grid.rowMenuIndex=1;grid.runRowCommand({label:'Paste',actionKey:'cmd:line-paste'});
    await vi.waitFor(()=>expect(grid.rows[1]['quantity']).toBe('9'));expect(readText).toHaveBeenCalledTimes(1);
  });

  it('never includes empty entry placeholders in select-all or bulk edit',()=>{
    const grid=editor();grid.rows=[{systemId:'one',quantity:'1'},{__entryPlaceholder:true}];grid.showSelection=true;
    grid.toggleAllRowsSelection(true);expect(grid.isRowSelected(0)).toBe(true);expect(grid.isRowSelected(1)).toBe(false);
    expect(grid.allRowsSelected).toBe(true);grid.toggleRowSelection(1,true);expect(grid.isRowSelected(0)).toBe(true);expect(grid.isRowSelected(1)).toBe(false);
  });
  it('round-trips its own copied rows without line numbers, calculated columns or lookup captions shifting Type',async()=>{
    const columns:LineColumnConfig[]=[{id:'lineNo',label:'Line No.',readonly:true,valueType:'integer'},
      {id:'lineType',label:'Type',options:[{value:'item',label:'Item'},{value:'gl_account',label:'G/L Account'}]},
      {id:'itemId',label:'Item',lookup:{endpoint:'/items',valueField:'systemId',displayField:'number'}},
      {id:'glAccountId',label:'Account',editableWhen:{field:'lineType',values:['gl_account']}},
      {id:'description',label:'Description'},quantity,{id:'amount',label:'Amount',readonly:true}];
    const load=vi.fn(()=>of({value:[{systemId:'item-id',number:'PAPER'}]}));const grid=editor(columns,load);
    grid.rows=[{lineNo:10000,lineType:'item',itemId:'item-id',description:'Paper',quantity:'2.123456',amount:'99',__options_itemId:[{value:'item-id',label:'PAPER — Paper description',record:{systemId:'item-id',number:'PAPER'}}]}, {__entryPlaceholder:true}];
    const writeText=vi.fn().mockResolvedValue(undefined);Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText}});
    await grid.copySelectedRows([0]);const text=writeText.mock.calls[0][0];
    expect(readTabularText(text)).toEqual([['item','PAPER','','Paper','2.123456']]);
    const actions=vi.fn();grid.action.subscribe(actions);await grid.pasteText(text,1,0);
    expect(grid.clipboardMessage).toBe('');expect(actions).toHaveBeenCalledTimes(1);
    expect(actions.mock.calls[0][0].payload.rows[0]).toMatchObject({lineType:'item',itemId:'item-id',description:'Paper',quantity:'2.123456'});
    expect(actions.mock.calls[0][0].payload.rows[0]['lineNo']).toBeUndefined();
    expect(actions.mock.calls[0][0].payload.rows[0]['amount']).toBeUndefined();
  });
  it('identifies the actual Line No. and invalid value rather than an unexplained clipboard row number',async()=>{
    const type:LineColumnConfig={id:'lineType',label:'Type',options:[{value:'item',label:'Item'},{value:'gl_account',label:'G/L Account'}]};
    const grid=editor([{id:'lineNo',label:'Line No.',readonly:true,valueType:'integer'},type]);
    grid.rows=[{lineNo:60000,lineType:'item'}];await grid.pasteText('10000');
    expect(grid.clipboardMessage).toContain('Line No. 60000');expect(grid.clipboardMessage).toContain('“10000”');expect(grid.clipboardMessage).toContain('Item or G/L Account');
    expect(grid.rows[0]['lineType']).toBe('item');
  });

  it('pasted lookups reuse normal fill behavior, including readonly derived fields',async()=>{
    const item:LineColumnConfig={id:'itemId',label:'Item',lookup:{endpoint:'/items',valueField:'systemId',displayField:'number'},fill:{description:'description'}};
    const grid=editor([item,{id:'description',label:'Description',readonly:true}],vi.fn(()=>of({value:[{systemId:'new-item',number:'NEW',description:'New description'}]})));
    grid.rows=[{systemId:'line',itemId:'old-item',description:'Old description'}];const change=vi.fn();grid.rowChanged.subscribe(change);
    await grid.pasteText('NEW');
    expect(grid.rows[0]).toMatchObject({systemId:'line',itemId:'new-item',description:'New description'});
    expect(change).toHaveBeenCalledTimes(1);expect(change.mock.calls[0][0].updatedFields).toEqual(['description']);
  });
  it('allows an unchanged immutable field in a copied range but blocks changing it',async()=>{
    const grid=editor([{id:'code',label:'Code',readonlyAfterCreate:true},quantity]);grid.rows=[{systemId:'line',code:'A',quantity:'1'}];const change=vi.fn();grid.rowChanged.subscribe(change);
    await grid.pasteText('A\t2');expect(grid.rows[0]['quantity']).toBe('2');expect(change).toHaveBeenCalledTimes(1);
    await grid.pasteText('B\t3');expect(grid.rows[0]).toMatchObject({code:'A',quantity:'2'});expect(change).toHaveBeenCalledTimes(1);expect(grid.clipboardMessage).toContain('Code is not editable');
  });

});
