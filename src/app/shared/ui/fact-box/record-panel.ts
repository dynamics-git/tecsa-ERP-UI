import { ChangeDetectorRef, Directive, Input, OnChanges, OnDestroy, inject } from '@angular/core';
import { firstValueFrom, Observable, Subscription } from 'rxjs';
import {
  RecordCollaborationService,
  CollaborationPage,
} from '../../../platform/data/record-collaboration.service';
import { ApiErrorService } from '../../../platform/data/api-error.service';
import type { FactBoxContext } from '../../../platform/models/fact-box-context.model';

/** Shared request lifecycle: ignore obsolete responses after record/company changes. */
@Directive()
export abstract class RecordPanel implements OnChanges, OnDestroy {
  @Input() context: FactBoxContext = {};
  @Input() data: Record<string, unknown> = {};
  protected readonly api = inject(RecordCollaborationService);
  protected readonly cd = inject(ChangeDetectorRef);
  private readonly errors = inject(ApiErrorService);
  private request?: Subscription;
  private contextGeneration = 0;
  protected currentKey = '';
  protected captureContext(): () => boolean {
    const generation = this.contextGeneration,
      scope = this.api.scope();
    return () => generation === this.contextGeneration && scope === this.api.scope();
  }
  protected requestPath = '';
  protected loadedScope = '';
  result?: CollaborationPage;
  error = '';
  loading = false;
  busy = false;
  abstract readonly kind: 'notes' | 'attachments';
  ngOnChanges(): void {
    const key = JSON.stringify([
      this.api.scope(),
      this.context.companyId,
      this.context.recordEndpoint,
    ]);
    if (key === this.currentKey) return;
    this.request?.unsubscribe();
    this.contextGeneration++;
    this.loadedScope = this.api.scope();
    this.currentKey = key;
    this.result = undefined;
    this.error = '';
    this.busy = false;
    this.requestPath = this.context.recordEndpoint ? this.api.path(this.context, this.kind) : '';
    this.load();
  }
  load(page = 1): void {
    this.request?.unsubscribe();
    if (!this.requestPath) {
      this.loading = false;
      return;
    }
    const isCurrent = this.captureContext();
    this.loading = true;
    this.error = '';
    this.request = this.api.list(this.requestPath, page).subscribe({
      next: (value) => {
        if (!isCurrent()) return;
        this.result = value as CollaborationPage;
        this.loading = false;
        this.cd.markForCheck();
      },
      error: (error) => {
        if (!isCurrent()) return;
        this.result = undefined;
        this.error = this.errors.toMessage(error, 'Unable to load this record.');
        this.loading = false;
        this.cd.markForCheck();
      },
    });
  }
  protected async mutate(
    operation: () => Observable<unknown>,
    success?: () => void,
  ): Promise<void> {
    if (this.busy || !this.requestPath || this.loadedScope !== this.api.scope()) return;
    const isCurrent = this.captureContext();
    this.busy = true;
    this.error = '';
    try {
      await firstValueFrom(operation());
      if (isCurrent()) {
        success?.();
        this.load();
      }
    } catch (error) {
      if (isCurrent()) this.error = this.errors.toMessage(error, 'The change could not be saved.');
    } finally {
      if (isCurrent()) {
        this.busy = false;
        this.cd.markForCheck();
      }
    }
  }
  ngOnDestroy(): void {
    this.contextGeneration++;
    this.currentKey = '';
    this.request?.unsubscribe();
  }
}
