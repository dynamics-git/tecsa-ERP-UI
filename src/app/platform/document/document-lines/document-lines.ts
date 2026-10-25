import { DocumentHydrationOrchestratorService } from '../../data/document-hydration-orchestrator.service';
import { ListPersonalizationService } from '../../pages/list-personalization.service';
import { FieldValidationService } from '../field-validation.service';
import { fieldIsRequired, fieldIsReadonly } from '../../models/field-state';
import { lookupQuery, clearDependentLookups } from '../../data/lookup-dependencies';
import { resolveLookupIdentity } from '../../data/record-identity';
import { LookupSelect } from '../../../shared/ui/lookup-select/lookup-select';
import { normalizeFieldValue, fieldValuesEqual , fieldInputType, fieldEditorValue } from '../../models/field-value';
import { CommonModule } from '@angular/common';
import {
  Component,
  inject,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ChangeDetectorRef,
} from '@angular/core';
import { LineColumnConfig } from '../../models/line-config.model';
import { DataSourceService } from '../../data/data-source.service';
import { Subscription, timer, switchMap, from } from 'rxjs';

type LineOption = { label: string; value: unknown; record?: Record<string, unknown> };

@Component({
  selector: 'app-document-lines',
  standalone: true,
  imports: [CommonModule, LookupSelect],
  templateUrl: './document-lines.html',
  styleUrl: './document-lines.scss',
})
export class DocumentLines {
  constructor(private readonly source: DataSourceService, private readonly changes: ChangeDetectorRef, private readonly validation: FieldValidationService) {}
  private readonly hydration = inject(DocumentHydrationOrchestratorService);
  private captionRequest?: Subscription;
  private captionGeneration = 0;
  private lookupSearch?: Subscription;
  private readonly selectedLookupLabels = new WeakMap<Record<string, unknown>, Map<string, string>>();
  lookupLoading = false;
  lookupError = '';
  lookupHasMore = false;
  lookupRetryNextPage = false;
  lookupQuery = '';
  private lookupOffset = 0;
  private lookupCursor?: string;
  activeLookupRow?: Record<string, unknown>;
  activeLookupColumn = '';
  lookupDisplay(column: LineColumnConfig, row: Record<string, unknown>): string {
    if (!this.getCellValue(row, column)) return ''; // A cleared ID must never reuse an old caption.
    if (row['__lookupRestricted_' + (column.field ?? column.id)]) return 'Restricted';
    return this.getOptions(column, row).find(option => String(option.value) === this.getCellValue(row, column))?.label ?? this.selectedLookupLabels.get(row)?.get(column.id + ':' + this.getCellValue(row, column)) ?? (column.lookup ? String(row['__display_' + (column.field ?? column.id)] ?? '') : this.getCellValue(row, column));
  }
  searchLookup(column: LineColumnConfig, row: Record<string, unknown>, text: string, nextPage = false): void {
    if (!column.lookup || this.isReadonly(column, row)) return;
    const lookupFilter = lookupQuery(column.lookup, row, text, this.headerData);
    if (!lookupFilter.ready) { this.lookupLoading = false; this.lookupHasMore = false; return; }
    if (nextPage && (this.lookupLoading || !this.lookupHasMore)) return;
    this.lookupRetryNextPage = nextPage;
    if (!nextPage) { this.lookupOffset = 0; this.lookupCursor = undefined; this.lookupHasMore = false; }
    this.lookupQuery = text;
    if (!column.lookup) return;
    const label = this.lookupDisplay(column, row);
    if (label) {
      const labels = this.selectedLookupLabels.get(row) ?? new Map<string, string>();
      labels.set(column.id + ':' + this.getCellValue(row, column), label);
      this.selectedLookupLabels.set(row, labels);
    }
    this.lookupSearch?.unsubscribe();
    this.activeLookupRow = row;
    this.activeLookupColumn = column.id;
    this.lookupLoading = true;
    this.lookupError = '';
    const bucket = column.optionsDataKey ?? `__options_${column.field ?? column.id}`;
    if (!nextPage) row[bucket] = [];

    const config = { endpoint: lookupFilter.endpoint!, paging: column.lookup.paging, pageSize: 20, defaultFilter: lookupFilter.filter };
    const options = { useCache: true, maxAgeMs: 30000, skip: this.lookupOffset, cursor: this.lookupCursor, count: false };
    const load = () => this.source.loadList(config, options);
    const cached = this.source.getCachedList?.(config, options, options.maxAgeMs) !== undefined;
    const request = cached || (!text.trim() && !nextPage) ? load() : timer(nextPage ? 0 : 250).pipe(switchMap(load));
    this.lookupSearch = request.subscribe({ next: response => {
      if (lookupQuery(column.lookup!, row, text, this.headerData).filter !== lookupFilter.filter || this.activeLookupRow !== row || this.activeLookupColumn !== column.id) return;
      const page = response as { value: Record<string, unknown>[]; meta: Record<string, unknown> };
      this.lookupOffset += page.value.length;
      this.lookupCursor = typeof page.meta?.['nextCursor'] === 'string' ? page.meta['nextCursor'] : undefined;
      this.lookupHasMore = typeof page.meta?.['hasMore'] === 'boolean' ? page.meta['hasMore'] : column.lookup!.paging === 'cursor' ? !!this.lookupCursor : !!this.lookupCursor || (typeof page.meta?.['total'] === 'number' ? this.lookupOffset < page.meta['total'] : page.value.length === 20);
      const options = page.value.map(record => ({
        value: record[column.lookup!.valueField], label: this.resolveLookupLabel(column, record), record,
      }));
      row[bucket] = nextPage ? [...(Array.isArray(row[bucket]) ? row[bucket] as unknown[] : []), ...options] : options;
      this.lookupLoading = false;
      this.changes.markForCheck();
    }, error: () => { if (lookupQuery(column.lookup!, row, text, this.headerData).filter !== lookupFilter.filter || this.activeLookupRow !== row || this.activeLookupColumn !== column.id) return; this.lookupLoading = false; this.lookupError = 'Unable to load choices. Try again.'; this.changes.markForCheck(); } });
  }
  ngOnDestroy(): void { this.captionGeneration++; this.lookupSearch?.unsubscribe(); this.captionRequest?.unsubscribe(); }
  private static nextEditorId = 0;
  readonly editorId = 'line-editor-' + DocumentLines.nextEditorId++;
  private readonly preferences = inject(ListPersonalizationService);
  @Input() preferenceKey = '';
  private readonly touchedFields = new WeakMap<Record<string,unknown>,Set<string>>();
  cellError(row: Record<string,unknown>,column:LineColumnConfig):string {
    const key=column.field ?? column.id;
    if (!this.touchedFields.get(row)?.has(key) || this.isReadonly(column,row)) return '';
    return this.validation.validateField({key,label:column.label,valueType:column.valueType,required:column.required,requiredWhen:column.requiredWhen,validation:column.validation},row[key],row).errors[0] ?? '';
  }
  @Input() headerData: Record<string,unknown> = {};
  @Input() worksheet = false;
  @Input() columns: LineColumnConfig[] = [];
  @Input() rows: Record<string, unknown>[] = [];
  @Input() showSelection = false;
  @Input() enableColumnResize = true;
  @Input() enableBulkEditFromSelection = false;
  @Output() action = new EventEmitter<{
    actionKey: string;
    row?: Record<string, unknown>;
    payload?: unknown;
  }>();
  @Output() rowChanged = new EventEmitter<{
    row: Record<string, unknown>;
    column: LineColumnConfig;
    value: unknown;
    previousValue?: unknown;
    rowIndex?: number;
    updatedFields?: string[];
    bulkChanges?: Array<{ rowIndex: number; previousValue: unknown; value: unknown }>;
  }>();
  @Output() dropdownOpened = new EventEmitter<{
    row: Record<string, unknown>;
    column: LineColumnConfig;
    rowIndex: number;
  }>();
  @Output() selectionChanged = new EventEmitter<{
    activeRow?: Record<string, unknown>;
    selectedRows: Record<string, unknown>[];
    selectedIndexes: number[];
  }>();

  activeRowIndex = -1;
  private readonly selectedRowIndexes = new Set<number>();
  private readonly columnWidths = new Map<string, number>();
  private resizing?: { columnId: string; startX: number; startWidth: number };
  private readonly minColumnWidth = 72;
  private rangeAnchorIndex = -1;

  ngOnChanges(changes: SimpleChanges): void {
    if ('columns' in changes) {
      this.loadPersistedColumnWidths();
    }

    if ('rows' in changes || 'headerData' in changes || 'columns' in changes) {
      const generation = ++this.captionGeneration;
      this.captionRequest?.unsubscribe();
      this.lookupSearch?.unsubscribe(); this.lookupLoading = false;
      for (const row of this.rows) if ('headerData' in changes) this.selectedLookupLabels.delete(row);
      this.reconcileRows(changes['rows']?.previousValue as Record<string, unknown>[] | undefined);
      // The shared hydrator batches distinct selected IDs (40 per request, six requests at a time).
      // Caption work is independent of document readiness and choice search subscriptions.
      const rows = this.rows;
      const columns = this.columns.filter(column => column.lookup);
      // A fresh selected master is already usable; do not wait for an async hydration cycle.
      for (const row of rows) for (const column of columns) {
        const id = row[column.field ?? column.id];
        const selected = this.source.getCachedLookup?.(column.lookup!, id, row, this.headerData);
        if (selected) row[column.optionsDataKey ?? '__options_' + (column.field ?? column.id)] = [
          { value: id, label: this.resolveLookupLabel(column, selected), record: selected },
        ];
      }
      const snapshots = rows.map(row => columns.map(column => ({
        id: row[column.field ?? column.id],
        context: JSON.stringify(lookupQuery(column.lookup!, row, '', this.headerData)),
      })));
      this.captionRequest = from(this.hydration.resolveLineLookups(rows, columns, this.headerData, () => this.captionGeneration === generation)).subscribe({
        next: resolved => {
          if (this.rows !== rows) return;
          rows.forEach((row, index) => columns.forEach((column, columnIndex) => {
            const key = column.field ?? column.id;
            const snapshot = snapshots[index][columnIndex];
            if (row[key] !== snapshot.id || JSON.stringify(lookupQuery(column.lookup!, row, '', this.headerData)) !== snapshot.context) return;
            const bucket = column.optionsDataKey ?? '__options_' + key;
            const options = resolved[index][bucket] as LineOption[] | undefined;
            const labels = this.selectedLookupLabels.get(row) ?? new Map<string, string>();
            const selected = options?.find(option => String(option.value) === String(row[key]));
            if (selected) labels.set(column.id + ':' + row[key], selected.label);
            else labels.delete(column.id + ':' + row[key]);
            this.selectedLookupLabels.set(row, labels);
            if (this.activeLookupRow !== row || this.activeLookupColumn !== column.id) row[bucket] = options ?? [];
            row['__display_' + key] = resolved[index]['__display_' + key];
            row['__lookupRestricted_' + key] = resolved[index]['__lookupRestricted_' + key];
          }));
          this.changes.markForCheck();
        },
        error: () => { this.changes.markForCheck(); },
      });
    }
  }

  @HostListener('document:mousemove', ['$event'])
  handleDocumentMouseMove(event: MouseEvent): void {
    if (!this.resizing) {
      return;
    }

    const delta = event.clientX - this.resizing.startX;
    const nextWidth = Math.max(this.minColumnWidth, this.resizing.startWidth + delta);
    this.columnWidths.set(this.resizing.columnId, nextWidth);
  }

  @HostListener('document:mouseup')
  handleDocumentMouseUp(): void {
    if (!this.resizing) {
      return;
    }

    this.resizing = undefined;
    this.persistColumnWidths();
  }

  handleGridKeydown(event: KeyboardEvent): void {
    if (!this.rows.length || this.isInteractiveTarget(event.target)) {
      return;
    }

    if (event.ctrlKey && (event.key === 'a' || event.key === 'A')) {
      event.preventDefault();
      this.toggleAllRowsSelection(true);
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      const nextIndex = Math.min(this.activeRowIndex + 1, this.rows.length - 1);
      this.activateRow(nextIndex);
      if (event.shiftKey && this.showSelection) {
        this.selectRange(nextIndex);
      }
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      const nextIndex = Math.max(this.activeRowIndex - 1, 0);
      this.activateRow(nextIndex);
      if (event.shiftKey && this.showSelection) {
        this.selectRange(nextIndex);
      }
      return;
    }

    if (event.key === ' ' || event.code === 'Space') {
      event.preventDefault();
      if (this.activeRowIndex >= 0) {
        this.toggleRowSelection(this.activeRowIndex, !this.isRowSelected(this.activeRowIndex));
      }
      return;
    }

    if (event.key === 'Delete') {
      event.preventDefault();
      this.requestLineDelete();
    }
  }

  get allRowsSelected(): boolean {
    return this.rows.length > 0 && this.selectedRowIndexes.size === this.rows.length;
  }

  isRowSelected(rowIndex: number): boolean {
    return this.selectedRowIndexes.has(rowIndex);
  }

  isActiveRow(rowIndex: number): boolean {
    return this.activeRowIndex === rowIndex;
  }

  getColumnWidthStyle(column: LineColumnConfig): string | null {
    const resized = this.columnWidths.get(column.id);
    if (typeof resized === 'number') {
      return `${resized}px`;
    }

    return column.width ?? null;
  }

  activateRow(rowIndex: number): void {
    if (rowIndex < 0 || rowIndex >= this.rows.length) {
      return;
    }

    this.activeRowIndex = rowIndex;
    this.rangeAnchorIndex = rowIndex;
    this.emitSelectionChanged();
  }

  toggleRowSelection(rowIndex: number, checked: boolean): void {
    if (rowIndex < 0 || rowIndex >= this.rows.length) {
      return;
    }

    if (checked) {
      this.selectedRowIndexes.add(rowIndex);
      if (this.activeRowIndex < 0) {
        this.activeRowIndex = rowIndex;
      }
      this.rangeAnchorIndex = rowIndex;
    } else {
      this.selectedRowIndexes.delete(rowIndex);
    }

    this.emitSelectionChanged();
  }

  toggleAllRowsSelection(checked: boolean): void {
    this.selectedRowIndexes.clear();
    if (checked) {
      this.rows.forEach((_row, index) => this.selectedRowIndexes.add(index));
      if (this.activeRowIndex < 0 && this.rows.length) {
        this.activeRowIndex = 0;
      }
      this.rangeAnchorIndex = this.activeRowIndex;
    }

    this.emitSelectionChanged();
  }

  startResize(event: MouseEvent, column: LineColumnConfig, headerCell: HTMLElement): void {
    if (!this.enableColumnResize) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    const currentWidth =
      this.columnWidths.get(column.id) ?? headerCell.getBoundingClientRect().width;
    this.resizing = {
      columnId: column.id,
      startX: event.clientX,
      startWidth: Math.max(this.minColumnWidth, currentWidth),
    };
  }

  inputType(column: LineColumnConfig): string { return fieldInputType(column.valueType); }

  getCellValue(row: Record<string, unknown>, column: LineColumnConfig): string {
    // Filler rows are empty entry space, not records with default values.
    // Keep defaults in the draft so they become visible when entry actually starts.
    if (row['__entryPlaceholder'] === true) return '';
    const value = row[column.field ?? column.id];
    if (this.isLineNoColumn(column) && (value === 0 || value === '0')) {
      return '';
    }

    return fieldEditorValue(value, column.valueType);
  }

  private isLineNoColumn(column: LineColumnConfig): boolean {
    const key = String(column.field ?? column.id ?? '').trim().toLowerCase();
    return key === 'lineno' || key === 'line_no' || key === 'line no' || key === 'line no.';
  }

  private resolveLookupLabel(column: LineColumnConfig, record: Record<string, unknown>): string {
    if (column.displayFormat) return column.displayFormat.replace(/\[([^\]]+)\]/g, (_match, key: string) => String(record[key] ?? ''));
    const fields = Array.isArray(column.labelField) ? column.labelField : column.labelField ? [column.labelField] : [];
    for (const field of fields) if (record[field] !== null && record[field] !== undefined) return String(record[field]);
    return column.lookup ? resolveLookupIdentity(record, column.lookup) : '';
  }

  getOptions(column: LineColumnConfig, row: Record<string, unknown>): LineOption[] {
    const optionKeys = [column.optionsDataKey, `__options_${column.field ?? column.id}`].filter(
      (key): key is string => typeof key === 'string' && key.trim().length > 0,
    );

    for (const optionKey of optionKeys) {
      const rowOptions = row[optionKey];
      if (Array.isArray(rowOptions) && rowOptions.length) {
        return rowOptions
          .filter(
            (option): option is LineOption =>
              typeof option === 'object' &&
              option !== null &&
              'label' in option &&
              'value' in option,
          )
          .map((option) => ({
            label: String(option.label),
            value: option.value,
            record:
              typeof option.record === 'object' && option.record !== null
                ? option.record
                : undefined,
          }));
      }
    }

    if (column.options?.length) {
      return column.options;
    }

    const value = this.getCellValue(row, column);
    return value && !column.lookup ? [{ label: value, value }] : [];
  }

  isOptionSelected(
    column: LineColumnConfig,
    row: Record<string, unknown>,
    optionValue: unknown,
  ): boolean {
    return String(optionValue) === this.getCellValue(row, column);
  }

  showEmptyOption(column: LineColumnConfig, row: Record<string, unknown>): boolean {
    return this.getCellValue(row, column).trim().length === 0;
  }

  runAction(column: LineColumnConfig, row: Record<string, unknown>, rowIndex: number): void {
    if (!column.actionKey) {
      return;
    }

    this.action.emit({
      actionKey: column.actionKey,
      row,
      payload: {
        rowIndex,
      },
    });
  }

  notifyDropdownOpened(column: LineColumnConfig, row: Record<string, unknown>, rowIndex: number): void {
    if (column.readonly) {
      return;
    }

    this.dropdownOpened.emit({ row, column, rowIndex });
  }

  isRequired(column: LineColumnConfig, row: Record<string,unknown>): boolean { return fieldIsRequired(column,row); }

  isReadonly(column: LineColumnConfig, row: Record<string, unknown>): boolean {
    return row[`__lookupRestricted_${column.field ?? column.id}`] === true || fieldIsReadonly(column, row) || (!!column.editableWhen && !column.editableWhen.values.includes(row[column.editableWhen.field])) || (!!column.lookup && !lookupQuery(column.lookup, row, '', this.headerData).ready);
  }

  updateCellValue(column: LineColumnConfig, row: Record<string, unknown>, value: unknown): void {
    if (this.isReadonly(column, row)) {
      return;
    }

    const field = column.field ?? column.id;
    const previousValue = row[field];
    value = normalizeFieldValue(value, column.valueType);
    if (fieldValuesEqual(previousValue, value, column.valueType)) return;
    const touched = this.touchedFields.get(row) ?? new Set<string>(); touched.add(field); this.touchedFields.set(row,touched);
    const rowIndex = this.rows.indexOf(row);
    const selectedRecord = this.resolveSelectedRecord(column, row, value);

    const before = { ...row };
    row[field] = value;
    for (const key of column.clearFieldsOnChange ?? []) row[key] = null;
    this.applyFill(column, row, selectedRecord);

    const dependent = clearDependentLookups(this.columns, Object.keys(row).filter(key => !key.startsWith('__') && !Object.is(before[key], row[key])), row);
    this.invalidateLookupRows(row, dependent.invalidated);
    const updatedFields = this.columns.map(column => column.field ?? column.id).filter(key => key !== field && !Object.is(before[key], row[key]));
    const selectedIndexes = [...this.selectedRowIndexes].filter(
      (index) => index >= 0 && index < this.rows.length,
    );
    const applyBulk =
      this.enableBulkEditFromSelection &&
      this.showSelection &&
      selectedIndexes.length > 1 &&
      selectedIndexes.includes(rowIndex);

    if (applyBulk) {
      const bulkChanges: Array<{ rowIndex: number; previousValue: unknown; value: unknown; updatedFields?: string[] }> = [];
      for (const index of selectedIndexes) {
        if (index === rowIndex) {
          continue;
        }

        const target = this.rows[index];
        if (!target) {
          continue;
        }

        if (fieldValuesEqual(target[field], value, column.valueType)) continue;
        bulkChanges.push({ rowIndex: index, previousValue: target[field], value });
        const targetBefore = { ...target };
        target[field] = value;
        for (const key of column.clearFieldsOnChange ?? []) target[key] = null;
        this.applyFill(column, target, this.resolveSelectedRecord(column, target, value));
        const dependent = clearDependentLookups(this.columns, Object.keys(target).filter(key => !key.startsWith('__') && !Object.is(targetBefore[key], target[key])), target);
        this.invalidateLookupRows(target, dependent.invalidated);
        const change = bulkChanges[bulkChanges.length - 1];
        change.updatedFields = this.columns.map(column => column.field ?? column.id).filter(key => key !== field && !Object.is(targetBefore[key], target[key]));
      }

      // Each changed row must pass through the same calculations and persistence path.
      for (const change of bulkChanges) {
        this.rowChanged.emit({ row: this.rows[change.rowIndex], column, ...change });
      }
      this.rowChanged.emit({ row, column, value, previousValue, rowIndex, updatedFields });
      return;
    }

    this.rowChanged.emit({ row, column, value, previousValue, rowIndex, updatedFields });
  }

  private invalidateLookupRows(row: Record<string, unknown>, fields: string[]): void {
    if (!fields.length) return;
    this.selectedLookupLabels.delete(row);
    if (this.activeLookupRow === row && fields.some(field => this.columns.find(column => (column.field ?? column.id) === field)?.id === this.activeLookupColumn)) {
      this.lookupSearch?.unsubscribe(); this.activeLookupRow = undefined; this.activeLookupColumn = ''; this.lookupLoading = false; this.lookupHasMore = false;
    }
  }

  resolveSelectValue(
    column: LineColumnConfig,
    row: Record<string, unknown>,
    rawValue: string,
  ): unknown {
    const options = this.getOptions(column, row);
    const matched = options.find((option) => String(option.value) === rawValue);
    if (matched) {
      return matched.value;
    }

    return this.coerceCellValue(column, rawValue);
  }

  private resolveSelectedRecord(
    column: LineColumnConfig,
    row: Record<string, unknown>,
    value: unknown,
  ): Record<string, unknown> | undefined {
    const option = this.getOptions(column, row).find(
      (candidate) => String(candidate.value) === String(value),
    );
    return option?.record;
  }

  private applyFill(
    column: LineColumnConfig,
    row: Record<string, unknown>,
    source: Record<string, unknown> | undefined,
  ): void {
    if (!source || !column.fill) {
      return;
    }

    for (const [targetField, sourceFields] of Object.entries(column.fill)) {
      const value = this.readFirstSourceValue(source, sourceFields);
      if (value !== undefined) {
        row[targetField] = value;
      }
    }
  }

  private readFirstSourceValue(
    source: Record<string, unknown>,
    fields: string | string[],
  ): unknown {
    const candidates = Array.isArray(fields) ? fields : [fields];
    for (const field of candidates) {
      const value = source[field];
      if (value !== null && value !== undefined && String(value).length) {
        return value;
      }
    }

    return undefined;
  }

  coerceCellValue(column: LineColumnConfig, rawValue: string): unknown {
    return normalizeFieldValue(rawValue, column.valueType);
  }

  private reconcileRows(previousRows?: Record<string, unknown>[]): void {
    if (!this.rows.length) {
      this.activeRowIndex = -1;
      this.selectedRowIndexes.clear();
      this.emitSelectionChanged();
      return;
    }

    const previousActiveRow =
      Array.isArray(previousRows) && this.activeRowIndex >= 0
        ? previousRows[this.activeRowIndex]
        : undefined;
    const previousSelectedRows = Array.isArray(previousRows)
      ? [...this.selectedRowIndexes]
          .map((index) => previousRows[index])
          .filter((row): row is Record<string, unknown> => !!row)
      : [];

    if (this.activeRowIndex < 0 || this.activeRowIndex >= this.rows.length) {
      this.activeRowIndex = 0;
    }

    if (previousActiveRow) {
      const nextActiveIndex = this.rows.indexOf(previousActiveRow);
      this.activeRowIndex =
        nextActiveIndex >= 0
          ? nextActiveIndex
          : Math.min(this.activeRowIndex, this.rows.length - 1);
    }

    const validIndexes = previousSelectedRows.length
      ? previousSelectedRows.map((row) => this.rows.indexOf(row)).filter((index) => index >= 0)
      : [...this.selectedRowIndexes].filter((index) => index >= 0 && index < this.rows.length);
    this.selectedRowIndexes.clear();
    validIndexes.forEach((index) => this.selectedRowIndexes.add(index));
    this.emitSelectionChanged();
  }

  private requestLineDelete(): void {
    if (this.activeRowIndex < 0 || !this.rows.length) {
      return;
    }

    const selectedIndexes = [...this.selectedRowIndexes].sort((a, b) => a - b);
    this.action.emit({
      actionKey: 'cmd:line-delete',
      row: this.rows[this.activeRowIndex],
      payload: {
        rowIndex: this.activeRowIndex,
        selectedIndexes,
      },
    });
  }

  private isInteractiveTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) {
      return false;
    }

    return !!target.closest('input, select, textarea, button');
  }

  private getColumnSettingsStorageKey(): string {
    const path = typeof window !== 'undefined' ? window.location.pathname : 'workspace';
    const columnKey = this.columns.map((column) => column.id).join('|') || 'none';
    return `line-grid:${this.preferenceKey || path}:${columnKey}`;
  }

  private loadPersistedColumnWidths(): void {
    this.columnWidths.clear();
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const raw = window.localStorage.getItem(this.getColumnSettingsStorageKey());
      if (!raw) {
        return;
      }

      const parsed = JSON.parse(raw) as Record<string, number>;
      for (const [columnId, width] of Object.entries(parsed)) {
        if (Number.isFinite(width) && width > 0) {
          this.columnWidths.set(columnId, Math.min(800, Math.max(this.minColumnWidth, width)));
        }
      }
    } catch {
      // Ignore malformed local settings and fall back to config widths.
    }
  }

  private persistColumnWidths(): void {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const payload: Record<string, number> = {};
      this.columnWidths.forEach((width, columnId) => {
        payload[columnId] = width;
      });
      this.preferences.write(this.getColumnSettingsStorageKey(),'widths',payload);
    } catch {
      // Ignore storage errors so resizing still works in-memory.
    }
  }

  private emitSelectionChanged(): void {
    const selectedIndexes = [...this.selectedRowIndexes].sort((a, b) => a - b);
    this.selectionChanged.emit({
      activeRow: this.rows[this.activeRowIndex],
      selectedRows: selectedIndexes
        .map((index) => this.rows[index])
        .filter((row): row is Record<string, unknown> => !!row),
      selectedIndexes,
    });
  }

  private selectRange(toIndex: number): void {
    if (toIndex < 0 || toIndex >= this.rows.length) {
      return;
    }

    const anchor = this.rangeAnchorIndex >= 0 ? this.rangeAnchorIndex : this.activeRowIndex;
    if (anchor < 0) {
      return;
    }

    const [start, end] = anchor <= toIndex ? [anchor, toIndex] : [toIndex, anchor];
    this.selectedRowIndexes.clear();
    for (let index = start; index <= end; index += 1) {
      this.selectedRowIndexes.add(index);
    }
    this.emitSelectionChanged();
  }
}
