import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { By } from '@angular/platform-browser';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { providePlatformGovernance } from '../../core/providers/platform-governance.provider';
import { GlobalSearchPopupService } from '../../core/services/global-search-popup.service';
import { DocumentPageCommandRoutingResolverService } from '../pages/document-page-command-routing-resolver.service';
import { DATA_REST_SERVICE, DataRestService } from '../data/data-source.service';
import { DocumentWindow } from '../document/document-window/document-window';
import { RunModalHostData } from '../models/run-modal-host-data.model';
import { PopupConfig } from '../models/popup-config.model';
import { RunModalHost } from './run-modal-host/run-modal-host';
import { RunModalStackService } from './run-modal-stack.service';
import { RunModalService } from './run-modal.service';
import { RunModalBindingStateService } from './run-modal-binding-state.service';
import { RunModalLoadingService } from './run-modal-loading.service';
import { SessionService } from '../../core/services/session.service';
import { DocumentPage } from '../pages/document-page/document-page';
import { ConfirmationService } from '../../shared/ui/confirmation.service';
import { DrawerService } from '../../shared/ui/drawer.service';

describe('RunModal navigation', () => {
  let popups: PopupConfig[];
  let stack: RunModalStackService;
  let runModal: RunModalService;
  let requests: string[];
  let fixture: ComponentFixture<RunModalHost>;
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
    TestBed.inject(SessionService).SuperAdmin = true;
    runModal = TestBed.inject(RunModalService);
    fixture = TestBed.createComponent(RunModalHost);
    fixture.detectChanges();
    stack.stack$.subscribe(value => popups = value);
  });

  const data = (popup: PopupConfig) => popup.data as RunModalHostData;
  const configFor = (popup: PopupConfig) => {
    fixture.detectChanges();
    const index = popups.filter(item => data(item).runtimePage).indexOf(popup);
    return (fixture.debugElement.queryAll(By.directive(DocumentPage))[index].componentInstance as DocumentPage).inlineDocumentWindowConfig!;
  };
  const settle = async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
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
    fixture.detectChanges();
    fixture.componentInstance.toggleListPopupMaximize(parent);
    expect(await runModal.openEntryFromList(parent.id, rows[0])).toBe(true);
    await settle();
    const child = popups[1];
    expect(configFor(child).headerData!['number']).toBe('PO-1');
    expect(configFor(child).lineRows![0]['description']).toBe('Fixture line');
    expect(requests.some(endpoint => endpoint.startsWith('/purchaseOrderLines') && endpoint.includes('PO-1'))).toBe(true);
    fixture.componentInstance.closePopup(child);
    fixture.detectChanges();
    expect(popups).toEqual([parent]);
    expect(data(popups[0]).runModalList!.rows).toBe(rows);
    expect(fixture.componentInstance.isListPopupMaximized(parent)).toBe(true);
    expect(TestBed.inject(RunModalBindingStateService).bindings.has(child.id)).toBe(false);
    expect(data(parent).runModalList).toBeDefined();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('retains the mounted parent window, unsaved header/line edits and maximize state through three levels', async () => {
    expect(await runModal.open({ pageId: 'purchase-order', target: 'entry', context: { headerData: { ...header } }, popupId: 'parent' })).toBe(true);
    await settle();
    fixture.changeDetectorRef.markForCheck();
    fixture.detectChanges();
    const config = configFor(popups[0]);
    config.headerData!['vendorOrderNumber'] = 'UNSAVED';
    config.lineRows![0]['description'] = 'Unsaved line';
    fixture.changeDetectorRef.markForCheck();
    const parentWindow = fixture.debugElement.query(By.directive(DocumentWindow)).componentInstance as DocumentWindow;
    parentWindow.toggleEntrySize();
    for (const id of ['child', 'grandchild']) {
      expect(await runModal.open({ pageId: 'purchase-order', target: 'entry', context: { headerData: { ...header } }, popupId: id, allowNested: true })).toBe(true);
      await settle();
    }
    fixture.detectChanges();
    expect(fixture.debugElement.queryAll(By.directive(DocumentWindow))).toHaveLength(3);
    fixture.componentInstance.closePopup(popups[2]);
    fixture.componentInstance.closePopup(popups[1]);
    fixture.detectChanges();
    expect(popups.map(popup => popup.id)).toEqual(['parent']);
    expect(configFor(popups[0])).toBe(config);
    expect(config.headerData!['vendorOrderNumber']).toBe('UNSAVED');
    expect(config.lineRows![0]['description']).toBe('Unsaved line');
    expect(fixture.debugElement.query(By.directive(DocumentWindow)).componentInstance).toBe(parentWindow);
    expect(parentWindow.maximized).toBe(true);
  });

  it('keeps unsaved document and maximize state when a document command opens a related list', async () => {
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigate');
    expect(await runModal.open({ pageId: 'purchase-order', target: 'entry', context: { headerData: { ...header } }, popupId: 'parent' })).toBe(true);
    await settle();
    const parent = popups[0];
    const config = configFor(parent);
    config.headerData!['vendorOrderNumber'] = 'UNSAVED';
    config.lineRows![0]['description'] = 'Unsaved line';
    fixture.changeDetectorRef.markForCheck();
    config.headerToolbarButtons = [
      ...(config.headerToolbarButtons ?? []),
      { label: 'Related purchase orders', actionKey: 'cmd:related-list',
        runModalPageId: 'purchase-order', runModalTarget: 'list' },
    ];

    fixture.changeDetectorRef.markForCheck();
    fixture.detectChanges();
    const host = fixture.componentInstance;
    const parentWindow = fixture.debugElement.query(By.directive(DocumentWindow)).componentInstance as DocumentWindow;
    parentWindow.toggleEntrySize();

    const page = fixture.debugElement.query(By.directive(DocumentPage)).componentInstance as DocumentPage;
    (page as any).handleEntryCommand('cmd:related-list', {});
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
    expect(configFor(parent)).toBe(config);
    expect(config.headerData!['vendorOrderNumber']).toBe('UNSAVED');
    expect(config.lineRows![0]['description']).toBe('Unsaved line');
    expect(fixture.debugElement.query(By.directive(DocumentWindow)).componentInstance).toBe(parentWindow);
    expect(parentWindow.maximized).toBe(true);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('preserves the edited parent when DocumentPage commands open a related list', async () => {
    expect(await runModal.open({ pageId: 'purchase-order', target: 'entry', context: { headerData: { ...header } }, popupId: 'parent' })).toBe(true);
    await settle();
    const parent = popups[0];
    const config = configFor(parent);
    config.headerData!['vendorOrderNumber'] = 'UNSAVED';
    config.lineRows![0]['description'] = 'Edited line';
    fixture.changeDetectorRef.markForCheck();
    fixture.changeDetectorRef.markForCheck();
    fixture.detectChanges();
    const parentWindow = fixture.debugElement.query(By.directive(DocumentWindow)).componentInstance as DocumentWindow;
    parentWindow.toggleEntrySize();

    const request = TestBed.inject(DocumentPageCommandRoutingResolverService).buildEntryRunModalRequest({
      pageId: 'purchase-order',
      target: 'list',
      headerData: config.headerData!,
      lineRows: config.lineRows!,
      payload: { origin: 'header' },
      activeLine: config.lineRows![0],
    });
    expect(request).toMatchObject({ target: 'list', mode: 'modal', size: 'xl', allowNested: true });
    expect(await runModal.open(request)).toBe(true);
    await settle();
    fixture.detectChanges();
    expect(popups).toHaveLength(2);
    expect(data(popups[1]).runModalList).toBeDefined();
    expect(popups[0]).toBe(parent);

    fixture.componentInstance.closePopup(popups[1]);
    fixture.detectChanges();
    expect(popups).toEqual([parent]);
    expect(configFor(parent)).toBe(config);
    expect(config.headerData!['vendorOrderNumber']).toBe('UNSAVED');
    expect(config.lineRows![0]['description']).toBe('Edited line');
    expect(fixture.debugElement.query(By.directive(DocumentWindow)).componentInstance).toBe(parentWindow);
    expect(parentWindow.maximized).toBe(true);
  });

  it('opens global search over an existing document without replacing its parent', async () => {
    expect(await runModal.open({ pageId: 'purchase-order', target: 'entry', context: { headerData: { ...header } }, popupId: 'parent' })).toBe(true);
    await settle();
    const config = configFor(popups[0]);
    config.headerData!['vendorOrderNumber'] = 'UNSAVED';
    expect(await TestBed.inject(GlobalSearchPopupService).openByPageId('purchase-order')).toBe(true);
    await settle();
    expect(popups).toHaveLength(2);
    expect(data(popups[1]).runModalList).toBeDefined();
    const host = fixture.componentInstance;
    host.closePopup(popups[1]);
    expect(configFor(popups[0])).toBe(config);
    expect(config.headerData!['vendorOrderNumber']).toBe('UNSAVED');
  });

  it('keeps document, drawer and confirmation layers independent when closing back to the document', async () => {
    await runModal.open({ pageId: 'purchase-order', target: 'entry', context: { headerData: { ...header } }, popupId: 'parent' });
    await settle();
    const parent = popups[0];
    const host = TestBed.createComponent(RunModalHost).componentInstance;
    TestBed.inject(DrawerService).open({ id: 'drawer', viewId: 'profile', allowNested: true });
    const decision = TestBed.inject(ConfirmationService).confirm({ message: 'Continue?' });
    expect(host.getRenderablePopups(popups).map(popup => popup.id)).toEqual(['parent', popups[2].id]);
    host.closePopup(popups[2]);
    expect(await decision).toBe(false);
    expect(popups.map(popup => popup.id)).toEqual(['parent', 'drawer']);
    TestBed.inject(DrawerService).close('drawer');
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
