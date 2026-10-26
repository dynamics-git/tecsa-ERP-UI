import { moveQuickEntry } from '../../../shared/ui/quick-entry';
import { RUNTIME_TIMEOUT_POLICY } from '../../data/runtime-timeout-policy.token';
import { readTabularText, writeTabularText } from '../../data/tabular-text';
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
import { Subscription, timer, switchMap, from, firstValueFrom, timeout } from 'rxjs';

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
  private readonly timeoutPolicy = inject(RUNTIME_TIMEOUT_POLICY);
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
  ngOnDestroy(): void { this.pasteGeneration++; this.captionGeneration++; this.lookupSearch?.unsubscribe(); this.captionRequest?.unsubscribe(); }
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
  @Input() disabled = false;
  @Input() columns: LineColumnConfig[] = [];
  get visibleColumns(): LineColumnConfig[] { return this.columns.filter(column=>!column.hidden); }
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

  clipboardMessage = '';
  pasteLoading = false;
  private pasteGeneration = 0;
  pastePreview?: { rows: Record<string,unknown>[]; labels: string[]; cells: string[][]; errors: string[]; context: string; inScope: () => boolean };
  private focusedColumnIndex = 0;
  focusCell(column: LineColumnConfig, rowIndex: number): void {
    this.focusedColumnIndex = this.columns.indexOf(column);
    if (this.activeRowIndex !== rowIndex) this.activateRow(rowIndex);
  }
  private clipboardContext(): string { return JSON.stringify(this.headerData) + ':' + this.columns.map(c=>c.id+':'+c.readonly).join('|'); }
  async copySelectedRows(): Promise<void> {
    const rows = this.selectedRowIndexes.size ? [...this.selectedRowIndexes].sort((a,b)=>a-b).map(i=>this.rows[i]) : [this.rows[this.activeRowIndex]];
    const columns = this.columns.filter(c=>!c.hidden && c.cellType!=='icon');
    const text = writeTabularText(rows.filter(row=>row && !row['__entryPlaceholder']).map(row=>columns.map(c=>c.lookup?this.lookupDisplay(c,row):this.getCellValue(row,c))));
    if (!text) return;
    try { await navigator.clipboard.writeText(text); this.clipboardMessage='Selected rows copied.'; }
    catch { this.clipboardMessage='Clipboard unavailable. Select the grid and use Ctrl+C.'; }
    this.changes.markForCheck();
  }
  handleCopy(event: ClipboardEvent): void {
    if (this.isInteractiveTarget(event.target) || !event.clipboardData) return;
    const indexes=this.selectedRowIndexes.size?[...this.selectedRowIndexes].sort((a,b)=>a-b):[this.activeRowIndex];
    const columns=this.columns.filter(c=>!c.hidden && c.cellType!=='icon');
    const rows=indexes.map(i=>this.rows[i]).filter(row=>row && !row['__entryPlaceholder']);
    if (!rows.length) return;
    event.clipboardData.setData('text/plain',writeTabularText(rows.map(row=>columns.map(c=>c.lookup?this.lookupDisplay(c,row):this.getCellValue(row,c)))));
    event.preventDefault();
  }
  async requestPaste(): Promise<void> {
    if (this.disabled) return;
    this.focusedColumnIndex = 0; // Toolbar paste starts at the first editable column; cell paste keeps its anchor.
    try { await this.preparePaste(await navigator.clipboard.readText()); }
    catch { this.clipboardMessage='Focus a line cell and paste with Ctrl+V.'; this.changes.markForCheck(); }
  }
  handlePaste(event: ClipboardEvent, column: LineColumnConfig): void {
    const text=event.clipboardData?.getData('text/plain');
    if (!text || this.disabled || !/[\t\r\n]/.test(text)) return; // Single-cell text paste remains native.
    event.preventDefault(); event.stopPropagation();
    this.focusedColumnIndex=this.columns.indexOf(column);
    this.preparePaste(text);
  }
  async preparePaste(text: string): Promise<void> {
    if (this.disabled || this.pasteLoading) return;
    const generation=++this.pasteGeneration, context=this.clipboardContext();
    const inScope=this.source.captureWriteScope?.() ?? (()=>true);
    const cache=new Map<string,Promise<Record<string,unknown>>>();
    this.pastePreview=undefined;this.pasteLoading=true;this.clipboardMessage='Checking pasted values…';
    try {
      const cells=readTabularText(text,20);
      if (!cells.length) return;
      const columns=this.columns.slice(Math.max(0,this.focusedColumnIndex)).filter(c=>!c.hidden && !c.readonly && c.cellType!=='icon');
      if (cells[0].length>columns.length) throw new Error('The pasted range has more columns than the editable fields. Start at the correct field.');
      const used=columns.slice(0,cells[0].length),errors:string[]=[],rows:Record<string,unknown>[]=[];
      // Work on isolated candidates; no business record changes during validation.
      for (const [index,values] of cells.entries()) {
        if(generation!==this.pasteGeneration || context!==this.clipboardContext() || !inScope()) throw new Error('The document context changed. Paste again.');
        const row:Record<string,unknown>={};
        for(const c of this.columns)if(c.defaultValue!==undefined)row[c.field??c.id]=structuredClone(c.defaultValue);
        for(const [columnIndex,c] of used.entries()) {
          const field=c.field??c.id,raw=values[columnIndex];
          if(this.isReadonly(c,row)){if(raw.trim())errors.push('Row '+(index+1)+': '+c.label+' is not editable.');continue;}
          let value:unknown=raw;
          if(c.lookup && raw) {
            try {
              const query=lookupQuery(c.lookup,row,'',this.headerData);
              const key=JSON.stringify([query,c.lookup.valueField,c.lookup.displayField,raw]);
              if(!cache.has(key))cache.set(key,this.resolvePastedLookup(c,row,raw));
              const selected=await cache.get(key)!;
              value=selected[c.lookup.valueField];
              if(value==null || value==='')throw new Error('No identifier returned.');
              row[c.optionsDataKey??'__options_'+field]=[{value,label:this.resolveLookupLabel(c,selected),record:selected}];
              this.applyFill(c,row,selected);
            } catch {errors.push('Row '+(index+1)+': '+c.label+' could not be uniquely verified. Use its exact code or identifier.');continue;}
          } else if(c.options?.length) {
            const option=c.options.find(option=>String(option.value)===raw || option.label.toLowerCase()===raw.toLowerCase());
            if(!option && raw)errors.push('Row '+(index+1)+': invalid '+c.label+'.');
            value=option?.value??raw;
          }
          row[field]=normalizeFieldValue(value,c.valueType);
        }
        for(const c of this.columns) {
          const field=c.field??c.id;if(c.readonly || c.hidden)continue;
          errors.push(...this.validation.validateField({key:field,label:c.label,valueType:c.valueType,required:c.required,requiredWhen:c.requiredWhen,validation:c.validation},row[field],row).errors.map(error=>'Row '+(index+1)+': '+error));
        }
        rows.push(row);
      }
      if(generation!==this.pasteGeneration || context!==this.clipboardContext() || !inScope())throw new Error('The document context changed. Paste again.');
      this.pastePreview={rows,labels:used.map(c=>c.label),cells,errors,context,inScope};this.clipboardMessage='';
    } catch(error){if(generation===this.pasteGeneration)this.clipboardMessage=error instanceof Error?error.message:'Paste could not be read.';}
    finally{if(generation===this.pasteGeneration){this.pasteLoading=false;this.changes.markForCheck();}}
  }

  private async resolvePastedLookup(column:LineColumnConfig,row:Record<string,unknown>,raw:string):Promise<Record<string,unknown>> {
    const lookup=column.lookup!,query=lookupQuery(lookup,row,'',this.headerData);
    if(!query.ready)throw new Error('Complete lookup dependencies first.');
    const cached=this.source.getCachedLookup?.(lookup,raw,row,this.headerData);
    if(cached)return cached;
    const field=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(raw)?lookup.valueField:lookup.displayField;
    if(!/^[A-Za-z_]\w*$/.test(field))throw new Error('Unsupported lookup field.');
    const exact=field+" eq '"+raw.replace(/'/g,"''")+"'";
    const response=await firstValueFrom(this.source.loadList({endpoint:query.endpoint!,defaultFilter:[query.filter,exact].filter(Boolean).map(filter=>'('+filter+')').join(' and ')},{top:2,count:false,useCache:true,maxAgeMs:30000}).pipe(timeout<unknown>(this.timeoutPolicy.hydrationTimeoutMs))) as {value:Record<string,unknown>[]};
    if(response.value.length!==1 || String(response.value[0][field]).toLowerCase()!==raw.toLowerCase())throw new Error('Lookup is missing or ambiguous.');
    return response.value[0];
  }

  applyPaste(): void {
    const preview=this.pastePreview;
    if (!preview || preview.errors.length || this.disabled || this.pasteLoading) return;
    if (preview.context!==this.clipboardContext() || !preview.inScope()) { this.pastePreview=undefined;this.clipboardMessage='The document changed. Paste again to revalidate.';return; }
    this.pastePreview=undefined;
    this.action.emit({actionKey:'cmd:line-paste',payload:{rows:preview.rows}});
  }

  handleCellKeydown(event: KeyboardEvent, column: LineColumnConfig, row: Record<string,unknown>, rowIndex: number): void {
    moveQuickEntry(event);
    if (event.key === 'F8' && !event.altKey && !event.ctrlKey && !event.metaKey) {
      event.preventDefault(); event.stopPropagation();
      const previous = this.rows[rowIndex - 1];
      if (previous && !previous['__entryPlaceholder']) this.copyCell(column, previous, row);
    } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'd' && this.selectedRowIndexes.size > 1) {
      event.preventDefault(); event.stopPropagation();
      const indexes = [...this.selectedRowIndexes].sort((a,b)=>a-b);
      const source = this.rows[indexes[0]];
      if (!source || source['__entryPlaceholder']) return;
      for (const index of indexes.slice(1)) this.copyCell(column,source,this.rows[index]);
    }
  }

  private copyCell(column: LineColumnConfig, source: Record<string,unknown>, target: Record<string,unknown>): void {
    const field = column.field ?? column.id;
    if (column.hidden || column.cellType === 'icon' || this.isReadonly(column,target) || source['__lookupRestricted_'+field]) return;
    if (column.lookup) {
      // Lookup IDs may only be reused within the same declared dependency context.
      if (JSON.stringify(lookupQuery(column.lookup,source,'',this.headerData)) !== JSON.stringify(lookupQuery(column.lookup,target,'',this.headerData))) return;
      const option = this.getOptions(column,source).find(option=>String(option.value)===String(source[field]));
      if (option) target[column.optionsDataKey ?? '__options_'+field] = [option];
    }
    this.updateCellValue(column,target,structuredClone(source[field]),false);
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
    return this.disabled || row[`__lookupRestricted_${column.field ?? column.id}`] === true || fieldIsReadonly(column, row) || (!!column.editableWhen && !column.editableWhen.values.includes(row[column.editableWhen.field])) || (!!column.lookup && !lookupQuery(column.lookup, row, '', this.headerData).ready);
  }

  updateCellValue(column: LineColumnConfig, row: Record<string, unknown>, value: unknown, allowBulk = true): void {
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
      allowBulk && this.enableBulkEditFromSelection &&
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

        if (this.isReadonly(column,target) || fieldValuesEqual(target[field], value, column.valueType)) continue;
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
