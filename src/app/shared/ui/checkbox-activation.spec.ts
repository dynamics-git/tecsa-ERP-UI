import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';
import { DATA_REST_SERVICE } from '../../platform/data/data-source.service';
import { FieldConfig } from '../../platform/models/field-config.model';
import { DocumentLines } from '../../platform/document/document-lines/document-lines';
import { DynamicForm } from './dynamic-form/dynamic-form';

afterEach(() => TestBed.resetTestingModule());

function renderForm(options: Partial<FieldConfig> = {}) {
  TestBed.configureTestingModule({
    imports: [DynamicForm],
    providers: [{ provide: DATA_REST_SERVICE, useValue: { get: () => of([]) } }],
  });
  const fixture = TestBed.createComponent(DynamicForm);
  fixture.componentRef.setInput('sections', [{ id: 'general', fields: [
    { key: 'isActive', label: 'Active', type: 'boolean', required: true, ...options },
  ] }]);
  fixture.componentRef.setInput('data', { isActive: true });
  fixture.detectChanges();
  const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
  const label = input.closest('label')!;
  const changed = vi.fn();
  fixture.componentInstance.fieldChanged.subscribe(changed);
  return { fixture, input, label, changed };
}

describe('Checkbox activation boundaries', () => {
  it.each([
    { type: 'boolean' as const },
    { type: undefined, valueType: 'boolean' as const },
  ])('does not change or autosave a header boolean from its caption, padding or nested text ($type/$valueType)', options => {
    const { fixture, input, label, changed } = renderForm(options);
    // Native label activation reproduced the accidental account deactivation.
    label.click();
    (label.querySelector('span[aria-hidden]') as HTMLElement).click();
    fixture.detectChanges();
    expect(input.checked).toBe(true);
    expect(fixture.componentInstance.data['isActive']).toBe(true);
    expect(changed).not.toHaveBeenCalled();
  });

  it('changes a header boolean exactly once per direct checkbox click and keeps native keyboard handling', () => {
    const { fixture, input, changed } = renderForm();
    input.focus();
    const space = new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true, cancelable: true });
    input.dispatchEvent(space);
    expect(space.defaultPrevented).toBe(false);
    input.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.data['isActive']).toBe(false);
    expect(changed).toHaveBeenCalledTimes(1);
    expect(changed.mock.calls[0][0]).toMatchObject({ fieldKey: 'isActive', previousValue: true, value: false });
    input.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.data['isActive']).toBe(true);
    expect(changed).toHaveBeenCalledTimes(2);
  });

  it.each([{ disabled: true }, { readonly: true }])('keeps a protected header checkbox unchanged ($disabled/$readonly)', options => {
    const { fixture, input, label, changed } = renderForm(options);
    expect(input.disabled).toBe(true);
    label.click();
    input.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.data['isActive']).toBe(true);
    expect(changed).not.toHaveBeenCalled();
  });

  it('preserves native label activation for ordinary text fields', () => {
    const { fixture, input, label, changed } = renderForm({ type: 'text', required: false });
    const click = vi.fn();
    input.addEventListener('click', click);
    label.click();
    expect(click).toHaveBeenCalledTimes(1);
    expect(changed).not.toHaveBeenCalled();
    fixture.destroy();
  });

  it.each([false, true])('does not edit a boolean from line-cell/row whitespace (worksheet=%s)', worksheet => {
    TestBed.configureTestingModule({
      imports: [DocumentLines],
      providers: [{ provide: DATA_REST_SERVICE, useValue: { get: () => of([]) } }],
    });
    const fixture = TestBed.createComponent(DocumentLines);
    const row = { isActive: true, description: 'Unchanged' };
    fixture.componentRef.setInput('worksheet', worksheet);
    fixture.componentRef.setInput('columns', [
      { id: 'description', label: 'Description', valueType: 'text' },
      { id: 'isActive', label: 'Active', valueType: 'boolean' },
    ]);
    fixture.componentRef.setInput('rows', [row]);
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('tbody input[type="checkbox"]') as HTMLInputElement;
    const cell = input.closest('td')!;
    const tableRow = cell.closest('tr')!;
    const changed = vi.fn();
    fixture.componentInstance.rowChanged.subscribe(changed);
    cell.click();
    tableRow.click();
    (tableRow.querySelector('input[type="text"]')!.closest('td') as HTMLElement).click();
    fixture.detectChanges();
    expect(row.isActive).toBe(true);
    expect(changed).not.toHaveBeenCalled();
    input.click();
    fixture.detectChanges();
    expect(row.isActive).toBe(false);
    expect(changed).toHaveBeenCalledTimes(1);
  });
});
