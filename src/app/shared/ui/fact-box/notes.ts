import { Component, HostListener, OnDestroy, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RecordPanel } from './record-panel';
import { CollaborationEntry } from '../../../platform/data/record-collaboration.service';
import { ConfirmationService } from '../confirmation.service';
import { UnsavedChangesService } from '../../../platform/pages/unsaved-changes.service';

@Component({
  selector: 'app-notes',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './notes.html',
  styleUrl: './record-panel.scss',
})
export class Notes extends RecordPanel implements OnDestroy {
  readonly kind = 'notes' as const;
  private readonly confirmation = inject(ConfirmationService);
  private readonly unsaved = inject(UnsavedChangesService);
  private readonly drafts = new Map<string, { body: string; editing?: CollaborationEntry }>();
  constructor() {
    super();
    this.registerEditor();
  }
  private registerEditor(): void {
    this.unsaved.register(
      this,
      {
        changed: () => this.hasDraft,
        saving: () => this.busy,
        discard: () => this.discardDrafts(),
      },
      this.context.unsavedScope,
    );
  }
  override ngOnChanges(): void {
    super.ngOnChanges();
    this.registerEditor();
  }
  get hasDraft(): boolean {
    return [...this.drafts.values()].some((draft) =>
      draft.editing ? draft.body !== draft.editing.body : !!draft.body.trim(),
    );
  }
  @HostListener('window:beforeunload', ['$event'])
  beforeUnload(event: BeforeUnloadEvent): void {
    if (this.hasDraft || this.busy) {
      event.preventDefault();
      event.returnValue = '';
    }
  }
  get draft(): string {
    return this.drafts.get(this.currentKey)?.body ?? '';
  }
  get editing(): CollaborationEntry | undefined {
    return this.drafts.get(this.currentKey)?.editing;
  }
  changeDraft(event: Event): void {
    this.drafts.set(this.currentKey, {
      body: (event.target as HTMLTextAreaElement).value,
      editing: this.editing,
    });
  }
  async edit(entry: CollaborationEntry): Promise<void> {
    if (this.busy || !this.result?.capabilities.modify) return;
    const isCurrent = this.captureContext();
    const current = this.drafts.get(this.currentKey);
    const changed =
      current && (current.editing ? current.body !== current.editing.body : !!current.body.trim());
    if (
      changed &&
      !(await this.confirmation.confirm({
        title: 'Unsaved changes',
        message: 'Discard this draft and edit another note?',
      }))
    )
      return;
    if (isCurrent()) this.drafts.set(this.currentKey, { body: entry.body ?? '', editing: entry });
  }
  discardDrafts(): void {
    if (!this.busy) this.drafts.clear();
  }
  cancel(): void {
    if (!this.busy) this.drafts.delete(this.currentKey);
  }
  save(): void {
    const editing = this.editing;
    if (
      !this.draft.trim() ||
      !(editing ? this.result?.capabilities.modify : this.result?.capabilities.create)
    )
      return;
    void this.mutate(
      () => this.api.saveNote(this.requestPath, this.draft.trim(), editing),
      () => this.drafts.delete(this.currentKey),
    );
  }
  async remove(entry: CollaborationEntry): Promise<void> {
    if (!this.result?.capabilities.delete || this.busy) return;
    const isCurrent = this.captureContext();
    if (
      (await this.confirmation.confirm({ title: 'Delete note', message: 'Delete this note?' })) &&
      isCurrent()
    )
      await this.mutate(() => this.api.remove(this.requestPath, entry));
  }
  override ngOnDestroy(): void {
    this.unsaved.release(this);
    super.ngOnDestroy();
  }
}
