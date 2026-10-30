import { Directive, EventEmitter, HostListener, Input, OnDestroy, Output } from '@angular/core';

/** Resizer input and accessibility; column width storage belongs to the owning grid. */
@Directive({
  selector: '[columnResize]',
  standalone: true,
  host: {
    role: 'separator',
    tabindex: '0',
    'aria-orientation': 'vertical',
    'data-column-resize': '',
    '[attr.aria-valuenow]': 'columnResize',
    'aria-valuemin': '72',
    'aria-valuemax': '800',
  },
})
export class ColumnResize implements OnDestroy {
  @Input() columnResize = 124;
  @Output() columnWidthChange = new EventEmitter<number>();
  @Output() columnResizeEnd = new EventEmitter<void>();
  @Output() columnAutoFit = new EventEmitter<void>();
  private active?: { id: number; x: number; width: number; changed: boolean };

  @HostListener('pointerdown', ['$event'])
  start(event: PointerEvent): void {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    this.active = {
      id: event.pointerId,
      x: event.clientX,
      width: this.columnResize,
      changed: false,
    };
  }

  @HostListener('window:pointermove', ['$event'])
  move(event: PointerEvent): void {
    if (!this.active || event.pointerId !== this.active.id) return;
    const width = Math.round(
      Math.max(72, Math.min(800, this.active.width + event.clientX - this.active.x)),
    );
    this.active.changed = true;
    this.columnWidthChange.emit(width);
  }

  @HostListener('window:pointerup', ['$event'])
  @HostListener('window:pointercancel', ['$event'])
  finish(event: PointerEvent): void {
    if (!this.active || event.pointerId !== this.active.id) return;
    const changed = this.active.changed;
    this.active = undefined;
    if (changed) this.columnResizeEnd.emit();
  }

  @HostListener('keydown', ['$event'])
  resizeByKeyboard(event: KeyboardEvent): void {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    this.columnWidthChange.emit(
      Math.max(72, Math.min(800, this.columnResize + (event.key === 'ArrowLeft' ? -16 : 16))),
    );
    this.columnResizeEnd.emit();
  }

  @HostListener('dblclick', ['$event'])
  fit(event: MouseEvent): void {
    event.preventDefault();
    this.columnAutoFit.emit();
  }

  @HostListener('dragstart', ['$event'])
  preventDrag(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
  }

  ngOnDestroy(): void {
    this.active = undefined;
  }
}
