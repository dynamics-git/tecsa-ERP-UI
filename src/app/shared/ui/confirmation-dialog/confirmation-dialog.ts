import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { ConfirmationDialogConfig } from '../../../platform/models/confirmation-dialog-config.model';
import { DynamicForm } from '../dynamic-form/dynamic-form';
import { FieldValidationService } from '../../../platform/document/field-validation.service';

@Component({
  selector: 'app-confirmation-dialog',
  standalone: true,
  imports: [CommonModule, DynamicForm],
  templateUrl: './confirmation-dialog.html',
  styleUrl: './confirmation-dialog.scss'
})
export class ConfirmationDialog implements AfterViewInit {
  constructor(private readonly validation: FieldValidationService) {}
  validationError = '';
  @Input() config?: ConfirmationDialogConfig;
  @Output() decided = new EventEmitter<boolean>();

  @ViewChild('confirmButton') private confirmButton?: ElementRef<HTMLButtonElement>;

  ngAfterViewInit(): void {
    queueMicrotask(() => {
      this.confirmButton?.nativeElement.focus();
    });
  }

  confirm(): void {
    for (const section of this.config?.sections ?? []) for (const field of section.fields) {
      const result = this.validation.validateField(field, this.config?.values?.[field.key]);
      if (!result.valid) { this.validationError = result.errors.join(' '); return; }
    }
    this.decided.emit(true);
  }

  cancel(): void {
    this.decided.emit(false);
  }
}
