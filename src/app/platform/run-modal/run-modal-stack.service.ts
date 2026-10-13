import { Inject, Injectable, Optional } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { PopupConfig } from '../models/popup-config.model';
import { DEFAULT_RUN_MODAL_STACK_POLICY, RUN_MODAL_STACK_POLICY, RunModalStackPolicy } from './run-modal-stack-policy.token';

@Injectable({
  providedIn: 'root'
})
export class RunModalStackService {
  private readonly stackSubject = new BehaviorSubject<PopupConfig[]>([]);

  constructor(
    @Optional() @Inject(RUN_MODAL_STACK_POLICY) private readonly policy: RunModalStackPolicy | null
  ) {}

  readonly stack$ = this.stackSubject.asObservable();

  open(config: PopupConfig): boolean {
    const currentStack = this.stackSubject.value;
    const activePolicy = this.policy ?? DEFAULT_RUN_MODAL_STACK_POLICY;
    const rawMaxDepth = Number.isFinite(activePolicy.maxDepth)
      ? Math.trunc(activePolicy.maxDepth)
      : DEFAULT_RUN_MODAL_STACK_POLICY.maxDepth;
    const maxDepth = rawMaxDepth <= 0 ? Number.POSITIVE_INFINITY : Math.max(1, rawMaxDepth);
    const nextStackBase = currentStack.filter((popup) => popup.id !== config.id);
    if (!config.allowNested) {
      this.stackSubject.next([config]);
      return true;
    }

    if (nextStackBase.length < maxDepth) {
      this.stackSubject.next([...nextStackBase, config]);
      return true;
    }

    if (activePolicy.onOverflow === 'replace-top') {
      this.stackSubject.next([...nextStackBase.slice(0, maxDepth - 1), config]);
      return true;
    }

    return false;
  }

  close(id?: string): void {
    if (!id) {
      this.closeTop();
      return;
    }

    this.stackSubject.next(this.stackSubject.value.filter((popup) => popup.id !== id));
  }

  closeTop(): void {
    this.stackSubject.next(this.stackSubject.value.slice(0, -1));
  }

  closeAll(): void {
    this.stackSubject.next([]);
  }

  update(id: string, updater: (popup: PopupConfig) => PopupConfig): boolean {
    let updated = false;
    const nextStack = this.stackSubject.value.map((popup) => {
      if (popup.id !== id) {
        return popup;
      }

      updated = true;
      return updater(popup);
    });

    if (updated) {
      this.stackSubject.next(nextStack);
    }

    return updated;
  }
}
