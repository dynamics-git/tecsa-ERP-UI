import {
  Component,
  OnInit,
  OnDestroy,
  EventEmitter,
  Output,
  inject,
  ChangeDetectorRef,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { NotificationClient, InboxEntry } from '../../../platform/data/notification-client.service';
import { ApiErrorService } from '../../../platform/data/api-error.service';
@Component({
  selector: 'app-notification-inbox',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './notification-inbox.html',
  styleUrl: './notification-inbox.scss',
})
export class NotificationInbox implements OnInit, OnDestroy {
  private readonly cd = inject(ChangeDetectorRef);
  readonly api = inject(NotificationClient);
  private readonly errors = inject(ApiErrorService);
  @Output() recordOpened = new EventEmitter<void>();
  rows: InboxEntry[] = [];
  loading = false;
  error = '';
  unread = false;
  hasMore = false;
  private cursor?: string;
  private generation = 0;
  private scope = '';
  private destroyed = false;
  ngOnInit(): void {
    this.scope = this.api.scope();
    void this.load();
  }
  ngOnDestroy(): void {
    this.destroyed = true;
    this.generation++;
  }
  get visibleRows(): InboxEntry[] {
    return this.scope === this.api.scope() ? this.rows : [];
  }
  async load(more = false): Promise<void> {
    if (this.loading) return;
    const generation = ++this.generation;
    this.scope = this.api.scope();
    if (!more) {
      this.rows = [];
      this.cursor = undefined;
    }
    this.loading = true;
    this.error = '';
    try {
      const result = await this.api.list(more ? this.cursor : undefined, this.unread);
      if (this.destroyed || generation !== this.generation) return;
      this.rows = more ? [...this.rows, ...result.data] : result.data;
      this.hasMore = result.meta.hasMore;
      this.cursor = result.meta.nextCursor;
    } catch (e) {
      if (!this.destroyed) this.error = this.errors.toMessage(e, 'Unable to load notifications.');
    } finally {
      if (!this.destroyed) {
        this.loading = false;
        this.cd.markForCheck();
      }
    }
  }
  readonly working = new Set<string>();
  async read(entry: InboxEntry): Promise<void> {
    if (this.working.has(entry.systemId) || entry.readAt) return;
    this.working.add(entry.systemId);
    try {
      await this.api.markRead(entry);
    } catch (e) {
      if (!this.destroyed)
        this.error = this.errors.toMessage(e, 'Unable to mark this notification read.');
    } finally {
      this.working.delete(entry.systemId);
      if (!this.destroyed) this.cd.markForCheck();
    }
  }
  async open(entry: InboxEntry): Promise<void> {
    if (this.working.has(entry.systemId)) return;
    this.working.add(entry.systemId);
    try {
      if (!entry.readAt) await this.api.markRead(entry);
      if (this.destroyed) return;
      await this.api.open(entry);
      if (!this.destroyed) this.recordOpened.emit();
    } catch (e) {
      if (!this.destroyed) this.error = this.errors.toMessage(e, 'Unable to open the record.');
    } finally {
      this.working.delete(entry.systemId);
      if (!this.destroyed) this.cd.markForCheck();
    }
  }
}
