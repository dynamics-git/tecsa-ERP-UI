import { DocumentPageCommandRoutingResolverService } from '../../pages/document-page-command-routing-resolver.service';
import type { CommandConfig } from '../../models/command-config.model';
import { AsyncPipe, NgComponentOutlet } from '@angular/common';
import { Component, EventEmitter, Output, inject, Type } from '@angular/core';
import { ConfirmationDialog } from '../../../shared/ui/confirmation-dialog/confirmation-dialog';
import { ConfirmationDialogConfig } from '../../models/confirmation-dialog-config.model';
import { DocumentWindowConfig } from '../../models/document-window-config.model';
import { ListPageConfig } from '../../models/page-config.model';
import { PopupConfig } from '../../models/popup-config.model';
import { NestedPopupConfig, RunModalHostData, DocumentLayoutMode } from '../../models/run-modal-host-data.model';
import { DocumentWindowActionEvent, DocumentWindow } from '../../document/document-window/document-window';
import { ConfirmationService } from '../../../shared/ui/confirmation.service';
import { RunModalStackService } from '../run-modal-stack.service';
import { RunModalService } from '../run-modal.service';
import { ListGrid } from '../../pages/list-grid/list-grid';
import { RunModalPageWindow } from '../../models/run-modal-host-data.model';

@Component({
  selector: 'app-run-modal-host',
  standalone: true,
  imports: [AsyncPipe, DocumentWindow, ConfirmationDialog, ListGrid, NgComponentOutlet],
  templateUrl: './run-modal-host.html',
  styleUrl: './run-modal-host.scss',
})
export class RunModalHost {
  private readonly confirmation = inject(ConfirmationService);
  private readonly popupStack = inject(RunModalStackService);
  private readonly runModal = inject(RunModalService);
  private readonly commandRouting = inject(DocumentPageCommandRoutingResolverService);

  getRuntimePage(popup: PopupConfig) {
    return this.getPopupData(popup).runtimePage;
  }
  private readonly runtimeInputs = new Map<string, { runModal: RunModalPageWindow }>();

  getRuntimeComponent(popup: PopupConfig): Type<unknown> {
    const module = this.getRuntimePage(popup)!.module;
    const components = Object.entries(module).filter(
      ([name, value]) => name.endsWith('Page') && typeof value === 'function',
    );
    if (components.length !== 1) throw new Error('A registered page must export exactly one feature component.');
    return components[0][1] as Type<unknown>;
  }

  getRuntimeInputs(popup: PopupConfig): { runModal: RunModalPageWindow } {
    let inputs = this.runtimeInputs.get(popup.id);
    if (!inputs) {
      inputs = { runModal: { record: this.getRuntimePage(popup)!.record, close: () => this.closePopup(popup) } };
      this.runtimeInputs.set(popup.id, inputs);
    }
    return inputs;
  }
  private readonly maximizedListPopups = new Set<string>();

  @Output() action = new EventEmitter<{ popupId: string; actionKey: string; payload?: unknown }>();
  @Output() closed = new EventEmitter<{ popupId: string; documentWindowConfig?: DocumentWindowConfig }>();

  readonly popupStack$ = this.popupStack.stack$;

  getRenderablePopups(popups: PopupConfig[]): PopupConfig[] {
    const active = new Set(popups.map((popup) => popup.id));
    for (const id of this.runtimeInputs.keys()) if (!active.has(id)) this.runtimeInputs.delete(id);
    return popups.filter((popup) => popup.mode !== 'drawer');
  }

  close(id?: string): void {
    this.popupStack.close(id);
  }

  getDocumentWindowConfig(popup: PopupConfig): DocumentWindowConfig | undefined {
    return this.getPopupData(popup).documentWindowConfig;
  }

  getConfirmationDialogConfig(popup: PopupConfig): ConfirmationDialogConfig | undefined {
    return this.getPopupData(popup).confirmationDialogConfig;
  }

  getListPageConfig(popup: PopupConfig): ListPageConfig | undefined {
    return this.getPopupData(popup).runModalList?.config;
  }

  getListRows(popup: PopupConfig): unknown[] {
    return this.getPopupData(popup).runModalList?.rows ?? [];
  }

  isListLoading(popup: PopupConfig): boolean {
    return this.getPopupData(popup).runModalList?.loading === true;
  }

  getListErrorMessage(popup: PopupConfig): string | undefined {
    return this.getPopupData(popup).runModalList?.errorMessage;
  }

  getNestedDocumentWindowConfig(popup: PopupConfig, action: string): DocumentWindowConfig | undefined {
    return this.getPopupData(popup).nestedDocumentWindowConfigs?.[action];
  }

  getNestedPopupConfig(popup: PopupConfig, action: string): NestedPopupConfig | undefined {
    return this.getPopupData(popup).nestedPopupConfigs?.[action];
  }

  isDocumentPopup(popup: PopupConfig): boolean {
    return (
      !this.getRuntimePage(popup) &&
      !!this.getDocumentWindowConfig(popup) &&
      (popup.mode === 'page' || popup.size === 'full')
    );
  }

  isListPopup(popup: PopupConfig): boolean {
    return !!this.getListPageConfig(popup);
  }

  isConfirmationPopup(popup: PopupConfig): boolean {
    return !!this.getConfirmationDialogConfig(popup);
  }

  isFullPagePopup(popup: PopupConfig): boolean {
    return popup.size === 'full' || popup.mode === 'page';
  }

  canCloseOnBackdrop(popup: PopupConfig): boolean {
    return popup.closeOnBackdrop !== false;
  }

  onBackdropClick(popup: PopupConfig): void {
    if (this.canCloseOnBackdrop(popup)) {
      this.closePopup(popup);
    }
  }

  closePopup(popup: PopupConfig): void {
    if (this.isConfirmationPopup(popup)) {
      this.confirmation.dismissDialog(popup.id);
      return;
    }

    this.maximizedListPopups.delete(popup.id);
    this.runtimeInputs.delete(popup.id);

    this.closed.emit({
      popupId: popup.id,
      documentWindowConfig: this.getDocumentWindowConfig(popup),
    });
    this.runModal.releasePopup(popup.id);
    this.popupStack.close(popup.id);
  }

  isListPopupMaximized(popup: PopupConfig): boolean {
    return this.maximizedListPopups.has(popup.id);
  }

  toggleListPopupMaximize(popup: PopupConfig): void {
    if (this.maximizedListPopups.has(popup.id)) {
      this.maximizedListPopups.delete(popup.id);
      return;
    }

    this.maximizedListPopups.add(popup.id);
  }

  onConfirmationDecision(popup: PopupConfig, value: boolean): void {
    this.confirmation.resolveDialog(popup.id, value);
  }

  onListRowOpen(popup: PopupConfig, row: unknown): void {
    void this.openEntryFromListWithLoader(popup.id, row);
  }

  onListCommand(popup: PopupConfig, event: { actionKey: string; payload?: unknown }): void {
    void this.runModal.handleListCommand(popup.id, event);
  }

  onListLoadMore(popup: PopupConfig): void {
    void this.runModal.loadNextListPage(popup.id);
  }
  listHasMore(popup: PopupConfig): boolean {
    return this.getPopupData(popup).runModalList?.hasMore === true;
  }

  onDocumentWindowAction(popup: PopupConfig, event: DocumentWindowActionEvent): void {
    const actionKey = event.actionKey;

    if (!actionKey.startsWith('popup:')) {
      if (this.tryRunModalAction(popup, event)) {
        return;
      }

      if (
        this.runModal.handlePopupAction(popup.id, this.getDocumentWindowConfig(popup) ?? {}, {
          actionKey,
          payload: event.payload,
        })
      ) {
        return;
      }

      this.action.emit({ popupId: popup.id, actionKey, payload: event.payload });
      return;
    }

    const action = actionKey.slice('popup:'.length);
    const documentWindowConfig = this.getDocumentWindowConfig(popup);
    if (!documentWindowConfig) {
      return;
    }

    const nextLevel = this.resolveStackLevel(documentWindowConfig.title ?? popup.title ?? '') + 1;
    const layeredTitle = this.buildLayeredTitle(documentWindowConfig.title ?? popup.title ?? '', nextLevel);

    const actionLayout: DocumentLayoutMode =
      action === 'header-only' || action === 'line-only' ? action : 'header-line';
    const sourceConfig =
      this.getNestedDocumentWindowConfig(popup, action) ??
      (action === 'clone' || action === 'header-only' || action === 'line-only' ? documentWindowConfig : undefined);

    if (!sourceConfig) {
      return;
    }

    const nestedBehavior = this.getNestedPopupConfig(popup, action);
    const nextEntryConfig = this.buildLayoutConfig(sourceConfig, layeredTitle, nestedBehavior?.layout ?? actionLayout);

    this.popupStack.open({
      id: `entry-stack-${Date.now()}-${nextLevel}`,
      title: layeredTitle,
      mode: nestedBehavior?.mode ?? popup.mode ?? 'page',
      size: nestedBehavior?.size ?? popup.size ?? 'full',
      allowNested: nestedBehavior?.allowNested ?? true,
      closeOnBackdrop: nestedBehavior?.closeOnBackdrop ?? popup.closeOnBackdrop,
      data: {
        ...this.getPopupData(popup),
        documentWindowConfig: nextEntryConfig,
      },
    });
  }

  private tryRunModalAction(popup: PopupConfig, event: DocumentWindowActionEvent): boolean {
    if (!event.actionKey.startsWith('cmd:')) {
      return false;
    }

    const button = this.resolveCommandButton(popup, event.actionKey);
    const pageId = button?.runModalPageId?.trim();
    if (!pageId) {
      return false;
    }

    const documentWindowConfig = this.getDocumentWindowConfig(popup);
    const payloadRecord = this.isRecord(event.payload) ? event.payload : undefined;
    let context: Record<string, unknown> = {
      headerData: documentWindowConfig?.headerData ?? {},
      lineRows: documentWindowConfig?.lineRows ?? [],
      payload: payloadRecord ?? {},
    };

    const activeLine = this.resolveRunModalActiveLine(documentWindowConfig, payloadRecord);
    if (activeLine) {
      context['activeLine'] = activeLine;
    }

    if (button?.runModalRecord) {
      context =
        this.commandRouting.buildEntryRunModalRequest({
          pageId,
          headerData: documentWindowConfig?.headerData ?? {},
          lineRows: documentWindowConfig?.lineRows ?? [],
          payload: payloadRecord ?? {},
          activeLine,
          recordMapping: button.runModalRecord,
        }).context ?? {};
    }
    const target = button?.runModalTarget ?? button?.runModalView;

    void this.openRunModalWithLoader({
      pageId,
      context,
      target,
      // A related list must stack above its calling document, preserving unsaved state.
      allowNested: true,
    });

    return true;
  }

  private async openRunModalWithLoader(request: {
    pageId: string;
    context: Record<string, unknown>;
    target?: 'entry' | 'list';
    allowNested: boolean;
  }): Promise<void> {
    let opened = false;
    opened = await this.runModal.open(request);

    if (!opened) {
      const reason = this.runModal.getLastOpenFailureReason();
      const detail = reason ? ` (${reason})` : '';
      await this.confirmation.message(`Unable to open run modal page${detail}.`);
    }
  }

  private async openEntryFromListWithLoader(popupId: string, row: unknown): Promise<void> {
    const opened = await this.runModal.openEntryFromList(popupId, row);

    if (!opened) {
      const reason = this.runModal.getLastOpenFailureReason();
      const detail = reason ? ` (${reason})` : '';
      await this.confirmation.message(`Unable to open run modal page${detail}.`);
    }
  }

  private resolveRunModalActiveLine(
    documentWindowConfig: DocumentWindowConfig | undefined,
    payload: Record<string, unknown> | undefined,
  ): Record<string, unknown> | undefined {
    if (payload && this.isRecord(payload['activeRow'])) {
      return payload['activeRow'];
    }

    const lineRows = documentWindowConfig?.lineRows ?? [];
    if (payload && Array.isArray(payload['selectedIndexes']) && lineRows.length) {
      const firstIndex = payload['selectedIndexes']
        .map((value) => Number(value))
        .find((value) => Number.isInteger(value) && value >= 0 && value < lineRows.length);
      if (firstIndex !== undefined) {
        return lineRows[firstIndex];
      }
    }

    return lineRows.length ? lineRows[0] : undefined;
  }

  private resolveCommandButton(popup: PopupConfig, actionKey: string): CommandConfig | undefined {
    const documentWindowConfig = this.getDocumentWindowConfig(popup);
    const headerButton = documentWindowConfig?.headerToolbarButtons?.find((item) => item.actionKey === actionKey);
    if (headerButton) {
      return headerButton;
    }

    return documentWindowConfig?.lineToolbarButtons?.find((item) => item.actionKey === actionKey);
  }

  private getPopupData(popup: PopupConfig): RunModalHostData {
    if (!this.isRecord(popup.data)) {
      return {};
    }

    return popup.data as RunModalHostData;
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }

  private buildLayeredTitle(title: string, nextLevel: number): string {
    const baseTitle = title.replace(/\s*\[L\d+\]\s*$/, '').trim();
    if (!baseTitle) {
      return '';
    }

    return `${baseTitle} [L${nextLevel}]`;
  }

  private resolveStackLevel(title: string): number {
    const matched = title.match(/\[L(\d+)\]\s*$/);
    if (!matched) {
      return 1;
    }

    const parsed = Number(matched[1]);
    return Number.isFinite(parsed) ? parsed : 1;
  }

  private buildLayoutConfig(
    source: DocumentWindowConfig,
    title: string,
    layout: DocumentLayoutMode,
  ): DocumentWindowConfig {
    const next: DocumentWindowConfig = {
      ...source,
      title,
    };

    if (layout === 'header-only') {
      next.lineToolbarButtons = [];
      next.lineColumns = [];
      next.lineRows = [];
    }

    if (layout === 'line-only') {
      next.headerToolbarButtons = [];
      next.headerSections = [];
    }

    return next;
  }
}
