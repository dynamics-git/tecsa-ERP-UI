import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { ConfirmationDialogConfig } from '../../../platform/models/confirmation-dialog-config.model';

@Component({
  selector: 'app-confirmation-dialog',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './confirmation-dialog.html',
  styleUrl: './confirmation-dialog.scss'
})
export class ConfirmationDialog implements AfterViewInit {
  @Input() config?: ConfirmationDialogConfig;
  @Output() decided = new EventEmitter<boolean>();

  @ViewChild('confirmButton') private confirmButton?: ElementRef<HTMLButtonElement>;

  ngAfterViewInit(): void {
    queueMicrotask(() => {
      this.confirmButton?.nativeElement.focus();
    });
  }

  confirm(): void {
    this.decided.emit(true);
  }

  cancel(): void {
    this.decided.emit(false);
  }
}
