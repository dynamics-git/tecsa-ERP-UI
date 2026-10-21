import { Injectable } from '@angular/core';
import { DocumentWindowConfig } from '../models/document-window-config.model';
import { RunModalStackService } from './run-modal-stack.service';

@Injectable({
  providedIn: 'root',
})
export class RunModalBindingStateService {
  readonly bindings = new Map<string, unknown>();
  readonly autosaveTimers = new Map<string, ReturnType<typeof setTimeout> | number>();
  lastOpenFailureReason = '';

  constructor(private readonly popupStack: RunModalStackService) {
    // The stack can discard windows without passing through RunModalHost.closePopup
    // (closeAll, non-nested replacement and depth overflow). Release only the
    // discarded windows; keep mounted parent bindings and pending saves intact.
    this.popupStack.stack$.subscribe((stack) => {
      const activeIds = new Set(stack.map((popup) => popup.id));
      const trackedIds = new Set([...this.bindings.keys(), ...this.autosaveTimers.keys()]);
      for (const popupId of trackedIds) {
        if (!activeIds.has(popupId)) {
          this.releasePopup(popupId);
        }
      }
    });
  }

  releasePopup(popupId: string): void {
    this.clearAutosave(popupId);
    this.bindings.delete(popupId);
  }

  refreshPopup(popupId: string): void {
    this.popupStack.update(popupId, (popup) => ({ ...popup }));
  }

  clearAutosave(popupId: string): void {
    const timer = this.autosaveTimers.get(popupId);
    if (timer !== undefined) {
      clearTimeout(timer);
      this.autosaveTimers.delete(popupId);
    }
  }

  getLastOpenFailureReason(): string {
    return this.lastOpenFailureReason;
  }

  setInteractionLock(documentWindowConfig: DocumentWindowConfig, locked: boolean): void {
    documentWindowConfig.interactionLocked = locked;
  }
}
