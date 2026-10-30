import {
  Directive,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  inject,
} from '@angular/core';

export interface ColumnReorderEvent {
  sourceKey: string;
  targetKey: string;
  after: boolean;
}

/** Mouse interaction only. The owning grid applies and persists the resulting order. */
@Directive({ selector: '[columnReorder]', standalone: true })
export class ColumnReorder implements OnChanges, OnDestroy {
  @Input() columnReorder = true;
  @Input() columnReorderScroll?: HTMLElement;
  @Input() frozenThrough = '';
  @Output() columnReordered = new EventEmitter<ColumnReorderEvent>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private source?: { key: string; header: HTMLElement; opacity: string };
  private indicator?: { header: HTMLElement; shadow: string };
  private target?: ColumnReorderEvent;
  private point?: { x: number; y: number };
  private frame?: number;
  private suppressClick = false;
  private readonly captureClick = (event: MouseEvent): void => {
    if (!this.suppressClick || event.detail === 0) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    this.suppressClick = false;
  };

  constructor() {
    this.host.addEventListener('click', this.captureClick, true);
  }

  ngOnChanges(): void {
    this.end();
  }
  ngOnDestroy(): void {
    this.end();
    this.host.removeEventListener('click', this.captureClick, true);
  }

  @HostListener('pointerdown')
  prepare(): void {
    this.suppressClick = false;
  }

  @HostListener('dragstart', ['$event'])
  start(event: DragEvent): void {
    const header = this.headerAt(event.target);
    if (
      !this.columnReorder ||
      !header ||
      (event.target instanceof Element && event.target.closest('[data-column-resize]'))
    ) {
      event.preventDefault();
      return;
    }
    this.end();
    this.source = { key: header.dataset['columnKey']!, header, opacity: header.style.opacity };
    header.style.opacity = '0.6';
    this.suppressClick = true;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('application/x-column-key', this.source.key);
    }
  }

  @HostListener('dragover', ['$event'])
  over(event: DragEvent): void {
    if (!this.source) return;
    event.preventDefault();
    this.updateTarget(this.headerAt(event.target), event.clientX);
    if (event.dataTransfer) event.dataTransfer.dropEffect = this.target ? 'move' : 'none';
  }

  @HostListener('drop', ['$event'])
  drop(event: DragEvent): void {
    if (!this.source) return;
    event.preventDefault();
    this.updateTarget(this.headerAt(event.target), event.clientX);
    const target = this.target;
    this.end();
    if (target) this.columnReordered.emit(target);
  }

  @HostListener('window:dragend')
  @HostListener('window:drop')
  end(): void {
    if (this.source) this.source.header.style.opacity = this.source.opacity;
    this.clearIndicator();
    this.source = undefined;
    this.point = undefined;
    this.stopScroll();
  }

  @HostListener('window:keydown', ['$event'])
  cancel(event: KeyboardEvent): void {
    if (event.key === 'Escape') this.end();
  }

  @HostListener('window:dragover', ['$event'])
  track(event: DragEvent): void {
    if (!this.source) return;
    this.point = { x: event.clientX, y: event.clientY };
    const bounds = this.columnReorderScroll?.getBoundingClientRect();
    if (
      !bounds ||
      event.clientY < bounds.top ||
      event.clientY > bounds.bottom ||
      event.clientX < bounds.left ||
      event.clientX > bounds.right
    ) {
      this.clearIndicator();
      this.stopScroll();
      return;
    }
    if (event.clientX > bounds.left + 32 && event.clientX < bounds.right - 32) {
      this.stopScroll();
      return;
    }
    if (this.frame === undefined) this.frame = requestAnimationFrame(() => this.scroll());
  }

  private scroll(): void {
    this.frame = undefined;
    const scroll = this.columnReorderScroll;
    if (!this.source || !this.point || !scroll) return;
    const bounds = scroll.getBoundingClientRect();
    const delta =
      this.point.x <= bounds.left + 32 ? -16 : this.point.x >= bounds.right - 32 ? 16 : 0;
    const before = scroll.scrollLeft;
    scroll.scrollLeft = Math.max(
      0,
      Math.min(scroll.scrollWidth - scroll.clientWidth, before + delta),
    );
    if (!delta || scroll.scrollLeft === before) return;
    this.updateTarget(
      this.headerAt(scroll.ownerDocument.elementFromPoint(this.point.x, this.point.y)),
      this.point.x,
    );
    this.frame = requestAnimationFrame(() => this.scroll());
  }

  private updateTarget(header: HTMLElement | undefined, x: number): void {
    this.clearIndicator();
    if (!header || !this.source || !this.host.contains(this.source.header)) return;
    const headers = [...this.host.querySelectorAll<HTMLElement>('[data-column-key]')];
    const boundary = headers.findIndex((item) => item.dataset['columnKey'] === this.frozenThrough);
    const frozen = (item: HTMLElement) => boundary >= 0 && headers.indexOf(item) <= boundary;
    const key = header.dataset['columnKey']!;
    if (key === this.source.key || frozen(this.source.header) !== frozen(header)) return;
    const bounds = header.getBoundingClientRect();
    const after = x >= bounds.left + bounds.width / 2;
    this.target = { sourceKey: this.source.key, targetKey: key, after };
    this.indicator = { header, shadow: header.style.boxShadow };
    header.style.boxShadow = `inset ${after ? -3 : 3}px 0 var(--ts-border-focus)`;
  }

  private clearIndicator(): void {
    if (this.indicator) this.indicator.header.style.boxShadow = this.indicator.shadow;
    this.indicator = undefined;
    this.target = undefined;
  }

  private stopScroll(): void {
    if (this.frame !== undefined) cancelAnimationFrame(this.frame);
    this.frame = undefined;
  }

  private headerAt(target: EventTarget | null): HTMLElement | undefined {
    const header =
      target instanceof Element ? target.closest<HTMLElement>('[data-column-key]') : null;
    return header && this.host.contains(header) ? header : undefined;
  }
}
