import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, describe, expect, it } from 'vitest';
import { of } from 'rxjs';
import { LineCalculationService } from './line-calculation.service';
import { headerDataSourceDefaults, lineConfigDefaults } from '../data/document-config-defaults';
import { DocumentWindow } from './document-window/document-window';
import { DATA_REST_SERVICE } from '../data/data-source.service';
import { DocumentPageCommandAssemblerService } from '../pages/document-page-command-assembler.service';
import { StandardListActionsService } from '../pages/standard-list-actions.service';
import { SessionService } from '../../core/services/session.service';
import { purchaseRequisitionHeaderConfig, purchaseRequisitionLineConfig, purchaseRequisitionListConfig } from '../../features/purchasing/purchase-requisition/purchase-requisition.config';

afterEach(() => TestBed.resetTestingModule());

describe('Configurable totals use the existing calculation engine', () => {
  it('provides standard zero totals without requiring page boilerplate and preserves overrides', () => {
    const engine = new LineCalculationService();
    const totals = {subtotal:{formula:'sum(amount)'},total:{formula:'totals.subtotal + totals.sst'}};
    expect(engine.calculateLineTotals([{amount:'12.50'}],{totals})).toMatchObject({subtotal:'12.50',sst:'0.00',total:'12.50'});
    expect(engine.calculateLineTotals([{amount:'12.50'}],{totals,defaults:{sst:'2.50'}})).toMatchObject({subtotal:'12.50',sst:'2.50',total:'15.00'});
    expect(engine.calculateLineTotals([],{totals})).toMatchObject({subtotal:'0.00',sst:'0.00',total:'0.00'});
  });
  it('resolves arbitrary subtotal, discount, tax, charges, rounding and grand total keys regardless of declaration order', () => {
    const engine = new LineCalculationService();
    const rows = [{ amount: '12.50' }, { amount: '7.50' }];
    const before = structuredClone(rows);
    const totals = engine.calculateLineTotals(rows, {
      defaults: { net: '0.00', rebate: '0.00', levy: '0.00', freight: '0.00', rounding: '0.00', grand: '0.00' },
      totals: {
        grand: { formula: 'totals.net - totals.rebate + totals.levy + totals.freight + totals.rounding' },
        levy: { formula: 'header.confirmedTax' },
        net: { kind: 'sum', field: 'amount' },
        rebate: { formula: 'header.confirmedDiscount' },
        freight: { formula: 'header.confirmedCharges' },
        rounding: { formula: 'header.confirmedRounding' },
      },
    }, { confirmedTax: '1.25', confirmedDiscount: '2', confirmedCharges: '3', confirmedRounding: '-0.01' });
    expect(totals['net']).toBe('20.00');
    expect(totals['grand']).toBe('22.24');
    expect(rows).toEqual(before);
  });
  it('preserves old defaults and line formula behavior while supporting configured display precision', () => {
    const engine = new LineCalculationService();
    const row = { quantity: '2.123456', cost: '15.5', amount: 0 };
    expect(engine.applyCalculations(row, [{ target: 'amount', formula: 'quantity * cost', precision: 6 }])).toEqual(['amount']);
    expect(row.amount).toBe(32.913568);
    const legacy = engine.calculateLineTotals([row], { defaults: engine.emptyTotals, totals: { total: { kind: 'sum', field: 'amount' } } });
    expect(legacy.total).toBe('32.91');
    expect(legacy.subtotal).toBe('0.00');
    expect(engine.calculateLineTotals([row], { defaults: {}, totals: { exactPreview: { formula: 'sum(amount)', precision: 6 } }, format: { precision: 6 } })['exactPreview']).toBe('32.913568');
  });
  it('rejects unknown or circular configured total references and leaves the next calculation usable', () => {
    const engine = new LineCalculationService();
    expect(() => engine.calculateLineTotals([], { defaults: {}, totals: { a: { formula: 'totals.b' }, b: { formula: 'totals.a' } } })).toThrow(/Circular/);
    expect(() => engine.calculateLineTotals([], { defaults: {}, totals: { a: { formula: 'totals.missing' } } })).toThrow(/Unknown/);
    expect(engine.calculateLineTotals([], { defaults: {}, totals: { a: { formula: '1 + 2' } } })['a']).toBe('3.00');
  });
});

describe('Shared document height and totals rendering', () => {
  function create(count: number) {
    TestBed.configureTestingModule({ imports: [DocumentWindow], providers: [provideRouter([]), { provide: DATA_REST_SERVICE, useValue: { get: () => of({ data: [] }) } }] });
    const fixture = TestBed.createComponent(DocumentWindow);
    fixture.componentRef.setInput('title', 'Synthetic document');
    fixture.componentRef.setInput('factBoxConfig', { enabled: false });
    fixture.componentRef.setInput('lineColumns', [{ id: 'quantity', label: 'Quantity', valueType: 'decimal' }]);
    fixture.componentRef.setInput('lineRows', Array.from({ length: count }, (_, index) => ({ quantity: String(index + 1) })));
    fixture.componentRef.setInput('footerSections', [{ id: 'totals', rows: [{ id: 'grand', label: 'Grand total', totalKey: 'grand', emphasis: true }] }]);
    fixture.componentRef.setInput('lineTotals', { grand: '123.45' });
    fixture.detectChanges();
    return fixture;
  }
  for (const count of [0, 2, 20, 100]) {
    it(`bounds the grid and keeps totals after ${count} lines`, () => {
      const fixture = create(count);
      const window = fixture.componentInstance;
      expect(window.lineGridHeight).toBeGreaterThanOrEqual(96);
      expect(window.lineGridHeight).toBeLessThanOrEqual(448);
      expect(window.enteredLineCount).toBe(count);
      const lines = fixture.nativeElement.querySelector('.lines-section');
      const totals = fixture.nativeElement.querySelector('.footer-section');
      expect(lines.compareDocumentPosition(totals) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(totals.textContent).toContain('123.45');
      fixture.destroy();
    });
  }
  it('places shared line tools after the row arrow, not in a General toolbar group, and copies the clicked row', () => {
    const fixture = create(2);
    const commands = [
      {label: 'Copy Line', actionKey: 'cmd:line-copy'},
      {label: 'Copy Rows', actionKey: 'cmd:line-copy-rows'},
      {label: 'Paste', actionKey: 'cmd:line-paste'},
    ];
    fixture.componentRef.setInput('lineToolbarButtons', commands);
    fixture.detectChanges();
    expect(fixture.componentInstance.resolvedGroupedLineToolbarButtons).toEqual([]);
    expect(fixture.componentInstance.resolvedLineRowCommands).toEqual(commands);
    const triggers = fixture.nativeElement.querySelectorAll('.row-actions-trigger');
    expect(triggers.length).toBe(2);
    const controls = triggers[1].parentElement;
    expect(controls.firstElementChild.classList.contains('row-pointer')).toBe(true);
    let action: {actionKey: string; payload?: unknown} | undefined;
    fixture.componentInstance.action.subscribe(event => { if(event.actionKey === 'cmd:line-copy') action=event; });
    triggers[1].click(); fixture.detectChanges();
    const menu = fixture.nativeElement.querySelector('.line-row-menu');
    expect(menu.getAttribute('popover')).toBe('auto');
    expect([...menu.querySelectorAll('button')].map((button:any) => button.textContent.trim())).toEqual(['Copy Line','Copy Rows','Paste']);
    menu.querySelector('button').click();
    expect(action).toMatchObject({actionKey:'cmd:line-copy',payload:{selectedIndexes:[1],activeRow:{quantity:'2'}}});
    fixture.destroy();
  });
  it('keeps permission-disabled row tools disabled and moves worksheet tools out of its header groups too', () => {
    const fixture=create(2);
    const commands=[{label:'Copy Line',actionKey:'cmd:line-copy',disabled:true}];
    fixture.componentRef.setInput('worksheet',true);
    fixture.componentRef.setInput('headerToolbarButtons',commands);
    fixture.detectChanges();
    expect(fixture.componentInstance.resolvedGroupedHeaderToolbarButtons).toEqual([]);
    expect(fixture.componentInstance.resolvedLineRowCommands).toEqual(commands);
    fixture.nativeElement.querySelector('.row-actions-trigger').click();fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.line-row-menu button').disabled).toBe(true);
    fixture.destroy();
  });
  it('retains keyboard resize bounds and can return to automatic size', () => {
    const fixture = create(2), window = fixture.componentInstance;
    const automatic = window.lineGridHeight;
    window.lineGridHeight = 10000;
    expect(window.lineGridHeight).toBe(640);
    window.lineGridHeight = -1;
    expect(window.lineGridHeight).toBe(96);
    window.resizeLinesByKeyboard(new KeyboardEvent('keydown', { key: 'ArrowDown', cancelable: true }));
    expect(window.lineGridHeight).toBe(128);
    window.resizeLinesByKeyboard(new KeyboardEvent('keydown', { key: 'Home', cancelable: true }));
    expect(window.lineGridHeight).toBe(automatic);
    fixture.destroy();
  });
});

describe('PR uses supported header and line capabilities', () => {
  it('allows the supported header and line Delete APIs and preserves autosave and server numbering', () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    TestBed.inject(SessionService).SuperAdmin = true;
    const assembler = TestBed.inject(DocumentPageCommandAssemblerService);
    const header = assembler.resolveHeaderToolbarButtons({ pageId: 'purchase-requisition', dataSource: purchaseRequisitionListConfig.dataSource, toolbarButtons: purchaseRequisitionHeaderConfig.toolbarButtons });
    const lines = assembler.resolveLineToolbarButtons({ pageId: 'purchase-requisition', lineConfig: purchaseRequisitionLineConfig });
    expect(header.find(command => command.actionKey === 'cmd:delete')?.disabled).toBe(false);
    expect(lines.find(command => command.actionKey === 'cmd:line-delete')?.disabled).not.toBe(true);
    const standard = TestBed.inject(StandardListActionsService).resolve({ pageId: 'purchase-requisition', dataSource: purchaseRequisitionListConfig.dataSource });
    expect(standard.delete).toMatchObject({ disabled: false });
    // PR uses the existing autosave default; pr-authoring.spec exercises writes and reopening.
    expect(purchaseRequisitionListConfig.autoSave).toBeUndefined();
    expect(purchaseRequisitionListConfig.dataSource.autoGenerateNumber).toBe(true);
  });
});

describe('PR document field layout follows its existing API', () => {
  it('places Lines after General and excludes server-controlled values from writes', () => {
    TestBed.configureTestingModule({ imports: [DocumentWindow], providers: [provideRouter([]), { provide: DATA_REST_SERVICE, useValue: { get: () => of({ data: [] }) } }] });
    const fixture = TestBed.createComponent(DocumentWindow);
    fixture.componentRef.setInput('headerSections', purchaseRequisitionHeaderConfig.sections);
    fixture.componentRef.setInput('linePlacement', purchaseRequisitionLineConfig.placement);
    fixture.componentRef.setInput('lineColumns', purchaseRequisitionLineConfig.columns);
    fixture.componentRef.setInput('lineRows', []);
    fixture.componentRef.setInput('factBoxConfig', { enabled: false });
    fixture.detectChanges();
    const titles = [...fixture.nativeElement.querySelectorAll('.entry-work > .entry-section > .section-title h3')].map((element: any) => element.textContent.trim());
    expect(titles).toEqual(['General', 'Lines', 'Request Details', 'Processing']);
    const source = headerDataSourceDefaults(purchaseRequisitionListConfig.dataSource, purchaseRequisitionHeaderConfig);
    expect(source.updateFields).toContain('locationId');
    for (const field of ['status', 'conversionStatus', 'purchaseOrderCount', 'statusChangedAt', 'systemCreatedAt', 'systemModifiedAt']) {
      expect(source.createFields).not.toContain(field);
      expect(source.updateFields).not.toContain(field);
    }
    const totals = new LineCalculationService().calculateLineTotals([{ estimatedAmount: '12.50' }, { estimatedAmount: '7.50' }], purchaseRequisitionLineConfig.totalsCalculation!);
    expect(totals.total).toBe('20.00');
    expect(purchaseRequisitionLineConfig.footerSections?.[0].rows).toMatchObject([
      { label: 'Subtotal', source: 'total', totalKey: 'subtotal' },
      { label: 'SST', source: 'total', totalKey: 'sst' },
      { label: 'Total Incl. SST', source: 'total', totalKey: 'total' },
    ]);
    const lines = lineConfigDefaults(purchaseRequisitionLineConfig);
    expect(lines.dataSource.updateFields).toEqual(expect.arrayContaining(['unitOfMeasureId', 'locationId']));
    for (const field of ['qtyPerUnitOfMeasure', 'convertedQuantity', 'remainingQuantity', 'estimatedAmount']) expect(lines.dataSource.updateFields).not.toContain(field);
    fixture.destroy();
  });
});
