import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, ChangeDetectorRef } from '@angular/core';
import { FieldConfig, FormSectionConfig } from '../../../platform/models/field-config.model';
import { DataSourceService } from '../../../platform/data/data-source.service';
import { Subscription, timer, switchMap } from 'rxjs';

type FieldChangeEvent = {
  fieldKey: string;
  value: unknown;
  previousValue: unknown;
  updates?: Record<string, unknown>;
  previousUpdates?: Record<string, unknown>;
};

type FieldInteractEvent = {
  fieldKey: string;
};

type FieldDropdownOpenEvent = {
  fieldKey: string;
};

@Component({
  selector: 'app-dynamic-form',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dynamic-form.html',
  styleUrl: './dynamic-form.scss',
})
export class DynamicForm {
  constructor(private readonly source: DataSourceService, private readonly changes: ChangeDetectorRef) {}
  private readonly lookups = new Map<string, Subscription>();
  private readonly selectedLookups = new Set<string>();
  ngOnChanges(): void {
    for (const section of this.sections) for (const field of section.fields) {
      const id = this.data[field.key];
      const bucket = field.optionsDataKey ?? `__options_${field.key}`;
      if (!field.lookup || !id || (Array.isArray(this.data[bucket]) && (this.data[bucket] as unknown[]).length)) continue;
      const selectedKey = `${field.key}:${id}`;
      if (this.selectedLookups.has(selectedKey)) continue;
      this.selectedLookups.add(selectedKey);
      this.lookups.get(field.key)?.unsubscribe();
      this.lookups.set(field.key, this.source.loadById({ endpoint: field.lookup.endpoint }, id).subscribe({
        next: record => { this.data[bucket] = [record]; this.changes.markForCheck(); }, error: () => {},
      }));
    }
  }
  searchLookup(field: FieldConfig, text: string): void {
    if (!field.lookup) return;
    this.lookups.get(field.key)?.unsubscribe();
    const escaped = text.trim().replace(/'/g, "''");
    const fields = field.lookup.searchFields ?? [field.lookup.displayField];
    const filter = escaped ? fields.map(key => `contains(${key}, '${escaped}')`).join(' or ') : undefined;
    this.lookups.set(field.key, timer(250).pipe(switchMap(() => this.source.loadList({ endpoint: field.lookup!.endpoint, defaultFilter: filter, pageSize: 20 }))).subscribe({
      next: response => { this.data[field.optionsDataKey ?? `__options_${field.key}`] = (response as { value: unknown[] }).value; this.changes.markForCheck(); },
      error: () => { /* Keep the existing selection if a lookup is denied or unavailable. */ },
    }));
  }
  ngOnDestroy(): void { this.lookups.forEach(subscription => subscription.unsubscribe()); }
  @Input() sections: FormSectionConfig[] = [];
  @Input() data: Record<string, unknown> = {};
  @Output() fieldChanged = new EventEmitter<FieldChangeEvent>();
  @Output() fieldInteracted = new EventEmitter<FieldInteractEvent>();
  @Output() dropdownOpened = new EventEmitter<FieldDropdownOpenEvent>();

  get visibleSections(): FormSectionConfig[] {
    return this.sections.filter((section) => section.fields.some((field) => !field.hidden));
  }

  getFieldValue(field: FieldConfig): string {
    const value = this.data[field.key] ?? field.defaultValue;

    if (value === undefined || value === null) {
      return '';
    }

    return String(value);
  }

  getFieldOptions(field: FieldConfig): Array<{ label: string; value: unknown }> {
    if (field.options?.length) {
      return field.options;
    }

    const sourceKey = field.optionsDataKey ?? `__options_${field.key}`;
    if (sourceKey) {
      const source = this.data[sourceKey];
      if (Array.isArray(source)) {
        const options = source
          .filter((item): item is Record<string, unknown> => this.isRecord(item))
          .map((item) => ({
            label: this.resolveOptionLabel(field, item),
            value: this.resolveOptionValue(field, item),
          }))
          .filter((option) => String(option.value).length > 0);
        const selected = this.getFieldValue(field);
        if (selected && !options.some(option => String(option.value) === selected)) options.unshift({ label: selected, value: selected });
        return options;
      }
    }

    const value = this.getFieldValue(field);
    return value ? [{ label: value, value }] : [];
  }

  isOptionSelected(field: FieldConfig, optionValue: unknown): boolean {
    return String(optionValue) === this.getFieldValue(field);
  }

  showEmptyOption(field: FieldConfig): boolean {
    return this.getFieldValue(field).trim().length === 0;
  }

  isWide(field: FieldConfig): boolean {
    return field.width === 'wide';
  }

  updateFieldValue(field: FieldConfig, value: unknown): void {
    const previousValue = this.data[field.key];
    this.data[field.key] = value;
    const updates = this.resolveTargetUpdates(field, value);
    const previousUpdates: Record<string, unknown> = {};

    if (updates) {
      for (const [key, updatedValue] of Object.entries(updates)) {
        previousUpdates[key] = this.data[key];
        this.data[key] = updatedValue;
      }
    }

    this.fieldChanged.emit({
      fieldKey: field.key,
      value,
      previousValue,
      updates,
      previousUpdates: Object.keys(previousUpdates).length ? previousUpdates : undefined,
    });
  }

  isFieldDisabled(field: FieldConfig): boolean {
    return field.disabled === true || field.readonly === true;
  }

  notifyFieldInteracted(field: FieldConfig): void {
    if (this.isFieldDisabled(field)) {
      return;
    }

    this.fieldInteracted.emit({ fieldKey: field.key });
  }

  notifyDropdownOpened(field: FieldConfig): void {
    if (this.isFieldDisabled(field)) {
      return;
    }

    this.dropdownOpened.emit({ fieldKey: field.key });
  }

  private resolveOptionValue(field: FieldConfig, item: Record<string, unknown>): unknown {
    const valueFields = this.resolveFieldCandidates(field.valueField ?? field.bindValue ?? field.lookup?.valueField);
    for (const valueField of valueFields) {
      if (valueField in item) {
        return item[valueField];
      }
    }

    return item['value'] ?? '';
  }

  private resolveOptionLabel(field: FieldConfig, item: Record<string, unknown>): string {
    if (field.displayFormat) {
      return field.displayFormat.replace(/\[([^\]]+)\]/g, (_match, key: string) =>
        this.toText(item[key]),
      );
    }

    const labelFields = this.resolveFieldCandidates(field.labelField ?? field.bindLabel ?? field.lookup?.displayField);
    for (const labelField of labelFields) {
      if (labelField in item) {
        return this.toText(item[labelField]);
      }
    }

    const value = this.toText(this.resolveOptionValue(field, item));
    const name = this.toText(item['label']);
    if (value.length && name.length && value !== name) {
      return `${value} - ${name}`;
    }

    return name || value;
  }

  private resolveFieldCandidates(source: string | string[] | undefined): string[] {
    const fields = Array.isArray(source) ? source : source ? [source] : [];
    return fields.map((field) => field.trim()).filter((field) => field.length > 0);
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }

  private toText(value: unknown): string {
    return value === null || value === undefined ? '' : String(value);
  }

  resolveSelectValue(field: FieldConfig, rawValue: string): unknown {
    const options = this.getFieldOptions(field);
    const matched = options.find((option) => String(option.value) === rawValue);
    if (matched) {
      return matched.value;
    }

    return this.coerceInputValue(field, rawValue);
  }

  coerceInputValue(field: FieldConfig, rawValue: string): unknown {
    switch (field.valueType) {
      case 'number': {
        const normalized = rawValue.replace(/,/g, '').trim();
        if (!normalized.length) {
          return '';
        }

        const parsed = Number(normalized);
        return Number.isFinite(parsed) ? parsed : rawValue;
      }
      case 'boolean': {
        const normalized = rawValue.trim().toLowerCase();
        if (!normalized.length) {
          return false;
        }

        return (
          normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'on'
        );
      }
      default:
        return rawValue;
    }
  }

  private resolveTargetUpdates(
    field: FieldConfig,
    value: unknown,
  ): Record<string, unknown> | undefined {
    if (!field.fill && !field.targets?.length) {
      return undefined;
    }

    const optionRecord = this.findOptionRecord(field, value);
    const updates: Record<string, unknown> = {};

    for (const [targetField, sourceFields] of Object.entries(field.fill ?? {})) {
      if (!optionRecord) {
        continue;
      }

      const resolved = this.readFirstOptionValue(optionRecord, sourceFields);
      if (resolved !== undefined) {
        updates[targetField] = resolved;
      }
    }

    for (const target of field.targets ?? []) {
      if (!optionRecord) {
        if (target.clearOnEmpty) {
          updates[target.key] = '';
        }
        continue;
      }

      const sources = [target.source, ...(target.fallbackSources ?? [])];
      let resolved: unknown = '';
      for (const source of sources) {
        const candidate = optionRecord[source];
        if (candidate !== null && candidate !== undefined && String(candidate).length) {
          resolved = candidate;
          break;
        }
      }

      if (
        (resolved !== null && resolved !== undefined && String(resolved).length) ||
        target.clearOnEmpty
      ) {
        updates[target.key] = resolved;
      }
    }

    return Object.keys(updates).length ? updates : undefined;
  }

  private readFirstOptionValue(
    record: Record<string, unknown>,
    source: string | string[],
  ): unknown {
    const sources = Array.isArray(source) ? source : [source];
    for (const field of sources) {
      const value = record[field];
      if (value !== null && value !== undefined && String(value).length) {
        return value;
      }
    }

    return undefined;
  }

  private findOptionRecord(
    field: FieldConfig,
    value: unknown,
  ): Record<string, unknown> | undefined {
    const sourceKey = field.optionsDataKey ?? `__options_${field.key}`;
    if (!sourceKey) {
      return undefined;
    }

    const source = this.data[sourceKey];
    if (!Array.isArray(source)) {
      return undefined;
    }

    return source
      .filter((item): item is Record<string, unknown> => this.isRecord(item))
      .find((item) => this.toText(this.resolveOptionValue(field, item)) === this.toText(value));
  }
}
