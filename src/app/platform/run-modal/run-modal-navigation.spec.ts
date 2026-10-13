import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { By } from '@angular/platform-browser';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { providePlatformGovernance } from '../../core/providers/platform-governance.provider';
import { GlobalSearchPopupService } from '../../core/services/global-search-popup.service';
import { DATA_REST_SERVICE, DataRestService } from '../data/data-source.service';
import { DocumentWindow } from '../document/document-window/document-window';
import { RunModalHostData } from '../models/run-modal-host-data.model';
import { PopupConfig } from '../models/popup-config.model';
import { RunModalHost } from './run-modal-host/run-modal-host';
import { RunModalStackService } from './run-modal-stack.service';
import { RunModalService } from './run-modal.service';
import { RunModalBindingStateService } from './run-modal-binding-state.service';
import { RunModalLoadingService } from './run-modal-loading.service';
import { ConfirmationService } from '../../shared/ui/confirmation.service';
import { CoreDrawerService } from '../../shared/ui/core-drawer.service';

describe('RunModal navigation', () => {
  let popups: PopupConfig[];
  let stack: RunModalStackService;
  let runModal: RunModalService;
  let requests: string[];
  const header = { systemId: 'PO-1', number: 'PO-1', buyFromVendorName: 'Fixture Vendor', status: 'Open' };
  const line = { systemId: 'LINE-1', documentNo: 'PO-1', lineNo: 10000, description: 'Fixture line', quantity: 2, directUnitCost: 10 };

  beforeEach(() => {
    requests = [];
    const rest: DataRestService = {
      get: endpoint => {
        requests.push(endpoint);
        return of({ value: endpoint.startsWith('/purchaseOrderHeaders') ? [{ ...header }]
          : endpoint.startsWith('/purchaseOrderLines') ? [{ ...line }] : [] });
      },
      post: () => of({}), patch: () => of({}), delete: () => of({}),
    };
    TestBed.configureTestingModule({
      imports: [RunModalHost],
      providers: [provideRouter([]), ...providePlatformGovernance(),
        { provide: DATA_REST_SERVICE, useValue: rest }],
    });
    stack = TestBed.inject(RunModalStackService);
    runModal = TestBed.inject(RunModalService);
    stack.stack$.subscribe(value => popups = value);
  });

  const data = (popup: PopupConfig) => popup.data as RunModalHostData;
  const settle = async () => {
    await vi.waitFor(() => expect(TestBed.inject(RunModalLoadingService).isAnyLoading()).toBe(false));
    // Option hydration runs after the header/line loader completes.
    await Promise.resolve();
  };

  it('opens a global-search list, hydrates its child header/lines and closes back to the same list', async () => {
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigate');
    expect(await TestBed.inject(GlobalSearchPopupService).openByPageId('purchase-order')).toBe(true);
    await settle();
    const parent = popups[0];
    const rows = data(parent).runModalList!.rows;
    expect(rows).toEqual([header]);
    const fixture = TestBed.createComponent(RunModalHost);
    fixture.detectChanges();
    fixture.componentInstance.toggleListPopupMaximize(parent);
    expect(await runModal.openEntryFromList(parent.id, rows[0])).toBe(true);
    await settle();
    const child = popups[1];
    expect(data(child).entryDialogConfig!.headerData!['number']).toBe('PO-1');
    expect(data(child).entryDialogConfig!.lineRows![0]['description']).toBe('Fixture line');
    expect(requests.some(endpoint => endpoint.startsWith('/purchaseOrderLines') && endpoint.includes('PO-1'))).toBe(true);
    fixture.componentInstance.closePopup(child);
    fixture.detectChanges();
    expect(popups).toEqual([parent]);
    expect(data(popups[0]).runModalList!.rows).toBe(rows);
    expect(fixture.componentInstance.isListPopupMaximized(parent)).toBe(true);
    expect(TestBed.inject(RunModalBindingStateService).bindings.has(child.id)).toBe(false);
    expect(TestBed.inject(RunModalBindingStateService).bindings.has(parent.id)).toBe(true);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('retains the mounted parent window, unsaved header/line edits and maximize state through three levels', async () => {
    expect(await runModal.open({ pageId: 'purchase-order', target: 'entry', popupId: 'parent' })).toBe(true);
    await settle();
    const fixture = TestBed.createComponent(RunModalHost);
    fixture.detectChanges();
    const config = data(popups[0]).entryDialogConfig!;
    config.headerData!['vendorOrderNumber'] = 'UNSAVED';
    config.lineRows![0]['description'] = 'Unsaved line';
    const parentWindow = fixture.debugElement.query(By.directive(DocumentWindow)).componentInstance as DocumentWindow;
    parentWindow.toggleEntrySize();
    for (const id of ['child', 'grandchild']) {
      expect(await runModal.open({ pageId: 'purchase-order', target: 'entry', popupId: id, allowNested: true })).toBe(true);
      await settle();
    }
    fixture.detectChanges();
    expect(fixture.debugElement.queryAll(By.directive(DocumentWindow))).toHaveLength(3);
    fixture.componentInstance.closePopup(popups[2]);
    fixture.componentInstance.closePopup(popups[1]);
    fixture.detectChanges();
    expect(popups.map(popup => popup.id)).toEqual(['parent']);
    expect(data(popups[0]).entryDialogConfig).toBe(config);
    expect(config.headerData!['vendorOrderNumber']).toBe('UNSAVED');
    expect(config.lineRows![0]['description']).toBe('Unsaved line');
    expect(fixture.debugElement.query(By.directive(DocumentWindow)).componentInstance).toBe(parentWindow);
    expect(parentWindow.entryMaximized).toBe(true);
  });

  it('keeps unsaved document and maximize state when a document command opens a related list', async () => {
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigate');
    expect(await runModal.open({ pageId: 'purchase-order', target: 'entry', popupId: 'parent' })).toBe(true);
    await settle();
    const parent = popups[0];
    const config = data(parent).entryDialogConfig!;
    config.headerData!['vendorOrderNumber'] = 'UNSAVED';
    config.lineRows![0]['description'] = 'Unsaved line';
    config.headerToolbarButtons = [
      ...(config.headerToolbarButtons ?? []),
      { label: 'Related purchase orders', actionKey: 'cmd:related-list',
        runModalPageId: 'purchase-order', runModalTarget: 'list' },
    ];

    const fixture = TestBed.createComponent(RunModalHost);
    fixture.detectChanges();
    const host = fixture.componentInstance;
    const parentWindow = fixture.debugElement.query(By.directive(DocumentWindow)).componentInstance as DocumentWindow;
    parentWindow.toggleEntrySize();

    host.onEntryDialogAction(parent, { actionKey: 'cmd:related-list' });
    await vi.waitFor(() => expect(popups).toHaveLength(2));
    await settle();
    fixture.detectChanges();
    const relatedList = popups[1];
    expect(data(relatedList).runModalList).toBeDefined();
    expect(popups[0]).toBe(parent);
    expect(fixture.debugElement.queryAll(By.directive(DocumentWindow))).toHaveLength(1);

    host.closePopup(relatedList);
    fixture.detectChanges();
    expect(popups).toEqual([parent]);
    expect(data(parent).entryDialogConfig).toBe(config);
    expect(config.headerData!['vendorOrderNumber']).toBe('UNSAVED');
    expect(config.lineRows![0]['description']).toBe('Unsaved line');
    expect(fixture.debugElement.query(By.directive(DocumentWindow)).componentInstance).toBe(parentWindow);
    expect(parentWindow.entryMaximized).toBe(true);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('opens global search over an existing document without replacing its parent', async () => {
    expect(await runModal.open({ pageId: 'purchase-order', target: 'entry', popupId: 'parent' })).toBe(true);
    await settle();
    const config = data(popups[0]).entryDialogConfig!;
    config.headerData!['vendorOrderNumber'] = 'UNSAVED';
    expect(await TestBed.inject(GlobalSearchPopupService).openByPageId('purchase-order')).toBe(true);
    await settle();
    expect(popups).toHaveLength(2);
    expect(data(popups[1]).runModalList).toBeDefined();
    const host = TestBed.createComponent(RunModalHost).componentInstance;
    host.closePopup(popups[1]);
    expect(data(popups[0]).entryDialogConfig).toBe(config);
    expect(config.headerData!['vendorOrderNumber']).toBe('UNSAVED');
  });

  it('keeps document, drawer and confirmation layers independent when closing back to the document', async () => {
    await runModal.open({ pageId: 'purchase-order', target: 'entry', popupId: 'parent' });
    await settle();
    const parent = popups[0];
    const host = TestBed.createComponent(RunModalHost).componentInstance;
    TestBed.inject(CoreDrawerService).open({ id: 'drawer', viewId: 'profile', allowNested: true });
    const decision = TestBed.inject(ConfirmationService).confirm({ message: 'Continue?' });
    expect(host.getRenderablePopups(popups).map(popup => popup.id)).toEqual(['parent', popups[2].id]);
    host.closePopup(popups[2]);
    expect(await decision).toBe(false);
    expect(popups.map(popup => popup.id)).toEqual(['parent', 'drawer']);
    TestBed.inject(CoreDrawerService).close('drawer');
    expect(popups).toEqual([parent]);
  });

  it('rejects an unregistered legacy page without mutating the stack', async () => {
    stack.open({ id: 'parent', allowNested: true });
    expect(await runModal.open({ pageId: 'role-setup' })).toBe(false);
    expect(runModal.getLastOpenFailureReason()).toBe('config-not-found:role-setup');
    expect(popups.map(popup => popup.id)).toEqual(['parent']);
  });

  it('keeps the approved 50-level stack policy and permits an explicit unlimited policy', () => {
    for (let index = 0; index < 50; index++) expect(stack.open({ id: `level-${index}`, allowNested: true })).toBe(true);
    expect(popups).toHaveLength(50);
    const root = popups[0];
    stack.open({ id: 'overflow', allowNested: true });
    expect(popups[0]).toBe(root);
    expect(popups.at(-1)!.id).toBe('overflow');
    const unlimited = new RunModalStackService({ maxDepth: 0, onOverflow: 'block' });
    let count = 0;
    unlimited.stack$.subscribe(value => count = value.length);
    for (let index = 0; index < 100; index++) expect(unlimited.open({ id: `${index}`, allowNested: true })).toBe(true);
    expect(count).toBe(100);
  });
});
