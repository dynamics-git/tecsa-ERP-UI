import { Component, HostListener, inject } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { RecordPanel } from './record-panel';
import { CollaborationEntry } from '../../../platform/data/record-collaboration.service';
import { ConfirmationService } from '../confirmation.service';
import { UnsavedChangesService } from '../../../platform/pages/unsaved-changes.service';

@Component({
  selector: 'app-attachments',
  standalone: true,
  imports: [DatePipe, DecimalPipe],
  templateUrl: './attachments.html',
  styleUrl: './record-panel.scss',
})
export class Attachments extends RecordPanel {
  readonly kind = 'attachments' as const;
  private readonly confirmation = inject(ConfirmationService);
  private readonly unsaved = inject(UnsavedChangesService);
  constructor() {
    super();
    this.registerEditor();
  }
  private registerEditor(): void {
    this.unsaved.register(
      this,
      { changed: () => false, saving: () => this.busy },
      this.context.unsavedScope,
    );
  }
  override ngOnChanges(): void {
    super.ngOnChanges();
    this.registerEditor();
  }
  @HostListener('window:beforeunload', ['$event'])
  beforeUnload(event: BeforeUnloadEvent): void {
    if (this.busy) {
      event.preventDefault();
      event.returnValue = '';
    }
  }
  override ngOnDestroy(): void {
    this.unsaved.release(this);
    super.ngOnDestroy();
  }
  upload(event: Event): void {
    const input = event.target as HTMLInputElement,
      file = input.files?.[0];
    input.value = '';
    if (file && this.result?.capabilities.create)
      void this.mutate(() => this.api.upload(this.requestPath, file));
  }
  async saveFile(entry: CollaborationEntry): Promise<void> {
    if (this.busy || !this.result?.capabilities.read || this.loadedScope !== this.api.scope())
      return;
    const isCurrent = this.captureContext();
    this.busy = true;
    this.error = '';
    try {
      const blob = await firstValueFrom(this.api.download(this.requestPath, entry));
      if (!isCurrent()) return;
      const url = URL.createObjectURL(blob),
        link = document.createElement('a');
      link.href = url;
      link.download = entry.fileName ?? 'attachment';
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      if (isCurrent()) this.error = 'Unable to download the attachment. Refresh and retry.';
    } finally {
      if (isCurrent()) {
        this.busy = false;
        this.cd.markForCheck();
      }
    }
  }
  async remove(entry: CollaborationEntry): Promise<void> {
    if (!this.result?.capabilities.delete || this.busy) return;
    const isCurrent = this.captureContext();
    if (
      (await this.confirmation.confirm({
        title: 'Delete attachment',
        message: 'Delete ' + entry.fileName + '?',
      })) &&
      isCurrent()
    )
      await this.mutate(() => this.api.remove(this.requestPath, entry));
  }
}
