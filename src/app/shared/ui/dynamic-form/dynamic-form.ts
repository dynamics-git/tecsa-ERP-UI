import { FieldValidationService } from '../../../platform/document/field-validation.service';
import { fieldIsRequired, fieldIsHidden, fieldIsReadonly } from '../../../platform/models/field-state';
import { lookupQuery, clearDependentLookups } from '../../../platform/data/lookup-dependencies';
import { resolveLookupIdentity } from '../../../platform/data/record-identity';
import { LookupSelect } from '../lookup-select/lookup-select';
import { normalizeFieldValue, fieldValuesEqual, fieldInputType, fieldEditorValue } from '../../../platform/models/field-value';
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, ChangeDetectorRef, SimpleChanges } from '@angular/core';
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
  constructor(private readonly source: DataSourceService, private readonly changes: ChangeDetectorRef, private readonly validation: FieldValidationService) {}
  readonly errors = new Map<string,string>();
  private readonly drafts = new Map<string,unknown>();
  errorId(field: FieldConfig): string { return this.lookupId + '-error-' + field.key; }
  validate(): boolean {
    this.errors.clear();
    for (const section of this.sections) for (const field of section.fields) {
      if (this.isHidden(field) || this.isFieldDisabled(field)) continue;
      const result = this.validation.validateField(field, this.drafts.has(field.key) ? this.drafts.get(field.key) : this.data[field.key], this.data);
      if (!result.valid) this.errors.set(field.key,result.errors[0]);
    }
    this.changes.markForCheck(); return this.errors.size === 0;
  }
  private readonly lookups = new Map<string, Subscription>();
  private readonly lookupLabels = new Map<string, string>();
  private readonly selectedLookups = new Set<string>();
  ngOnChanges(changes?:SimpleChanges): void {
    if (changes?.['data'] && !changes['data'].firstChange) {
      for(const fieldKey of this.drafts.keys()) this.draftChanged.emit({fieldKey,invalid:false});
      this.drafts.clear();this.errors.clear();
    }
    for (const section of this.sections) for (const field of section.fields) {
      const id = this.data[field.key];
      const bucket = field.optionsDataKey ?? `__options_${field.key}`;
      if (!field.lookup || !id || !lookupQuery(field.lookup, this.data).ready) continue;
      const context = lookupQuery(field.lookup, this.data).filter;
      const records = this.data[bucket];
      if (Array.isArray(records) && records.some(record => this.isRecord(record) && String(this.resolveOptionValue(field, record)) === String(id))) continue;
      const selectedKey = `${field.key}:${id}`;
      if (this.selectedLookups.has(selectedKey)) continue;
      this.selectedLookups.add(selectedKey);
      this.lookups.get(field.key)?.unsubscribe();
      this.lookups.set(field.key, this.source.loadLookup(field.lookup, id, this.data).subscribe({
        next: record => {
          if (String(this.data[field.key]) !== String(id) || lookupQuery(field.lookup!, this.data).filter !== context) return;
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
    if (this.data[`__lookupRestricted_${field.key}`]) return 'Restricted';
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
    if (!field.lookup) return;
    const query = lookupQuery(field.lookup, this.data, text);
    if (!query.ready) { this.lookups.get(field.key)?.unsubscribe(); this.lookupLoading = false; this.lookupHasMore = false; return; }
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
    const filter = query.filter;
    this.lookups.set(field.key, timer(250).pipe(switchMap(() => this.source.loadList({ endpoint: query.endpoint!, paging: field.lookup!.paging, defaultFilter: filter, pageSize: 20 }, { useCache: true, maxAgeMs: 30000, skip: this.lookupOffset, cursor: this.lookupCursor }))).subscribe({
      next: response => {
        if (lookupQuery(field.lookup!, this.data, text).filter !== query.filter || this.lookupOpen !== field.key) return;
        const page = response as { value: unknown[]; meta: Record<string, unknown> };
        this.lookupOffset += page.value.length;
        this.lookupCursor = typeof page.meta?.['nextCursor'] === 'string' ? page.meta['nextCursor'] : undefined;
        this.lookupHasMore = field.lookup!.paging === 'cursor' ? !!this.lookupCursor : !!this.lookupCursor || (typeof page.meta?.['total'] === 'number' ? this.lookupOffset < page.meta['total'] : page.value.length === 20);
        this.data[bucket] = nextPage ? [...(Array.isArray(this.data[bucket]) ? this.data[bucket] as unknown[] : []), ...page.value] : page.value; this.lookupLoading = false; this.changes.markForCheck(); },
      error: () => { if (lookupQuery(field.lookup!, this.data, text).filter !== query.filter || this.lookupOpen !== field.key) return; this.lookupLoading = false; this.lookupError = 'Unable to load choices. Try again.'; this.changes.markForCheck(); },
    }));
  }
  ngOnDestroy(): void { this.lookups.forEach(subscription => subscription.unsubscribe()); }
  @Input() sections: FormSectionConfig[] = [];
  @Input() dependencySections?: FormSectionConfig[];
  @Input() data: Record<string, unknown> = {};
  @Output() draftChanged = new EventEmitter<{fieldKey:string;invalid:boolean}>();
  @Output() fieldChanged = new EventEmitter<FieldChangeEvent>();
  @Output() fieldInteracted = new EventEmitter<FieldInteractEvent>();
  @Output() dropdownOpened = new EventEmitter<FieldDropdownOpenEvent>();

  get visibleSections(): FormSectionConfig[] {
    return this.sections.filter((section) => section.fields.some((field) => !this.isHidden(field)));
  }

  inputType(field: FieldConfig): string { return fieldInputType(field.valueType ?? field.type); }

  isRequired(field: FieldConfig): boolean { return fieldIsRequired(field, this.data); }
  isHidden(field: FieldConfig): boolean { return fieldIsHidden(field, this.data); }

  getFieldValue(field: FieldConfig): string {
    const value = this.drafts.has(field.key) ? this.drafts.get(field.key) : this.data[field.key] === undefined ? field.defaultValue : this.data[field.key];

    if (value === undefined || value === null) {
      return '';
    }

    return fieldEditorValue(value, field.valueType ?? field.type);
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
    if (this.isFieldDisabled(field) || this.isHidden(field)) return;
    value = normalizeFieldValue(value, field.valueType ?? field.type);
    const result = this.validation.validateField(field,value,this.data);
    if (!result.valid) { this.drafts.set(field.key,value); this.errors.set(field.key,result.errors[0]); this.draftChanged.emit({fieldKey:field.key,invalid:true}); this.changes.markForCheck(); return; }
    this.drafts.delete(field.key); this.errors.delete(field.key); this.draftChanged.emit({fieldKey:field.key,invalid:false}); this.changes.markForCheck();
    const previousValue = this.data[field.key];
    if (fieldValuesEqual(previousValue, value, field.valueType ?? field.type)) return;
    this.data[field.key] = value;
    const updates = this.resolveTargetUpdates(field, value) ?? {};
    const previousUpdates: Record<string, unknown> = {};

    if (updates) {
      for (const [key, updatedValue] of Object.entries(updates)) {
        previousUpdates[key] = this.data[key];
        this.data[key] = updatedValue;
      }
    }

    const dependencies = clearDependentLookups((this.dependencySections ?? this.sections).flatMap(section => section.fields), [field.key, ...Object.keys(updates).filter(key => !fieldValuesEqual(previousUpdates[key], updates[key]))], this.data);
    Object.assign(updates, dependencies.updates);
    Object.assign(previousUpdates, dependencies.previous);
    for (const key of dependencies.invalidated) {
      this.lookups.get(key)?.unsubscribe();
      for (const cacheKey of this.lookupLabels.keys()) if (cacheKey.startsWith(key + ':')) this.lookupLabels.delete(cacheKey);
      for (const selectedKey of this.selectedLookups) if (selectedKey.startsWith(key + ':')) this.selectedLookups.delete(selectedKey);
      if (this.lookupOpen === key) { this.closeLookup(); this.lookupLoading = false; this.lookupHasMore = false; }
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
    return this.data[`__lookupRestricted_${field.key}`] === true || field.disabled === true || fieldIsReadonly(field, this.data) || (!!field.lookup && !lookupQuery(field.lookup, this.data).ready);
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
