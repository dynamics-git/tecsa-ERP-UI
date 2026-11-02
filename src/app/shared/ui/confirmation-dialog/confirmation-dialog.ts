import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { ConfirmationDialogConfig } from '../../../platform/models/confirmation-dialog-config.model';
import { DynamicForm } from '../dynamic-form/dynamic-form';
import { FieldValidationService } from '../../../platform/document/field-validation.service';
import { LoadingIndicator } from '../loading-indicator/loading-indicator';

@Component({
  selector: 'app-confirmation-dialog',
  standalone: true,
  imports: [CommonModule, DynamicForm, LoadingIndicator],
  templateUrl: './confirmation-dialog.html',
  styleUrl: './confirmation-dialog.scss'
})
export class ConfirmationDialog implements AfterViewInit {
  constructor(private readonly validation: FieldValidationService) {}
  validationError = '';
  @Input() config?: ConfirmationDialogConfig;
  @Output() decided = new EventEmitter<boolean>();

  @ViewChild('confirmButton') private confirmButton?: ElementRef<HTMLButtonElement>;
  @ViewChild('dialogElement') private dialogElement?: ElementRef<HTMLElement>;

  ngAfterViewInit(): void {
    queueMicrotask(() => {
      const dialog = this.dialogElement?.nativeElement;
      const target = this.config?.kind === 'progress' ? dialog
        : dialog?.querySelector<HTMLElement>('input:not([disabled]), select:not([disabled]), textarea:not([disabled])') ?? this.confirmButton?.nativeElement;
      target?.focus();
    });
  }

  confirm(): void {
    if (this.config?.kind === 'progress') return;
    for (const section of this.config?.sections ?? []) for (const field of section.fields) {
      const result = this.validation.validateField(field, this.config?.values?.[field.key]);
      if (!result.valid) { this.validationError = result.errors.join(' '); return; }
    }
    this.decided.emit(true);
  }

  cancel(): void {
    if (this.config?.kind === 'progress') return;
    this.decided.emit(false);
  }
}
