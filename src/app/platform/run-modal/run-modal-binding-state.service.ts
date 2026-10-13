import { Injectable } from '@angular/core';
import { DocumentWindowConfig } from '../models/document-window-config.model';
import { RunModalStackService } from './run-modal-stack.service';

@Injectable({
  providedIn: 'root',
})
export class RunModalBindingStateService {
  readonly bindings = new Map<string, unknown>();
  readonly autosaveTimers = new Map<string, ReturnType<typeof setTimeout>>();
  lastOpenFailureReason = '';

  constructor(private readonly popupStack: RunModalStackService) {}

  releasePopup(popupId: string): void {
    this.clearAutosave(popupId);
    this.bindings.delete(popupId);
  }

  refreshPopup(popupId: string): void {
    this.popupStack.update(popupId, (popup) => ({ ...popup }));
  }

  clearAutosave(popupId: string): void {
    const timer = this.autosaveTimers.get(popupId);
    if (timer) {
      clearTimeout(timer);
      this.autosaveTimers.delete(popupId);
    }
  }

  getLastOpenFailureReason(): string {
    return this.lastOpenFailureReason;
  }

  setInteractionLock(entryDialogConfig: DocumentWindowConfig, locked: boolean): void {
    entryDialogConfig.interactionLocked = locked;
  }
}
