import { AsyncPipe } from '@angular/common';
import { Component, EventEmitter, Output, inject } from '@angular/core';
import { ConfirmationDialog } from '../../../shared/ui/confirmation-dialog/confirmation-dialog';
import { ConfirmationDialogConfig } from '../../models/confirmation-dialog-config.model';
import { EntryCommandButtonConfig, DocumentWindowConfig } from '../../models/document-window-config.model';
import { ListPageConfig } from '../../models/page-config.model';
import { PopupConfig } from '../../models/popup-config.model';
import { NestedPopupBehavior, RunModalHostData, PopupLayoutMode } from '../../models/run-modal-host-data.model';
import { DocumentWindowActionEvent, DocumentWindow } from '../../document/document-window/document-window';
import { ConfirmationService } from '../../../shared/ui/confirmation.service';
import { RunModalStackService } from '../run-modal-stack.service';
import { RunModalService } from '../run-modal.service';
import { ListPage } from '../../pages/list-page/list-page';

@Component({
  selector: 'app-run-modal-host',
  standalone: true,
  imports: [AsyncPipe, DocumentWindow, ConfirmationDialog, ListPage],
  templateUrl: './run-modal-host.html',
  styleUrl: './run-modal-host.scss'
})
export class RunModalHost {
  private readonly confirmation = inject(ConfirmationService);
  private readonly popupStack = inject(RunModalStackService);
  private readonly runModal = inject(RunModalService);
  private readonly maximizedListPopups = new Set<string>();

  @Output() action = new EventEmitter<{ popupId: string; actionKey: string; payload?: unknown }>();
  @Output() closed = new EventEmitter<{ popupId: string; entryDialogConfig?: DocumentWindowConfig }>();

  readonly popupStack$ = this.popupStack.stack$;

  getRenderablePopups(popups: PopupConfig[]): PopupConfig[] {
    return popups.filter((popup) => popup.mode !== 'drawer');
  }

  close(id?: string): void {
    this.popupStack.close(id);
  }

  getEntryDialogConfig(popup: PopupConfig): DocumentWindowConfig | undefined {
    return this.getPopupData(popup).entryDialogConfig;
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

  getNestedEntryDialogConfig(popup: PopupConfig, action: string): DocumentWindowConfig | undefined {
    return this.getPopupData(popup).nestedEntryDialogConfigs?.[action];
  }

  getNestedPopupBehavior(popup: PopupConfig, action: string): NestedPopupBehavior | undefined {
    return this.getPopupData(popup).nestedPopupBehaviors?.[action];
  }

  isDocumentPopup(popup: PopupConfig): boolean {
    return !!this.getEntryDialogConfig(popup) && (popup.mode === 'page' || popup.size === 'full');
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

    this.closed.emit({
      popupId: popup.id,
      entryDialogConfig: this.getEntryDialogConfig(popup)
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

  onEntryDialogAction(popup: PopupConfig, event: DocumentWindowActionEvent): void {
    const actionKey = event.actionKey;

    if (!actionKey.startsWith('popup:')) {
      if (this.tryRunModalAction(popup, event)) {
        return;
      }

      if (this.runModal.handlePopupAction(popup.id, this.getEntryDialogConfig(popup) ?? {}, {
        actionKey,
        payload: event.payload
      })) {
        return;
      }

      this.action.emit({ popupId: popup.id, actionKey, payload: event.payload });
      return;
    }

    const action = actionKey.slice('popup:'.length);
    const entryDialogConfig = this.getEntryDialogConfig(popup);
    if (!entryDialogConfig) {
      return;
    }

    const nextLevel = this.resolveStackLevel(entryDialogConfig.title ?? popup.title ?? '') + 1;
    const layeredTitle = this.buildLayeredTitle(entryDialogConfig.title ?? popup.title ?? '', nextLevel);

    const actionLayout: PopupLayoutMode =
      action === 'header-only' || action === 'line-only' ? action : 'header-line';
    const sourceConfig =
      this.getNestedEntryDialogConfig(popup, action) ??
      (action === 'clone' || action === 'header-only' || action === 'line-only' ? entryDialogConfig : undefined);

    if (!sourceConfig) {
      return;
    }

    const nestedBehavior = this.getNestedPopupBehavior(popup, action);
    const nextEntryConfig = this.buildLayoutConfig(
      sourceConfig,
      layeredTitle,
      nestedBehavior?.layout ?? actionLayout
    );

    this.popupStack.open({
      id: `entry-stack-${Date.now()}-${nextLevel}`,
      title: layeredTitle,
      mode: nestedBehavior?.mode ?? popup.mode ?? 'page',
      size: nestedBehavior?.size ?? popup.size ?? 'full',
      allowNested: nestedBehavior?.allowNested ?? true,
      closeOnBackdrop: nestedBehavior?.closeOnBackdrop ?? popup.closeOnBackdrop,
      data: {
        ...this.getPopupData(popup),
        entryDialogConfig: nextEntryConfig
      }
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

    const entryDialogConfig = this.getEntryDialogConfig(popup);
    const payloadRecord = this.isRecord(event.payload) ? event.payload : undefined;
    const context: Record<string, unknown> = {
      headerData: entryDialogConfig?.headerData ?? {},
      lineRows: entryDialogConfig?.lineRows ?? [],
      payload: payloadRecord ?? {}
    };

    const activeLine = this.resolveRunModalActiveLine(entryDialogConfig, payloadRecord);
    if (activeLine) {
      context['activeLine'] = activeLine;
    }

    const target = button?.runModalTarget ?? button?.runModalView;

    void this.openRunModalWithLoader({
      pageId,
      context,
      target,
      // A related list must stack above its calling document, preserving unsaved state.
      allowNested: true
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
    entryDialogConfig: DocumentWindowConfig | undefined,
    payload: Record<string, unknown> | undefined
  ): Record<string, unknown> | undefined {
    if (payload && this.isRecord(payload['activeRow'])) {
      return payload['activeRow'];
    }

    const lineRows = entryDialogConfig?.lineRows ?? [];
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

  private resolveCommandButton(popup: PopupConfig, actionKey: string): EntryCommandButtonConfig | undefined {
    const entryDialogConfig = this.getEntryDialogConfig(popup);
    const headerButton = entryDialogConfig?.headerToolbarButtons?.find((item) => item.actionKey === actionKey);
    if (headerButton) {
      return headerButton;
    }

    return entryDialogConfig?.lineToolbarButtons?.find((item) => item.actionKey === actionKey);
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
    layout: PopupLayoutMode
  ): DocumentWindowConfig {
    const next: DocumentWindowConfig = {
      ...source,
      title
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
