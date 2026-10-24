import { RunModalLoadingService } from './run-modal-loading.service';
import { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';
import { providePlatformGovernance } from '../../core/providers/platform-governance.provider';
import { SessionService } from '../../core/services/session.service';
import { DATA_REST_SERVICE } from '../data/data-source.service';
import { DocumentLines } from '../document/document-lines/document-lines';
import { DocumentWindow } from '../document/document-window/document-window';
import { DocumentPage } from '../pages/document-page/document-page';
import { PopupConfig } from '../models/popup-config.model';
import { RunModalHostData } from '../models/run-modal-host-data.model';
import { RunModalHost } from './run-modal-host/run-modal-host';
import { RunModalService } from './run-modal.service';
import { RunModalStackService } from './run-modal-stack.service';

const relatedPages = [
  ['item-units-of-measure', '/items/item-1/unitsOfMeasure'],
  ['item-default-dimensions', '/items/item-1/defaultDimensions'],
  ['vendor-default-dimensions', '/vendors/item-1/defaultDimensions'],
  ['currency-exchange-rates', '/currencies/item-1/exchangeRates'],
  ['dimension-values', '/dimensions/item-1/values'],
  ['gl-account-default-dimensions', '/glAccounts/item-1/defaultDimensions'],
  ['default-dimension-priorities', '/sourceCodes/item-1/defaultDimensionPriorities'],
  ['dimension-value-combinations', '/dimensionCombinations/item-1/valueCombinations'],
];

describe('Related master pages use the shared navigation stack', () => {
  let fixture: ComponentFixture<RunModalHost>;
  let modal: RunModalService;
  let stack: RunModalStackService;
  let popups: PopupConfig[];
  let requests: string[];
  let write: ReturnType<typeof vi.fn>;
  const item = {
    systemId: 'item-1',
    number: 'CABLE-CAT6-2M',
    description: 'CAT6 cable',
    systemRowVersion: 1,
  };
  const uomRow = {
    systemId: 'conversion-1',
    unitOfMeasureId: '11111111-1111-4111-8111-111111111111',
    qtyPerUnitOfMeasure: '1',
    systemRowVersion: 1,
  };

  beforeEach(() => {
    requests = [];
    popups = [];
    write = vi.fn((..._args: unknown[]) => of({}));
    TestBed.configureTestingModule({
      imports: [RunModalHost],
      providers: [
        provideRouter([]),
        ...providePlatformGovernance(),
        {
          provide: DATA_REST_SERVICE,
          useValue: {
            get: (url: string) => {
              requests.push(url);
              if (url.startsWith('/items/item-1/unitsOfMeasure'))
                return of({ data: [{ ...uomRow }], meta: { total: 1 } });
              if (url === '/items/item-1') return of({ data: { ...item } });
              if (url === '/unitsOfMeasure/11111111-1111-4111-8111-111111111111')
                return of({
                  data: {
                    systemId: '11111111-1111-4111-8111-111111111111',
                    code: 'PCS',
                    description: 'Piece',
                    systemRowVersion: 1,
                  },
                });
              if (url.startsWith('/unitsOfMeasure?'))
                return of({
                  data: [{ systemId: '11111111-1111-4111-8111-111111111111', code: 'PCS', description: 'Piece' }],
                  meta: { total: 1 },
                });
              return of({ data: [], meta: { total: 0 } });
            },
            post: write,
            patch: write,
            put: write,
            delete: write,
          },
        },
      ],
    });
    TestBed.inject(SessionService).SuperAdmin = true;
    modal = TestBed.inject(RunModalService);
    stack = TestBed.inject(RunModalStackService);
    stack.stack$.subscribe((value) => (popups = value));
    fixture = TestBed.createComponent(RunModalHost);
    fixture.detectChanges();
  });
  const data = (popup: PopupConfig) => popup.data as RunModalHostData;
  const settle = async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    await vi.waitFor(() =>
      expect(TestBed.inject(RunModalLoadingService).isAnyLoading()).toBe(false),
    );
    fixture.detectChanges();
  };
  const page = (index: number) =>
    fixture.debugElement.queryAll(By.directive(DocumentPage))[index]
      .componentInstance as DocumentPage;

  for (const [id, endpoint] of relatedPages) {
    it('opens only the parent-scoped grid for ' + id, async () => {
      expect(
        await modal.open({
          pageId: id,
          context: { headerData: { ...item, code: 'PARENT' } },
          target: 'entry',
        }),
      ).toBe(true);
      await settle();
      expect(requests.some((url) => url.startsWith(endpoint + '?'))).toBe(true);
      expect(page(0).inlineDocumentWindowConfig?.headerSections).toEqual([]);
      expect(page(0).inlineDocumentWindowConfig?.factBoxConfig?.enabled).toBe(true);
      expect(fixture.nativeElement.querySelector('app-dynamic-form')).toBeNull();
      expect(fixture.nativeElement.querySelectorAll('app-fact-box').length).toBe(1);
      expect(write).not.toHaveBeenCalled();
    });
  }

  it('opens a FactBox-configured command through the existing resolver from a selected List record', async () => {
    await modal.open({pageId: 'items', target: 'entry', context: {headerData: {...item}}}); await settle();
    const parent = page(0), config = parent.listConfig;
    parent.listConfig = {...config, factBox: {...config.factBox, buttons: [{label: 'Dimensions from FactBox', actionKey: 'cmd:factbox-dimensions', runModalPageId: 'item-default-dimensions', runModalTarget: 'entry', permissionKey: 'item-default-dimensions-lines'}]}};
    parent.selectedRow = {...item};
    parent.handleCommand({actionKey: 'cmd:factbox-dimensions'}); await vi.waitFor(() => expect({count: popups.length, error: parent.error, reason: modal.getLastOpenFailureReason()}).toMatchObject({count: 2})); await settle();
    expect(popups).toHaveLength(2); expect(data(popups[1]).runtimePage?.pageId).toBe('item-default-dimensions');
    expect(requests.some(url => url.startsWith('/items/item-1/defaultDimensions'))).toBe(true);
    expect(write).not.toHaveBeenCalled();
  });

  it('executes a configured FactBox API action through the same executor from List and Card', async () => {
    await modal.open({pageId: 'items', target: 'entry', context: {headerData: {...item}}}); await settle();
    const parent = page(0), button = {label: 'Recalculate', actionKey: 'cmd:factbox-recalculate', apiAction: { name: 'recalculate', payload: { mode: 'full' } }};
    parent.listConfig = {...parent.listConfig, factBox: {...parent.listConfig.factBox, buttons: [button]}};
    parent.selectedRow = {...item}; write.mockReturnValue(of({data: {...item, systemRowVersion: 2}}));
    parent.handleCommand({actionKey: button.actionKey});
    await vi.waitFor(() => expect(write).toHaveBeenCalledWith('/items/item-1/recalculate', {mode: 'full'}));
    await settle(); write.mockClear();
    await modal.open({pageId: 'items', target: 'entry', context: {headerData: {...item}}}); await settle();
    const card = page(1);
    card.listConfig = {...card.listConfig, factBox: {...card.listConfig.factBox, buttons: [button]}};
    card.handleInlineAction({actionKey: button.actionKey});
    await vi.waitFor(() => expect({calls: write.mock.calls, status: card.inlineDocumentWindowConfig?.statusMessage, header: card.inlineDocumentWindowConfig?.headerData}).toMatchObject({calls: [['/items/item-1/recalculate', {mode: 'full'}]]}));
    await settle();
  });
  it('rejects configured List actions for disallowed state, permission or multiple selection', async () => {
    await modal.open({pageId: 'items', target: 'entry', context: {headerData: {...item}}}); await settle();
    const parent = page(0), button = {label: 'Recalculate', actionKey: 'cmd:factbox-recalculate', apiAction: { name: 'recalculate', states: { field: 'state', values: ['Open'] } }};
    parent.listConfig = {...parent.listConfig, factBox: {...parent.listConfig.factBox, buttons: [button]}};
    parent.selectedRow = {...item, state: 'Closed'};
    parent.handleCommand({actionKey: button.actionKey}); await settle();
    expect(parent.error).toContain('state'); expect(write).not.toHaveBeenCalled();
    parent.handleCheckedKeysChanged(['item-1', 'item-2']);
    parent.handleCommand({actionKey: button.actionKey}); await settle();
    expect(parent.error).toContain('Select one'); expect(write).not.toHaveBeenCalled();
    parent.handleCheckedKeysChanged([]); parent.selectedRow = {...item, state: 'Open'};
    const session = TestBed.inject(SessionService); session.SuperAdmin = false; session.Permissions = [];
    parent.handleCommand({actionKey: button.actionKey}); await settle(); expect(write).not.toHaveBeenCalled();
  });
  it('keeps the Item card clean and returns through three levels without losing parent state or writing', async () => {
    expect(
      await modal.open({ pageId: 'items', target: 'entry', context: { headerData: { ...item } } }),
    ).toBe(true);
    await settle();
    const parent = page(0);
    const parentState = parent.inlineDocumentWindowConfig!;
    expect(parentState.lineColumns).toEqual([]);
    expect(requests.some((url) => url.startsWith('/items/item-1/unitsOfMeasure'))).toBe(false);
    expect(fixture.nativeElement.querySelectorAll('app-fact-box').length).toBe(1);
    parentState.headerData!['description'] = 'Retained local parent state';
    fixture.changeDetectorRef.markForCheck();
    fixture.detectChanges();
    parent.handleInlineAction({ actionKey: 'cmd:open-item-units-of-measure' });
    await vi.waitFor(() => expect(popups).toHaveLength(2));
    await settle();
    expect(popups).toHaveLength(2);
    expect(data(popups[1]).runtimePage?.pageId).toBe('item-units-of-measure');
    const related = page(1);
    const selected = related.inlineDocumentWindowConfig!.lineRows![0];
    related.handleInlineAction({
      actionKey: 'line:selection-changed',
      payload: { activeRow: selected, selectedRows: [selected], selectedIndexes: [0] },
    });
    related.handleInlineAction({ actionKey: 'cmd:open-related-master' });
    await vi.waitFor(() => expect(popups).toHaveLength(3));
    await settle();
    expect(popups).toHaveLength(3);
    expect(data(popups[2]).runtimePage?.record['systemId']).toBe('11111111-1111-4111-8111-111111111111');
    expect(requests).toContain('/unitsOfMeasure/11111111-1111-4111-8111-111111111111');
    fixture.debugElement.queryAll(By.directive(DocumentWindow))[2].componentInstance.closed.emit();
    await settle();
    expect(popups).toHaveLength(2);
    fixture.debugElement.queryAll(By.directive(DocumentWindow))[1].componentInstance.closed.emit();
    await settle();
    expect(popups).toHaveLength(1);
    expect(page(0)).toBe(parent);
    expect(parent.inlineDocumentWindowConfig).toBe(parentState);
    expect(parentState.headerData!['description']).toBe('Retained local parent state');
    expect(write).not.toHaveBeenCalled();
  });

  it('retains saved lookup captions when an empty-row dropdown opens and keeps filler defaults invisible', async () => {
    expect(await modal.open({ pageId: 'item-units-of-measure', context: { headerData: { ...item } } })).toBe(true);
    await settle();
    const runtime = page(0);
    const grid = fixture.debugElement.query(By.directive(DocumentLines)).componentInstance as DocumentLines;
    const rows = runtime.inlineDocumentWindowConfig!.lineRows!;
    const column = runtime.inlineDocumentWindowConfig!.lineColumns!.find(c => c.id === 'unitOfMeasureId')!;
    const quantity = runtime.inlineDocumentWindowConfig!.lineColumns!.find(c => c.id === 'qtyPerUnitOfMeasure')!;
    expect(grid.lookupDisplay(column, rows[0])).toBe('PCS — Piece');
    expect(grid.getCellValue(rows[0], quantity)).toBe('1');
    expect(rows[1]['qtyPerUnitOfMeasure']).toBe('1');
    expect(grid.getCellValue(rows[1], quantity)).toBe('');
    grid.activateRow(1);
    runtime.handleInlineAction({ actionKey: 'line:dropdown-opened', payload: { row: rows[1], column, rowIndex: 1 } });
    await settle();
    expect(grid.lookupDisplay(column, rows[0])).toBe('PCS — Piece');
    expect(grid.getCellValue(rows[1], quantity)).toBe('');
    expect(write).not.toHaveBeenCalled();
    fixture.debugElement.query(By.directive(DocumentWindow)).componentInstance.closed.emit();
    await settle();
    expect(write).not.toHaveBeenCalled();
    expect(await modal.open({ pageId: 'item-units-of-measure', context: { headerData: { ...item } } })).toBe(true);
    await settle();
    const reopened = fixture.debugElement.query(By.directive(DocumentLines)).componentInstance as DocumentLines;
    expect(reopened.lookupDisplay(column, reopened.rows[0])).toBe('PCS — Piece');
    expect(write).not.toHaveBeenCalled();
  });
  it('saves an edited conversion through its parent-scoped API without updating the Item', async () => {
    write.mockImplementation((...args: unknown[]) =>
      of({ data: { ...uomRow, ...(args[1] as object), systemRowVersion: 2 } }),
    );
    expect(
      await modal.open({ pageId: 'item-units-of-measure', context: { headerData: { ...item } } }),
    ).toBe(true);
    await settle();
    const runtime = page(0);
    const row = runtime.inlineDocumentWindowConfig!.lineRows![0];
    const column = runtime.inlineDocumentWindowConfig!.lineColumns!.find(
      (column) => column.id === 'qtyPerUnitOfMeasure',
    )!;
    row['qtyPerUnitOfMeasure'] = '2';
    runtime.handleInlineAction({ actionKey: 'line:changed', payload: { row, column, value: '2' } });
    await vi.waitFor(() => expect(write).toHaveBeenCalledTimes(1));
    expect(write.mock.calls[0][0]).toBe('/items/item-1/unitsOfMeasure/conversion-1');
    expect(write.mock.calls[0][1]).toEqual({ qtyPerUnitOfMeasure: '2' });
    expect(write.mock.calls[0][2]).toBe('"1"');
    await settle();
    expect(runtime.hasPendingWrites).toBe(false);
  });
  it('fails closed without a saved parent and keeps the current popup untouched', async () => {
    expect(
      await modal.open({
        pageId: 'item-units-of-measure',
        target: 'entry',
        context: { headerData: {} },
      }),
    ).toBe(false);
    expect(modal.getLastOpenFailureReason()).toBe('parent-context-missing');
    expect(popups).toHaveLength(0);
    expect(requests).toEqual([]);
    expect(
      await modal.open({
        pageId: 'units-of-measure',
        target: 'entry',
        context: { recordMappingComplete: false },
      }),
    ).toBe(false);
    expect(modal.getLastOpenFailureReason()).toBe('related-record-missing');
  });

  it('enforces the related resource read scope independently of the parent', async () => {
    const session = TestBed.inject(SessionService);
    session.SuperAdmin = false;
    session.Permissions = [{ pageId: 'items', canRead: true }] as typeof session.Permissions;
    expect(
      await modal.open({ pageId: 'item-units-of-measure', context: { headerData: { ...item } } }),
    ).toBe(false);
    expect(requests).toEqual([]);
    session.Permissions = [
      { pageId: 'items-lines', canRead: true, canUpdate: false, canCreate: false },
    ] as typeof session.Permissions;
    expect(
      await modal.open({ pageId: 'item-units-of-measure', context: { headerData: { ...item } } }),
    ).toBe(true);
    await settle();
    expect(
      page(0).inlineDocumentWindowConfig?.lineColumns?.every((column) => column.readonly),
    ).toBe(true);
    expect(write).not.toHaveBeenCalled();
  });
});
