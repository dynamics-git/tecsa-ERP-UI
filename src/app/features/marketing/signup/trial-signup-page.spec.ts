import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import { TrialSignupPage } from './trial-signup-page';

describe('Trial signup design preview', () => {
  let component: TrialSignupPage;
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [TrialSignupPage], providers: [provideRouter([])] });
    component = TestBed.createComponent(TrialSignupPage).componentInstance;
  });

  it('validates each stage and never skips an invalid email', () => {
    component.next();
    expect(component.step).toBe(0);
    component.form.controls.email.setValue('invalid');
    component.next();
    expect(component.step).toBe(0);
    component.form.controls.email.setValue('person@example.test');
    component.next();
    expect(component.step).toBe(1);
    component.next();
    expect(component.step).toBe(1);
    component.form.controls.name.setValue('Test Owner');
    component.next();
    expect(component.step).toBe(2);
  });

  it('requires organization and company, supports back navigation and has no backend submission', () => {
    component.form.patchValue({ email: 'person@example.test', name: 'Test Owner' });
    component.next(); component.next();
    expect(component.step).toBe(2);
    component.next();
    expect(component.step).toBe(2);
    component.form.patchValue({ organization: 'Example Group', company: 'Example Company' });
    component.next();
    expect(component.step).toBe(3);
    component.finishPreview();
    expect(component.previewComplete).toBe(true);
    component.back();
    expect(component.previewComplete).toBe(false);
    expect(component.step).toBe(2);
  });
});
