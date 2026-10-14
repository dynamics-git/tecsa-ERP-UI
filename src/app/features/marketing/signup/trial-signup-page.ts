import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-trial-signup-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './trial-signup-page.html',
  styleUrl: './trial-signup-page.scss',
})
export class TrialSignupPage {
  private readonly formBuilder = inject(FormBuilder);

  readonly form = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    name: ['', [Validators.required, Validators.maxLength(150)]],
    organization: ['', [Validators.required, Validators.maxLength(150)]],
    company: ['', [Validators.required, Validators.maxLength(150)]],
    country: ['Malaysia', [Validators.required]],
  });

  readonly stages = ['Your email', 'About you', 'Your business', 'A first look'];
  step = 0;
  previewComplete = false;

  back(): void {
    this.previewComplete = false;
    this.step = Math.max(0, this.step - 1);
  }

  next(): void {
    if (this.previewComplete || this.step >= 3) return;
    const stageFields: Array<Array<keyof typeof this.form.controls>> = [
      ['email'],
      ['name'],
      ['organization', 'company', 'country'],
    ];
    const fields = stageFields[this.step];
    for (const key of fields) this.form.controls[key].markAsTouched();
    if (fields.some(key => this.form.controls[key].invalid)) return;
    this.step += 1;
  }

  finishPreview(): void {
    if (this.step === 3 && this.form.valid) this.previewComplete = true;
  }
}
