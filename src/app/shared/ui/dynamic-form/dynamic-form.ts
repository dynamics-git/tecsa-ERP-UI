import { resolveLookupIdentity } from '../../../platform/data/record-identity';
import { LookupSelect } from '../lookup-select/lookup-select';
import { normalizeFieldValue, fieldValuesEqual } from '../../../platform/models/field-value';
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
  imports: [CommonModule, LookupSelect],
  templateUrl: './dynamic-form.html',
  styleUrl: './dynamic-form.scss',
})
export class DynamicForm {
  constructor(private readonly source: DataSourceService, private readonly changes: ChangeDetectorRef) {}
  private readonly lookups = new Map<string, Subscription>();
  private readonly lookupLabels = new Map<string, string>();
  private readonly selectedLookups = new Set<string>();
  ngOnChanges(): void {
    for (const section of this.sections) for (const field of section.fields) {
      const id = this.data[field.key];
      const bucket = field.optionsDataKey ?? `__options_${field.key}`;
      if (!field.lookup || !id) continue;
      const records = this.data[bucket];
      if (Array.isArray(records) && records.some(record => this.isRecord(record) && String(this.resolveOptionValue(field, record)) === String(id))) continue;
      const selectedKey = `${field.key}:${id}`;
      if (this.selectedLookups.has(selectedKey)) continue;
      this.selectedLookups.add(selectedKey);
      this.lookups.get(field.key)?.unsubscribe();
      this.lookups.set(field.key, this.source.loadById({ endpoint: field.lookup.endpoint }, id).subscribe({
        next: record => {
          if (this.isRecord(record)) this.lookupLabels.set(field.key + ':' + id, this.resolveOptionLabel(field, record));
          this.data[bucket] = [record]; this.changes.markForCheck();
        }, error: () => { this.selectedLookups.delete(selectedKey); },
      }));
    }
  }
  lookupOpen = '';
  lookupQuery = '';
  lookupLoading = false;
  lookupError = '';
  lookupHasMore = false;
  lookupRetryNextPage = false;
  private lookupOffset = 0;
  private lookupCursor?: string;
  lookupActive = -1;
  private static nextId = 0;
  readonly lookupId = 'lookup-' + DynamicForm.nextId++;
  lookupLabel(field: FieldConfig): string {
    return this.lookupLabels.get(field.key + ':' + this.getFieldValue(field)) ?? this.getFieldOptions(field).find(option => this.isOptionSelected(field, option.value))?.label ?? '';
  }
  openLookup(field: FieldConfig): void {
    if (this.isFieldDisabled(field)) return;
    const currentLabel = this.lookupLabel(field);
    if (currentLabel) this.lookupLabels.set(field.key + ':' + this.getFieldValue(field), currentLabel);
    this.lookups.forEach(subscription => subscription.unsubscribe());
    this.lookupOpen = field.key;
    this.lookupQuery = '';
    this.lookupActive = -1;
    this.notifyFieldInteracted(field);
    this.notifyDropdownOpened(field);
    this.searchLookup(field, '');
  }
  closeLookup(): void { this.lookupOpen = ''; this.lookupActive = -1; }
  chooseLookup(field: FieldConfig, value: unknown): void {
    const option = this.getFieldOptions(field).find(item => String(item.value) === String(value));
    if (option) this.lookupLabels.set(field.key + ':' + value, option.label);
    this.updateFieldValue(field, value);
    this.closeLookup();
  }
  searchLookup(field: FieldConfig, text: string, nextPage = false): void {
    if (nextPage && (this.lookupLoading || !this.lookupHasMore)) return;
    this.lookupRetryNextPage = nextPage;
    if (!nextPage) { this.lookupOffset = 0; this.lookupCursor = undefined; this.lookupHasMore = false; }
    this.lookupQuery = text;
    this.lookupActive = -1;
    this.lookupLoading = true;
    this.lookupError = '';
    if (!field.lookup) return;
    this.lookups.get(field.key)?.unsubscribe();
    const bucket = field.optionsDataKey ?? `__options_${field.key}`;
    if (!nextPage) this.data[bucket] = [];
    const escaped = text.trim().replace(/'/g, "''");
    const fields = field.lookup.searchFields ?? [field.lookup.displayField];
    const filter = escaped ? fields.map(key => `contains(${key}, '${escaped}')`).join(' or ') : undefined;
    this.lookups.set(field.key, timer(250).pipe(switchMap(() => this.source.loadList({ endpoint: field.lookup!.endpoint, paging: field.lookup!.paging, defaultFilter: filter, pageSize: 20 }, { useCache: true, maxAgeMs: 30000, skip: this.lookupOffset, cursor: this.lookupCursor }))).subscribe({
      next: response => { const page = response as { value: unknown[]; meta: Record<string, unknown> };
        this.lookupOffset += page.value.length;
        this.lookupCursor = typeof page.meta?.['nextCursor'] === 'string' ? page.meta['nextCursor'] : undefined;
        this.lookupHasMore = field.lookup!.paging === 'cursor' ? !!this.lookupCursor : !!this.lookupCursor || (typeof page.meta?.['total'] === 'number' ? this.lookupOffset < page.meta['total'] : page.value.length === 20);
        this.data[bucket] = nextPage ? [...(Array.isArray(this.data[bucket]) ? this.data[bucket] as unknown[] : []), ...page.value] : page.value; this.lookupLoading = false; this.changes.markForCheck(); },
      error: () => { this.lookupLoading = false; this.lookupError = 'Unable to load choices. Try again.'; this.changes.markForCheck(); },
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
        if (selected && this.lookupOpen !== field.key && !options.some(option => String(option.value) === selected)) options.unshift({ label: this.lookupLabels.get(field.key + ':' + selected) ?? (field.lookup ? '' : selected), value: selected });
        return options;
      }
    }

    const value = this.getFieldValue(field);
    return value && !field.lookup ? [{ label: value, value }] : [];
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
    value = normalizeFieldValue(value, field.valueType ?? field.type);
    const previousValue = this.data[field.key];
    if (fieldValuesEqual(previousValue, value, field.valueType ?? field.type)) return;
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

    if (field.lookup && !field.labelField && !field.bindLabel) return resolveLookupIdentity(item, field.lookup);
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
    return normalizeFieldValue(rawValue, field.valueType ?? field.type);
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
