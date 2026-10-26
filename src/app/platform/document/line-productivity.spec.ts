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
  it('previews valid paste without changing records; Apply emits a single bounded create intent',async()=>{
    const grid=editor([{id:'description',label:'Description',valueType:'text'},quantity]);grid.rows=[{description:'Original',quantity:'1'}];
    const actions=vi.fn();grid.action.subscribe(actions);await grid.preparePaste('Paper\t2.123456\nToner\t3');
    expect(grid.rows).toEqual([{description:'Original',quantity:'1'}]);expect(actions).not.toHaveBeenCalled();
    expect(grid.pastePreview?.errors).toEqual([]);grid.applyPaste();
    expect(actions).toHaveBeenCalledExactlyOnceWith({actionKey:'cmd:line-paste',payload:{rows:[{description:'Paper',quantity:'2.123456'},{description:'Toner',quantity:'3'}]}});
    grid.applyPaste();expect(actions).toHaveBeenCalledTimes(1);
  });
  it('blocks invalid paste and stale document context before any write intent',async()=>{
    const grid=editor();const actions=vi.fn();grid.action.subscribe(actions);await grid.preparePaste('12.1234567');
    expect(grid.pastePreview?.errors.length).toBeGreaterThan(0);grid.applyPaste();expect(actions).not.toHaveBeenCalled();
    await grid.preparePaste('2');grid.headerData={systemId:'other-company-document'};grid.applyPaste();
    expect(actions).not.toHaveBeenCalled();expect(grid.clipboardMessage).toContain('document changed');
  });
  it('resolves exact master codes with bounded reads and deduplicates repeated pasted values',async()=>{
    const load=vi.fn(()=>of({value:[{systemId:'item-uuid',number:'ITEM-001',description:'Paper'}]}));
    const grid=editor([{id:'itemId',label:'Item',lookup:{endpoint:'/items',valueField:'systemId',displayField:'number'}}],load);
    await grid.preparePaste('ITEM-001\nITEM-001'.replace('\\n','\n'));
    expect(load).toHaveBeenCalledTimes(1);
    expect(load.mock.calls[0]).toMatchObject([{endpoint:'/items',defaultFilter:"(number eq 'ITEM-001')"},{top:2,count:false}]);
    expect(grid.pastePreview?.errors).toEqual([]);expect(grid.pastePreview?.rows.map(row=>row['itemId'])).toEqual(['item-uuid','item-uuid']);
  });
  it('does not publish paste candidates after the document changes during lookup verification',async()=>{
    const response=new Subject<unknown>(),load=vi.fn(()=>response);
    const grid=editor([{id:'itemId',label:'Item',lookup:{endpoint:'/items',valueField:'systemId',displayField:'number'}}],load);
    const pending=grid.preparePaste('ITEM-001');grid.headerData={systemId:'other'};
    response.next({value:[{systemId:'item',number:'ITEM-001'}]});response.complete();await pending;
    expect(grid.pastePreview).toBeUndefined();expect(grid.clipboardMessage).toContain('context changed');
  });

  it('accepts a complete item row with an empty inapplicable account and rejects a supplied account value',async()=>{
    const load=vi.fn(()=>of({value:[{systemId:'item-id',number:'PAPER'}]}));
    const grid=editor([{id:'lineType',label:'Type',defaultValue:'item',options:[{value:'item',label:'Item'}]},
      {id:'itemId',label:'Item',lookup:{endpoint:'/items',valueField:'systemId',displayField:'number'}},
      {id:'glAccountId',label:'Account',editableWhen:{field:'lineType',values:['gl_account']}},
      {id:'description',label:'Description'},quantity],load);
    await grid.preparePaste('item\tPAPER\t\tQA paper\t4');expect(grid.pastePreview?.errors).toEqual([]);
    expect(grid.pastePreview?.rows[0]).toMatchObject({lineType:'item',itemId:'item-id',description:'QA paper',quantity:'4'});
    await grid.preparePaste('item\tPAPER\tforbidden\tQA paper\t4');expect(grid.pastePreview?.errors).toContain('Row 1: Account is not editable.');
  });
  it('rejects a prepared paste after the user or company access scope changes',async()=>{
    let allowed=true;const grid=editor([quantity],vi.fn(),()=>allowed),actions=vi.fn();grid.action.subscribe(actions);
    await grid.preparePaste('2');expect(grid.pastePreview?.errors).toEqual([]);allowed=false;grid.applyPaste();
    expect(actions).not.toHaveBeenCalled();expect(grid.clipboardMessage).toContain('document changed');
  });
  it('does not treat an unverified lookup code as an identifier',async()=>{
    const grid=editor([{id:'itemId',label:'Item',lookup:{endpoint:'/items',valueField:'systemId',displayField:'number'}}]);
    await grid.preparePaste('ITEM-001');expect(grid.pastePreview?.errors[0]).toContain('uniquely verified');
  });
});
