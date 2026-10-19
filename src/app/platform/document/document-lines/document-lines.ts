import { CommonModule } from '@angular/common';
import {
  Component,
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
import { Subscription, timer, switchMap } from 'rxjs';

type LineOption = { label: string; value: unknown; record?: Record<string, unknown> };

@Component({
  selector: 'app-document-lines',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './document-lines.html',
  styleUrl: './document-lines.scss',
})
export class DocumentLines {
  constructor(private readonly source: DataSourceService, private readonly changes: ChangeDetectorRef) {}
  private readonly lookupRequests = new Map<Record<string, unknown>, Subscription>();
  searchLookup(column: LineColumnConfig, row: Record<string, unknown>, text: string): void {
    if (!column.lookup) return;
    this.lookupRequests.get(row)?.unsubscribe();
    const query = text.trim().replace(/'/g, "''");
    const fields = column.lookup.searchFields ?? [column.lookup.displayField];
    this.lookupRequests.set(row, timer(250).pipe(switchMap(() => this.source.loadList({ endpoint: column.lookup!.endpoint, pageSize: 20,
      defaultFilter: query ? fields.map(field => `contains(${field}, '${query}')`).join(' or ') : undefined,
    }))).subscribe({ next: response => {
      row[column.optionsDataKey ?? `__options_${column.field ?? column.id}`] = (response as { value: Record<string, unknown>[] }).value.map(record => ({
        value: record[column.lookup!.valueField], label: String(record[column.lookup!.displayField] ?? ''), record,
      }));
      this.changes.markForCheck();
    }, error: () => {} }));
  }
  ngOnDestroy(): void { this.lookupRequests.forEach(request => request.unsubscribe()); }
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

    if ('rows' in changes) {
      this.reconcileRows(changes['rows'].previousValue as Record<string, unknown>[] | undefined);
      for (const row of this.rows) for (const column of this.columns) {
        const id = row[column.field ?? column.id];
        if (!column.lookup || !id) continue;
        this.lookupRequests.set(row, this.source.loadById({ endpoint: column.lookup.endpoint }, id).subscribe({
          next: value => {
            const record = value as Record<string, unknown>;
            row[column.optionsDataKey ?? `__options_${column.field ?? column.id}`] = [{ value: id, label: String(record[column.lookup!.displayField] ?? id), record }];
            this.changes.markForCheck();
          }, error: () => {},
        }));
      }
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

  getCellValue(row: Record<string, unknown>, column: LineColumnConfig): string {
    const value = row[column.field ?? column.id];
    if (this.isLineNoColumn(column) && (value === 0 || value === '0')) {
      return '';
    }

    return value === undefined || value === null ? '' : String(value);
  }

  private isLineNoColumn(column: LineColumnConfig): boolean {
    const key = String(column.field ?? column.id ?? '').trim().toLowerCase();
    return key === 'lineno' || key === 'line_no' || key === 'line no' || key === 'line no.';
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
    return value ? [{ label: value, value }] : [{ label: '', value: '' }];
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

  isReadonly(column: LineColumnConfig, row: Record<string, unknown>): boolean {
    return column.readonly === true || (!!column.editableWhen && !column.editableWhen.values.includes(row[column.editableWhen.field]));
  }

  updateCellValue(column: LineColumnConfig, row: Record<string, unknown>, value: unknown): void {
    if (this.isReadonly(column, row)) {
      return;
    }

    const field = column.field ?? column.id;
    const previousValue = row[field];
    const rowIndex = this.rows.indexOf(row);
    const selectedRecord = this.resolveSelectedRecord(column, row, value);

    row[field] = value;
    for (const key of column.clearFieldsOnChange ?? []) row[key] = null;
    this.applyFill(column, row, selectedRecord);

    const selectedIndexes = [...this.selectedRowIndexes].filter(
      (index) => index >= 0 && index < this.rows.length,
    );
    const applyBulk =
      this.enableBulkEditFromSelection &&
      this.showSelection &&
      selectedIndexes.length > 1 &&
      selectedIndexes.includes(rowIndex);

    if (applyBulk) {
      const bulkChanges: Array<{ rowIndex: number; previousValue: unknown; value: unknown }> = [];
      for (const index of selectedIndexes) {
        if (index === rowIndex) {
          continue;
        }

        const target = this.rows[index];
        if (!target) {
          continue;
        }

        bulkChanges.push({ rowIndex: index, previousValue: target[field], value });
        target[field] = value;
        this.applyFill(column, target, this.resolveSelectedRecord(column, target, value));
      }

      this.rowChanged.emit({ row, column, value, previousValue, rowIndex, bulkChanges });
      return;
    }

    this.rowChanged.emit({ row, column, value, previousValue, rowIndex });
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
    if (column.valueType === 'number') {
      const normalized = rawValue.replace(/,/g, '').trim();
      if (!normalized.length) {
        return 0;
      }

      const parsed = Number(normalized);
      return Number.isFinite(parsed) ? parsed : rawValue;
    }

    return rawValue;
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
    return `app-line-widths:${path}:${columnKey}`;
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
          this.columnWidths.set(columnId, Math.max(this.minColumnWidth, width));
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
      window.localStorage.setItem(this.getColumnSettingsStorageKey(), JSON.stringify(payload));
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
