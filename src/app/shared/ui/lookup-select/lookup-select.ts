import { LoadingIndicator } from '../loading-indicator/loading-indicator';
import { Component, EventEmitter, Input, Output, ElementRef, ViewChild, HostListener } from '@angular/core';
@Component({
  selector: 'app-lookup-select', standalone: true, imports: [LoadingIndicator],
  templateUrl: './lookup-select.html', styleUrl: './lookup-select.scss',
})
export class LookupSelect {
  private static nextId = 0;
  readonly id = 'choice-' + LookupSelect.nextId++;
  @Input() label = '';
  /** Optional external editor for inline mention suggestions. */
  @Input() anchor?: HTMLTextAreaElement;
  @Input() placeholder = '';
  @Input() display = '';
  @Input() value: unknown;
  @Input() disabled = false;
  @Input() required = false;
  @Input() loading = false;
  @Input() error = '';
  @Input() hasMore = false;
  @Output() retried = new EventEmitter<void>();
  @Output() nextPage = new EventEmitter<void>();
  @Input() options: Array<{label: string; value: unknown}> = [];
  @Output() opened = new EventEmitter<void>();
  @Output() searched = new EventEmitter<string>();
  @Output() selected = new EventEmitter<unknown>();
  @ViewChild('list') private list?: ElementRef<HTMLElement>;
  @ViewChild('editor') private editor?: ElementRef<HTMLInputElement>;
  private popup?: HTMLElement;
  private readonly repositionOnScroll = (event: Event) => {
    if (!this.popup?.contains(event.target as Node)) this.positionPopup();
  };
  @ViewChild('popup') set popupElement(ref: ElementRef<HTMLElement> | undefined) {
    this.popup = ref?.nativeElement;
    if (!this.popup) return;
    // Keep Angular ownership and inherited theme tokens, but escape all ancestor clipping.
    this.popup.showPopover?.();
    this.positionPopup();
    this.popup.ownerDocument.addEventListener('scroll', this.repositionOnScroll, true);
  }
  ngAfterViewChecked(): void { this.positionPopup(); }
  ngOnDestroy(): void { this.detachPopup(); }
  @HostListener('window:resize') onResize(): void { this.positionPopup(); }
  private detachPopup(): void {
    this.popup?.ownerDocument.removeEventListener('scroll', this.repositionOnScroll, true);
    this.popup?.hidePopover?.();
  }
  private positionPopup(): void {
    const popup = this.popup;
    const editor = this.anchor ?? this.editor?.nativeElement;
    if (!this.expanded || !popup || !editor) return;
    const rect = editor.getBoundingClientRect();
    const view = editor.ownerDocument.defaultView;
    if (!view) return;
    const gap = 4, edge = 8;
    const below = Math.max(0, view.innerHeight - rect.bottom - gap - edge);
    const above = Math.max(0, rect.top - gap - edge);
    const opensAbove = below < 280 && above > below;
    popup.style.maxHeight = Math.max(0, opensAbove ? above : below) + 'px';
    const width = Math.min(rect.width, Math.max(0, view.innerWidth - edge * 2));
    popup.style.width = width + 'px';
    popup.style.left = Math.max(edge, Math.min(rect.left, view.innerWidth - width - edge)) + 'px';
    const height = popup.getBoundingClientRect().height;
    popup.style.top = Math.max(edge, opensAbove ? rect.top - gap - height : rect.bottom + gap) + 'px';
  }
  readonly windowSize = 60;
  windowStart = 0;
  rowHeight = 36;
  get visibleOptions() { return this.options.slice(this.windowStart, this.windowStart + this.windowSize); }
  get beforeHeight() { return this.windowStart * this.rowHeight; }
  get afterHeight() { return Math.max(0, this.options.length - this.windowStart - this.windowSize) * this.rowHeight; }
  ngOnChanges(): void {
    if (this.windowStart >= this.options.length) this.windowStart = 0;
  }
  private resetViewport(): void {
    this.windowStart = 0;
    if (this.list) this.list.nativeElement.scrollTop = 0;
  }
  expanded = false;
  query = '';
  active = -1;
  open(): void {
    if (this.disabled || this.expanded) return;
    this.resetViewport();
    this.expanded = true; this.query = ''; this.active = -1;
    this.opened.emit();
  }
  toggle(editor: HTMLInputElement): void {
    if (this.expanded) this.close();
    else { editor.focus(); this.open(); }
  }
  loadMoreOnScroll(event: Event): void {
    const list = event.target as HTMLElement;
    const measured = list.querySelector<HTMLElement>('[role="option"]')?.getBoundingClientRect().height;
    if (measured && measured > 0) this.rowHeight = measured;
    this.windowStart = Math.max(0, Math.min(Math.floor(list.scrollTop / this.rowHeight) - 10, this.options.length - this.windowSize));
    if (this.hasMore && !this.loading && !this.error && list.scrollHeight - list.scrollTop - list.clientHeight <= 40) this.nextPage.emit();
  }
  close(): void { this.detachPopup(); this.expanded = false; this.active = -1; }
  search(value: string): void { this.resetViewport(); this.query = value; this.active = -1; this.searched.emit(value); }
  choose(value: unknown): void { this.selected.emit(value); this.close(); }
  key(event: KeyboardEvent): void {
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); this.close(); }
    if (event.key === 'Tab') this.close();
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault(); event.stopPropagation(); this.open();
      const length = this.options.length;
      if (event.key === 'ArrowDown' && this.active === length - 1 && this.hasMore) { if (!this.loading && !this.error) this.nextPage.emit(); return; }
      this.active = !length ? -1 : this.active < 0
        ? (event.key === 'ArrowDown' ? 0 : length - 1)
        : (this.active + (event.key === 'ArrowDown' ? 1 : -1) + length) % length;
      if (this.active >= 0 && (this.active < this.windowStart || this.active >= this.windowStart + this.windowSize)) this.windowStart = Math.max(0, Math.min(this.active - 10, length - this.windowSize));
      if (this.active >= 0 && this.list) {
        const list = this.list.nativeElement;
        const top = this.active * this.rowHeight;
        if (top < list.scrollTop || top + this.rowHeight > list.scrollTop + list.clientHeight) {
          list.scrollTop = Math.max(0, top - list.clientHeight / 2);
          this.windowStart = Math.max(0, Math.min(this.active - 10, length - this.windowSize));
        }
      }
    }
    if (event.key === 'Enter' && this.expanded && this.error) { event.preventDefault(); event.stopPropagation(); this.retried.emit(); return; }
    if (event.key === 'Enter' && this.expanded) {
      event.preventDefault(); event.stopPropagation();
      const option = this.options[this.active];
      if (option && !this.loading && !this.error) this.choose(option.value);
    }
  }
}
