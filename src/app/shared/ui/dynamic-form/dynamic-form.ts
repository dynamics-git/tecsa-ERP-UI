import { moveQuickEntry } from '../quick-entry';
import { FieldValidationResult, FieldValidationService } from '../../../platform/document/field-validation.service';
import { fieldIsRequired, fieldIsHidden, fieldIsReadonly } from '../../../platform/models/field-state';
import { lookupQuery, clearDependentLookups } from '../../../platform/data/lookup-dependencies';
import { resolveLookupIdentity } from '../../../platform/data/record-identity';
import { LookupSelect } from '../lookup-select/lookup-select';
import { normalizeFieldValue, fieldValuesEqual, fieldInputType, fieldEditorValue } from '../../../platform/models/field-value';
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, ChangeDetectorRef, SimpleChanges } from '@angular/core';
import { FieldChangeSource, FieldConfig, FormSectionConfig } from '../../../platform/models/field-config.model';
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
  readonly moveQuickEntry = moveQuickEntry;
  constructor(private readonly source: DataSourceService, private readonly changes: ChangeDetectorRef, private readonly validation: FieldValidationService) {}
  readonly errors = new Map<string,string>();
  private destroyed = false;
  private readonly validationRuns = new Map<string, object>();
  private readonly drafts = new Map<string,unknown>();
  errorId(field: FieldConfig): string { return this.lookupId + '-error-' + field.key; }
  validate(): boolean {
    if (this.drafts.size) return false;
    this.errors.clear();
    for (const section of this.sections) for (const field of section.fields) {
      if (this.isHidden(field) || this.isFieldDisabled(field)) continue;
      const result = this.validation.validateField(field, this.drafts.has(field.key) ? this.drafts.get(field.key) : this.data[field.key], this.data);
      if (!result.valid) this.errors.set(field.key,result.errors[0]);
    }
    this.changes.markForCheck(); return this.errors.size === 0;
  }
  private readonly lookups = new Map<string, Subscription>();
  private lookupSearch?: Subscription;
  private readonly lookupLabels = new Map<string, string>();
  private readonly selectedLookups = new Set<string>();
  private readonly pendingSelectedLookups = new Set<string>();
  ngOnChanges(changes?:SimpleChanges): void {
    if (changes?.['data'] && !changes['data'].firstChange) {
      this.validationRuns.clear();
      for(const fieldKey of this.drafts.keys()) this.draftChanged.emit({fieldKey,invalid:false});
      this.drafts.clear();this.errors.clear();
      this.lookups.forEach(request => request.unsubscribe()); this.lookups.clear();
      this.selectedLookups.clear(); this.pendingSelectedLookups.clear(); this.lookupLabels.clear(); this.closeLookup();
    }
    for (const section of this.sections) for (const field of section.fields) {
      const id = this.data[field.key];
      const bucket = field.optionsDataKey ?? `__options_${field.key}`;
      if (this.isHidden(field) || !field.lookup || !id || !lookupQuery(field.lookup, this.data).ready) continue;
      if (this.data['__lookupFailed_' + field.key]) continue;
      const context = JSON.stringify(lookupQuery(field.lookup, this.data));
      const records = this.data[bucket];
      if (Array.isArray(records) && records.some(record => this.isRecord(record) && String(this.resolveOptionValue(field, record)) === String(id))) continue;
      const selectedKey = `${field.key}:${id}:${JSON.stringify(lookupQuery(field.lookup, this.data))}`;
      if (this.selectedLookups.has(selectedKey)) continue;
      this.selectedLookups.add(selectedKey);
      this.pendingSelectedLookups.add(field.key);
      this.lookups.get(field.key)?.unsubscribe();
      this.lookups.set(field.key, this.source.loadLookup(field.lookup, id, this.data).subscribe({
        next: record => {
          if (String(this.data[field.key]) !== String(id) || JSON.stringify(lookupQuery(field.lookup!, this.data)) !== context) return;
          this.pendingSelectedLookups.delete(field.key);
          this.data['__display_' + field.key] = undefined;
          if (this.isRecord(record)) this.lookupLabels.set(field.key + ':' + id, this.resolveOptionLabel(field, record));
          if (this.lookupOpen !== field.key) this.data[bucket] = [record];
          this.changes.markForCheck();
        }, error: error => {
          this.selectedLookups.delete(selectedKey);
          this.pendingSelectedLookups.delete(field.key);
          if (String(this.data[field.key]) !== String(id) || JSON.stringify(lookupQuery(field.lookup!, this.data)) !== context) return;
          this.data['__lookupRestricted_' + field.key] = error?.status === 403;
          this.data['__display_' + field.key] = error?.status === 403 ? 'Restricted' : 'Unable to load selected value';
          this.changes.markForCheck();
        },
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
    if (!this.getFieldValue(field)) return ''; // A cleared ID must never reuse an old caption.
    if (this.data[`__lookupRestricted_${field.key}`]) return 'Restricted';
    return this.lookupLabels.get(field.key + ':' + this.getFieldValue(field)) ?? this.getFieldOptions(field).find(option => this.isOptionSelected(field, option.value))?.label ?? String(this.data['__display_' + field.key] ?? (this.getFieldValue(field) && this.pendingSelectedLookups.has(field.key) ? 'Loading selected value…' : ''));
  }
  openLookup(field: FieldConfig): void {
    if (this.isFieldDisabled(field)) return;
    const currentLabel = this.lookupLabel(field);
    if (currentLabel) this.lookupLabels.set(field.key + ':' + this.getFieldValue(field), currentLabel);
    this.lookupSearch?.unsubscribe();
    this.lookupOpen = field.key;
    this.lookupQuery = '';
    this.lookupActive = -1;
    this.notifyFieldInteracted(field);
    this.notifyDropdownOpened(field);
    this.searchLookup(field, '');
  }
  closeLookup(): void { this.lookupSearch?.unsubscribe(); this.lookupOpen = ''; this.lookupActive = -1; this.lookupLoading = false; }
  chooseLookup(field: FieldConfig, value: unknown): void {
    const option = this.getFieldOptions(field).find(item => String(item.value) === String(value));
    if (option) this.lookupLabels.set(field.key + ':' + value, option.label);
    this.updateFieldValue(field, value);
    this.closeLookup();
  }
  searchLookup(field: FieldConfig, text: string, nextPage = false): void {
    if (!field.lookup) return;
    const query = lookupQuery(field.lookup, this.data, text);
    if (!query.ready) { this.lookupSearch?.unsubscribe(); this.lookupLoading = false; this.lookupHasMore = false; return; }
    if (nextPage && (this.lookupLoading || !this.lookupHasMore)) return;
    this.lookupRetryNextPage = nextPage;
    if (!nextPage) { this.lookupOffset = 0; this.lookupCursor = undefined; this.lookupHasMore = false; }
    this.lookupQuery = text;
    this.lookupActive = -1;
    this.lookupLoading = true;
    this.lookupError = '';
    if (!field.lookup) return;
    this.lookupSearch?.unsubscribe();
    const bucket = field.optionsDataKey ?? `__options_${field.key}`;
    if (!nextPage) this.data[bucket] = [];
    const filter = query.filter;
    const config = { endpoint: query.endpoint!, paging: field.lookup.paging, defaultFilter: filter, pageSize: 20 };
    const options = { useCache: true, maxAgeMs: 30000, skip: this.lookupOffset, cursor: this.lookupCursor, count: false };
    const load = () => this.source.loadList(config, options);
    const cached = this.source.getCachedList?.(config, options, options.maxAgeMs) !== undefined;
    // Opening and cached reads are immediate; debounce only uncached typing.
    const request = cached || (!text.trim() && !nextPage) ? load() : timer(nextPage ? 0 : 250).pipe(switchMap(load));
    this.lookupSearch = request.subscribe({
      next: response => {
        if (lookupQuery(field.lookup!, this.data, text).filter !== query.filter || this.lookupOpen !== field.key) return;
        const page = response as { value: unknown[]; meta: Record<string, unknown> };
        this.lookupOffset += page.value.length;
        this.lookupCursor = typeof page.meta?.['nextCursor'] === 'string' ? page.meta['nextCursor'] : undefined;
        this.lookupHasMore = typeof page.meta?.['hasMore'] === 'boolean' ? page.meta['hasMore'] : field.lookup!.paging === 'cursor' ? !!this.lookupCursor : !!this.lookupCursor || (typeof page.meta?.['total'] === 'number' ? this.lookupOffset < page.meta['total'] : page.value.length === 20);
        this.data[bucket] = nextPage ? [...(Array.isArray(this.data[bucket]) ? this.data[bucket] as unknown[] : []), ...page.value] : page.value; this.lookupLoading = false; this.changes.markForCheck(); },
      error: () => { if (lookupQuery(field.lookup!, this.data, text).filter !== query.filter || this.lookupOpen !== field.key) return; this.lookupLoading = false; this.lookupError = 'Unable to load choices. Try again.'; this.changes.markForCheck(); },
    });
  }
  ngOnDestroy(): void { this.destroyed=true; this.validationRuns.clear(); this.lookupSearch?.unsubscribe(); this.lookups.forEach(subscription => subscription.unsubscribe()); }
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

  private readonly codeValidations = new Set<string>();
  private evaluatingField = false;
  validateField(fieldKey: string, value: unknown): Promise<FieldValidationResult> {
    const field = (this.dependencySections ?? this.sections).flatMap(section => section.fields).find(field => field.key === fieldKey);
    if (!field) return Promise.resolve({valid: false, errors: ['Unknown field: ' + fieldKey]});
    if (this.evaluatingField || this.codeValidations.has(fieldKey) || this.validationRuns.has(fieldKey)) {
      return Promise.resolve({valid:false,errors:['Field validation is already running. Return dependent fields from afterValidate.']});
    }
    this.codeValidations.add(fieldKey);
    try {
      return Promise.resolve(this.updateFieldValue(field, value, undefined, 'code')).finally(() => this.codeValidations.delete(fieldKey));
    } catch (error) {
      this.codeValidations.delete(fieldKey);
      throw error;
    }
  }

  private evaluateField(field: FieldConfig, value: unknown, fields: FieldConfig[], source: FieldChangeSource): FieldValidationResult {
    this.evaluatingField = true;
    try { return this.validation.validateField(field,value,this.data,true,fields,source); }
    finally { this.evaluatingField = false; }
  }

  updateFieldValue(field: FieldConfig, value: unknown, accepted?: FieldValidationResult, source: FieldChangeSource = 'user'): FieldValidationResult | Promise<FieldValidationResult> {
    if (this.isFieldDisabled(field) || this.isHidden(field)) return {valid: false, errors: [field.label + ' is not editable.']};
    value = normalizeFieldValue(value, field.valueType ?? field.type);
    const fields=(this.dependencySections ?? this.sections).flatMap(section=>section.fields);
    if (field.validation?.customAsync && !accepted) {
      const run={}, record=this.data, snapshot=JSON.stringify(record);
      const inScope=this.source.captureWriteScope?.() ?? (()=>true);
      this.validationRuns.set(field.key,run);
      this.drafts.set(field.key,value); this.errors.set(field.key,'Validating…');
      this.draftChanged.emit({fieldKey:field.key,invalid:true}); this.changes.markForCheck();
      return this.validation.validateEditorAsync(field,value,record,fields,source).then(result=>{
        if(this.destroyed || this.data!==record || this.validationRuns.get(field.key)!==run) return {valid:false,errors:['Validation was superseded.']};
        this.validationRuns.delete(field.key);
        if(!inScope() || JSON.stringify(record)!==snapshot || this.isFieldDisabled(field) || this.isHidden(field)) {
          this.errors.set(field.key,'Record changed during validation. Re-enter this value to validate again.');
          this.changes.markForCheck(); return {valid:false,errors:['Record changed during validation. Re-enter this value to validate again.']};
        }
        return this.updateFieldValue(field,value,result,source);
      });
    }
    const result = accepted ?? this.evaluateField(field,value,fields,source);
    if (!result.valid) { this.drafts.set(field.key,value); this.errors.set(field.key,result.errors[0]); this.draftChanged.emit({fieldKey:field.key,invalid:true}); this.changes.markForCheck(); return result; }
    this.drafts.delete(field.key); this.errors.delete(field.key); this.draftChanged.emit({fieldKey:field.key,invalid:false}); this.changes.markForCheck();
    const previousValue = this.data[field.key];
    if (fieldValuesEqual(previousValue, value, field.valueType ?? field.type)) return result;
    this.data[field.key] = value;
    const updates = {...this.resolveTargetUpdates(field, value), ...result.updates};
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
      this.pendingSelectedLookups.delete(key);
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
    return result;
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
    const valueFields = this.resolveFieldCandidates(field.valueField ?? field.bindValue ?? (field.lookup ? field.lookup.valueField ?? 'systemId' : undefined));
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
