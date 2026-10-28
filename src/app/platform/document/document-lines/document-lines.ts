import { CommandConfig } from '../../models/command-config.model';
import { moveQuickEntry } from '../../../shared/ui/quick-entry';
import { RUNTIME_TIMEOUT_POLICY } from '../../data/runtime-timeout-policy.token';
import { readTabularText, writeTabularText } from '../../data/tabular-text';
import { DocumentHydrationOrchestratorService } from '../../data/document-hydration-orchestrator.service';
import { ListPersonalizationService } from '../../pages/list-personalization.service';
import { FieldValidationService, FieldValidationResult } from '../field-validation.service';
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
        value: record[(column.lookup!.valueField ?? 'systemId')], label: this.resolveLookupLabel(column, record), record,
      }));
      row[bucket] = nextPage ? [...(Array.isArray(row[bucket]) ? row[bucket] as unknown[] : []), ...options] : options;
      this.lookupLoading = false;
      this.changes.markForCheck();
    }, error: () => { if (lookupQuery(column.lookup!, row, text, this.headerData).filter !== lookupFilter.filter || this.activeLookupRow !== row || this.activeLookupColumn !== column.id) return; this.lookupLoading = false; this.lookupError = 'Unable to load choices. Try again.'; this.changes.markForCheck(); } });
  }
  ngOnDestroy(): void { this.destroyed=true; this.pasteGeneration++; this.captionGeneration++; this.lookupSearch?.unsubscribe(); this.captionRequest?.unsubscribe(); }
  private static nextEditorId = 0;
  readonly editorId = 'line-editor-' + DocumentLines.nextEditorId++;
  private readonly preferences = inject(ListPersonalizationService);
  @Input() preferenceKey = '';
  private destroyed = false;
  private readonly validationRuns = new WeakMap<Record<string,unknown>,Map<string,object>>();
  private readonly invalidDrafts = new WeakMap<Record<string, unknown>, Map<string, {value: unknown; error: string}>>();
  private validateEdit(column: LineColumnConfig, row: Record<string, unknown>, value: unknown, accepted?: FieldValidationResult): FieldValidationResult | undefined {
    const key = column.field ?? column.id;
    const result = accepted ?? this.validation.validateField({...column, type: undefined, key}, value, row, true, this.columns.map(c=>({...c,type:undefined,key:c.field??c.id,disabled:this.isReadonly(c,row)})));
    const drafts = this.invalidDrafts.get(row) ?? new Map();
    const hadDraft = drafts.has(key);
    if (!result.valid) drafts.set(key, {value, error: result.errors[0]}); else drafts.delete(key);
    this.invalidDrafts.set(row, drafts);
    if (!result.valid || hadDraft) this.action.emit({actionKey:'line-draft', row, payload:{fieldKey:key, invalid:!result.valid}});
    this.changes.markForCheck();
    return result.valid ? result : undefined;
  }
  private readonly touchedFields = new WeakMap<Record<string,unknown>,Set<string>>();
  cellError(row: Record<string,unknown>,column:LineColumnConfig):string {
    const key=column.field ?? column.id;
    const draft = this.invalidDrafts.get(row)?.get(key);
    if (draft) return draft.error;
    if (!this.touchedFields.get(row)?.has(key) || this.isReadonly(column,row)) return '';
    return this.validation.validateField({key,label:column.label,valueType:column.valueType,required:column.required,requiredWhen:column.requiredWhen,validation:column.validation},row[key],row).errors[0] ?? '';
  }
  @Input() headerData: Record<string,unknown> = {};
  @Input() worksheet = false;
  @Input() disabled = false;
  @Input() columns: LineColumnConfig[] = [];
  get visibleColumns(): LineColumnConfig[] {
    const seen = new Set<string>();
    return this.columns.filter(column => {
      if (column.hidden) return false;
      const key = this.displayColumnKey(column);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
  resolveColumn(column: LineColumnConfig, row: Record<string, unknown>): LineColumnConfig {
    if (!column.displayColumn) return column;
    return this.columns.find(candidate => !candidate.hidden && candidate.displayColumn === column.displayColumn &&
      (!candidate.editableWhen || candidate.editableWhen.values.includes(row[candidate.editableWhen.field])))
      ?? { ...column, readonly: true };
  }
  private displayColumnKey(column: LineColumnConfig): string {
    return column.displayColumn ? 'group:' + column.displayColumn : 'field:' + column.id;
  }
  private displayColumnIndex(column: LineColumnConfig): number {
    return this.visibleColumns.findIndex(candidate => this.displayColumnKey(candidate) === this.displayColumnKey(column));
  }
  @Input() rows: Record<string, unknown>[] = [];
  @Input() showSelection = false;
  @Input() rowCommands: CommandConfig[] = [];
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
  rowMenuIndex = -1;
  rowMenuLeft = 0;
  rowMenuTop = 0;
  get visibleRowCommands(): CommandConfig[] { return this.rowCommands.filter(command => !command.hidden); }
  showRowMenu(event: MouseEvent, rowIndex: number): void {
    event.preventDefault(); event.stopPropagation();
    if (this.activeRowIndex !== rowIndex) this.focusedColumnIndex = 0;
    this.activateRow(rowIndex);
    this.rowMenuIndex = rowIndex;
    const box = (event.currentTarget as HTMLElement).getBoundingClientRect();
    this.changes.detectChanges();
    const menu = document.getElementById(this.editorId + '-row-menu');
    menu?.showPopover?.();
    const bounds = menu?.getBoundingClientRect();
    this.rowMenuLeft = Math.max(0, Math.min(box.right, window.innerWidth - (bounds?.width ?? 0)));
    this.rowMenuTop = Math.max(0, Math.min(box.bottom, window.innerHeight - (bounds?.height ?? 0)));
    this.changes.detectChanges();
    menu?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus();
  }
  closeRowMenu(): void {
    document.getElementById(this.editorId + '-row-menu')?.hidePopover?.();
    this.rowMenuIndex = -1;
  }
  rowCommandDisabled(command: CommandConfig): boolean {
    const copyRows = command.actionKey.replace(/^cmd:/i, '').toLowerCase() === 'line-copy-rows';
    const paste = command.actionKey.replace(/^cmd:/i, '').toLowerCase() === 'line-paste';
    return !!command.disabled || (!copyRows && this.disabled) || this.pasteLoading ||
      !this.rows[this.rowMenuIndex] || (!paste && this.rows[this.rowMenuIndex]['__entryPlaceholder'] === true);
  }
  runRowCommand(command: CommandConfig): void {
    if (this.rowCommandDisabled(command)) return;
    const rowIndex = this.rowMenuIndex;
    const indexes = this.selectedRowIndexes.has(rowIndex) ? [...this.selectedRowIndexes].sort((a,b) => a-b) : [rowIndex];
    this.closeRowMenu();
    this.clipboardMessage = '';
    const key = command.actionKey.replace(/^cmd:/i, '').toLowerCase();
    if (key === 'line-copy-rows') { void this.copySelectedRows(indexes); return; }
    if (key === 'line-paste') { void this.requestPaste(); return; }
    this.action.emit({actionKey: command.actionKey, row: this.rows[rowIndex], payload: {activeRow: this.rows[rowIndex], selectedIndexes: indexes}});
  }
  rowMenuKeydown(event: KeyboardEvent): void {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    const buttons = [...(event.currentTarget as HTMLElement).querySelectorAll<HTMLButtonElement>('button:not(:disabled)')];
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
    buttons[(index + (event.key === 'ArrowDown' ? 1 : buttons.length - 1)) % buttons.length]?.focus();
  }
  private focusedColumnIndex = 0;
  focusCell(column: LineColumnConfig, rowIndex: number): void {
    this.focusedColumnIndex = this.displayColumnIndex(column);
    if (this.activeRowIndex !== rowIndex) this.activateRow(rowIndex);
  }
  private clipboardContext(): string { return JSON.stringify(this.headerData) + ':' + this.columns.map(c=>c.id+':'+c.readonly).join('|'); }
  private clipboardColumns(start = 0): LineColumnConfig[] {
    return this.visibleColumns.slice(Math.max(0,start)).filter(column => column.cellType !== 'icon' &&
      (!column.readonly || !!column.displayColumn && this.columns.some(candidate => !candidate.hidden && !candidate.readonly && candidate.displayColumn === column.displayColumn)));
  }
  private clipboardCell(column: LineColumnConfig, row: Record<string,unknown>): unknown {
    column = this.resolveColumn(column, row);
    const field=column.field??column.id;
    if(row['__lookupRestricted_'+field] || column.editableWhen&&!column.editableWhen.values.includes(row[column.editableWhen.field]))return '';
    if(column.lookup) {
      const lookup=column.lookup;
      const option=this.getOptions(column,row).find(option=>String(option.value)===String(row[field]));
      const record=option?.record??this.source.getCachedLookup?.(lookup,row[field],row,this.headerData);
      return record?.[lookup.displayField]??row[field]??'';
    }
    return this.getCellValue(row,column);
  }
  private pasteLineLabel(target: Record<string,unknown> | undefined, pastedIndex: number, start: number): string {
    if(target&&!target['__entryPlaceholder']) {
      const column=this.columns.find(column=>(column.field??column.id)==='lineNo');
      const number=target[column?.field??column?.id??'lineNo'];
      if(number!==undefined&&number!==null&&number!=='')return (column?.label??'Line No.')+' '+String(number);
      return 'Line '+(start+pastedIndex+1);
    }
    return 'New line '+(pastedIndex+1);
  }
  async copySelectedRows(indexes?: number[]): Promise<void> {
    const rows = indexes ? indexes.map(index => this.rows[index]) : this.selectedRowIndexes.size ? [...this.selectedRowIndexes].sort((a,b)=>a-b).map(i=>this.rows[i]) : [this.rows[this.activeRowIndex]];
    const columns = this.clipboardColumns();
    const text = writeTabularText(rows.filter(row=>row && !row['__entryPlaceholder']).map(row=>columns.map(c=>this.clipboardCell(c,row))));
    if (!text) return;
    try { await navigator.clipboard.writeText(text); this.clipboardMessage='Selected rows copied.'; }
    catch { this.clipboardMessage='Clipboard unavailable. Select the grid and use Ctrl+C.'; }
    this.changes.markForCheck();
  }
  handleCopy(event: ClipboardEvent): void {
    if (this.isInteractiveTarget(event.target) || !event.clipboardData) return;
    const indexes=this.selectedRowIndexes.size?[...this.selectedRowIndexes].sort((a,b)=>a-b):[this.activeRowIndex];
    const columns=this.clipboardColumns();
    const rows=indexes.map(i=>this.rows[i]).filter(row=>row && !row['__entryPlaceholder']);
    if (!rows.length) return;
    event.clipboardData.setData('text/plain',writeTabularText(rows.map(row=>columns.map(c=>this.clipboardCell(c,row)))));
    event.preventDefault();
  }
  async requestPaste(): Promise<void> {
    if (this.disabled || this.pasteLoading) return;
    const rowIndex = Math.max(0, this.activeRowIndex), columnIndex = this.focusedColumnIndex;
    const context = this.clipboardContext();
    try {
      const text = await navigator.clipboard.readText();
      if (context !== this.clipboardContext()) throw new Error('The document changed. Paste again.');
      await this.pasteText(text, rowIndex, columnIndex);
    } catch { this.clipboardMessage='Select a line cell and paste with Ctrl+V.'; this.changes.markForCheck(); }
  }
  handlePaste(event: ClipboardEvent, column: LineColumnConfig, rowIndex = this.activeRowIndex): void {
    const text = event.clipboardData?.getData('text/plain');
    if (!text || this.disabled || this.isReadonly(column, this.rows[rowIndex] ?? {})) return;
    event.preventDefault(); event.stopPropagation();
    this.focusCell(column, rowIndex);
    void this.pasteText(text, rowIndex, this.focusedColumnIndex);
  }
  async pasteText(text: string, rowIndex = Math.max(0, this.activeRowIndex), columnIndex = this.focusedColumnIndex): Promise<void> {
    if (this.disabled || this.pasteLoading) return;
    const generation=++this.pasteGeneration, context=this.clipboardContext();
    const inScope=this.source.captureWriteScope?.() ?? (()=>true);
    const cache=new Map<string,Promise<Record<string,unknown>>>();
    const targets=this.rows.slice(rowIndex,rowIndex+100);
    const snapshots=targets.map(row=>JSON.stringify(row));
    this.pasteLoading=true; this.clipboardMessage='Checking pasted values…';
    try {
      const cells=readTabularText(text,100);
      if (!cells.length) { this.clipboardMessage=''; return; }
      const columns=this.clipboardColumns(columnIndex);
      if (cells[0].length>columns.length) throw new Error('Copied '+cells[0].length+' columns, but only '+columns.length+' fields remain from '+(columns[0]?.label??'this cell')+'. Select '+(this.clipboardColumns()[0]?.label??'the first editable field')+' to paste a whole row.');
      const used=columns.slice(0,cells[0].length);
      const errors:string[]=[], candidates:Record<string,unknown>[]=[];
      for (const [index,values] of cells.entries()) {
        if(generation!==this.pasteGeneration || context!==this.clipboardContext() || !inScope()) throw new Error('The document context changed. Paste again.');
        const target=targets[index];
        const lineLabel=this.pasteLineLabel(target,index,rowIndex);
        const row:Record<string,unknown>=target ? structuredClone(target) : {};
        if(!target || target['__entryPlaceholder']) for(const c of this.columns) if(c.defaultValue!==undefined && row[c.field??c.id]===undefined) row[c.field??c.id]=structuredClone(c.defaultValue);
        for(const [offset,declared] of used.entries()) {
          const c = this.resolveColumn(declared, row);
          const field=c.field??c.id, raw=values[offset];
          if(this.isReadonly(c,row)){if(raw.trim() && !fieldValuesEqual(row[field],normalizeFieldValue(raw,c.valueType),c.valueType) && String(this.clipboardCell(c,row))!==raw)errors.push(lineLabel+' — '+c.label+' is not editable.');continue;}
          let value:unknown=raw, selected:Record<string,unknown>|undefined;
          if(c.lookup && raw) {
            try {
              const key=JSON.stringify([lookupQuery(c.lookup,row,'',this.headerData),(c.lookup.valueField ?? 'systemId'),c.lookup.displayField,raw]);
              if(!cache.has(key))cache.set(key,this.resolvePastedLookup(c,row,raw));
              selected=await cache.get(key)!;
              value=selected[(c.lookup.valueField ?? 'systemId')];
              if(value==null || value==='')throw new Error('No identifier returned.');
              row[c.optionsDataKey??'__options_'+field]=[{value,label:this.resolveLookupLabel(c,selected),record:selected}];
            } catch {errors.push(lineLabel+' — '+c.label+' could not be uniquely verified. Use its exact code or identifier.');continue;}
          } else if(c.options?.length) {
            const option=c.options.find(option=>String(option.value)===raw || option.label.toLowerCase()===raw.toLowerCase());
            if(!option && raw)errors.push(lineLabel+' — '+c.label+': “'+raw.slice(0,60)+'” is not valid. Choose '+c.options.slice(0,4).map(option=>option.label).join(' or ')+'.');
            value=option?.value??raw;
          }
          value=normalizeFieldValue(value,c.valueType);
          const validationFields=this.columns.map(c=>({...c,type:undefined,key:c.field??c.id,disabled:this.isReadonly(c,row)}));
          const validation = c.validation?.customAsync
            ? await this.validation.validateEditorAsync({...c,type:undefined,key:field},value,row,validationFields)
            : this.validation.validateField({...c,type:undefined,key:field},value,row,true,validationFields);
          if (!validation.valid) { errors.push(...validation.errors.map(error=>lineLabel+' — '+error)); continue; }
          if(!fieldValuesEqual(row[field],value,c.valueType)) {
            this.applyCellChange(c,row,value,selected,validation.updates);
          }
        }
        for(const c of this.columns) {
          const field=c.field??c.id;if(c.readonly||c.hidden)continue;
          errors.push(...this.validation.validateField({key:field,label:c.label,valueType:c.valueType,required:c.required,requiredWhen:c.requiredWhen,validation:c.validation},row[field],row).errors.map(error=>lineLabel+' — '+error));
        }
        candidates.push(row);
      }
      if(generation!==this.pasteGeneration || context!==this.clipboardContext() || !inScope())throw new Error('The document context changed. Paste again.');
      if(this.disabled || targets.some((target,index)=>this.rows[rowIndex+index]!==target || JSON.stringify(target)!==snapshots[index])) throw new Error('The target lines changed. Paste again.');
      if(errors.length)throw new Error(errors.slice(0,5).join(' ')+(errors.length>5?' More pasted cells need correction.':''));
      for(const [index,candidate] of candidates.entries()) {
        const target=targets[index];
        if(target && !target['__entryPlaceholder'] && used.some((declared,offset) => {
          const c = this.resolveColumn(declared, candidate);
          return cells[index][offset].trim() && !fieldValuesEqual(target[c.field??c.id],candidate[c.field??c.id],c.valueType) && (c.hidden || this.isReadonly(c,candidate));
        })) throw new Error('A target field is no longer editable.');
      }
      const creates=candidates.filter((_row,index)=>!targets[index] || targets[index]['__entryPlaceholder']);
      const pasteCommand=this.rowCommands.find(command=>command.actionKey.replace(/^cmd:/i,'').toLowerCase()==='line-paste');
      if(creates.length && (pasteCommand?.disabled || pasteCommand?.hidden))throw new Error('You cannot add lines to this document.');
      // Validate the entire range before any record changes. New rows use the existing bounded create queue.
      if(creates.length)this.action.emit({actionKey:'cmd:line-paste',payload:{rows:creates}});
      for(const [index,candidate] of candidates.entries()) {
        const target=targets[index];
        if(!target || target['__entryPlaceholder'])continue;
        // A successful paste replaces an invalid editor draft, even if the accepted value is unchanged.
        for (const declared of used) {
          const c=this.resolveColumn(declared,candidate),key=c.field??c.id;
          if(this.invalidDrafts.get(target)?.delete(key)) this.action.emit({actionKey:'line-draft',row:target,payload:{fieldKey:key,invalid:false}});
        }
        const changed=this.columns.filter(c=>c.cellType!=='icon'&&!fieldValuesEqual(target[c.field??c.id],candidate[c.field??c.id],c.valueType));
        if(!changed.length)continue;
        // One row event carries the complete validated change, preserving the normal calculation and autosave path.
        const anchors=used.map(c=>this.resolveColumn(c,candidate)).filter(c=>changed.includes(c));
        const column=anchors[anchors.length-1];
        if(!column)continue;
        const field=column.field??column.id,previousValue=target[field];
        for(const c of this.columns) {
          const key=c.field??c.id;
          if(changed.includes(c))target[key]=candidate[key];
          const bucket=c.optionsDataKey??'__options_'+key;
          if(c.lookup&&candidate[bucket])target[bucket]=candidate[bucket];
        }
        this.rowChanged.emit({row:target,column,value:target[field],previousValue,rowIndex:rowIndex+index,updatedFields:changed.filter(c=>c!==column).map(c=>c.field??c.id)});
      }
      this.clipboardMessage='';
    } catch(error){if(generation===this.pasteGeneration)this.clipboardMessage=error instanceof Error?error.message:'Paste could not be read.';}
    finally{if(generation===this.pasteGeneration){this.pasteLoading=false;this.changes.markForCheck();}}
  }

  private async resolvePastedLookup(column:LineColumnConfig,row:Record<string,unknown>,raw:string):Promise<Record<string,unknown>> {
    const lookup=column.lookup!,query=lookupQuery(lookup,row,'',this.headerData);
    if(!query.ready)throw new Error('Complete lookup dependencies first.');
    const cached=this.source.getCachedLookup?.(lookup,raw,row,this.headerData);
    if(cached)return cached;
    const field=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(raw)?(lookup.valueField ?? 'systemId'):lookup.displayField;
    if(!/^[A-Za-z_]\w*$/.test(field))throw new Error('Unsupported lookup field.');
    const exact=field+" eq '"+raw.replace(/'/g,"''")+"'";
    const response=await firstValueFrom(this.source.loadList({endpoint:query.endpoint!,defaultFilter:[query.filter,exact].filter(Boolean).map(filter=>'('+filter+')').join(' and ')},{top:2,count:false,useCache:true,maxAgeMs:30000}).pipe(timeout<unknown>(this.timeoutPolicy.hydrationTimeoutMs))) as {value:Record<string,unknown>[]};
    if(response.value.length!==1 || String(response.value[0][field]).toLowerCase()!==raw.toLowerCase())throw new Error('Lookup is missing or ambiguous.');
    return response.value[0];
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
    const sourceColumn = this.resolveColumn(column, source);
    column = this.resolveColumn(column, target);
    if ((sourceColumn.field ?? sourceColumn.id) !== (column.field ?? column.id)) return;
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
    const count = this.rows.filter(row => !row['__entryPlaceholder']).length;
    return count > 0 && this.selectedRowIndexes.size === count;
  }

  isRowSelected(rowIndex: number): boolean {
    return this.selectedRowIndexes.has(rowIndex);
  }

  isActiveRow(rowIndex: number): boolean {
    return this.activeRowIndex === rowIndex;
  }

  getColumnWidthStyle(column: LineColumnConfig): string | null {
    const display = this.visibleColumns[this.displayColumnIndex(column)];
    const resized = this.columnWidths.get(display?.id ?? column.id);
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

    if (checked && !this.rows[rowIndex]['__entryPlaceholder']) {
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
      this.rows.forEach((row, index) => { if (!row['__entryPlaceholder']) this.selectedRowIndexes.add(index); });
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
    if (column.displayColumn && column.editableWhen && !column.editableWhen.values.includes(row[column.editableWhen.field])) return '';
    const draft = this.invalidDrafts.get(row)?.get(column.field ?? column.id);
    if (draft) return fieldEditorValue(draft.value, column.valueType);
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

  private applyCellChange(column: LineColumnConfig, row: Record<string, unknown>, value: unknown, selectedRecord?: Record<string, unknown>, updates: Record<string,unknown> = {}): { updatedFields: string[]; invalidated: string[] } {
    const field = column.field ?? column.id, before = { ...row };
    row[field] = normalizeFieldValue(value, column.valueType);
    for (const key of column.clearFieldsOnChange ?? []) row[key] = null;
    this.applyFill(column, row, selectedRecord);
    Object.assign(row,updates);
    const dependent = clearDependentLookups(this.columns, Object.keys(row).filter(key => !key.startsWith('__') && !Object.is(before[key], row[key])), row);
    for (const key of dependent.invalidated) delete row['__display_' + key];
    return { updatedFields: this.columns.map(column => column.field ?? column.id).filter(key => key !== field && !Object.is(before[key], row[key])), invalidated: dependent.invalidated };
  }

  updateCellValue(column: LineColumnConfig, row: Record<string, unknown>, value: unknown, allowBulk = true, accepted?: FieldValidationResult): void {
    if (this.isReadonly(column, row)) {
      return;
    }

    const field = column.field ?? column.id;
    const previousValue = row[field];
    value = normalizeFieldValue(value, column.valueType);
    if(column.validation?.customAsync && !accepted) {
      const runs=this.validationRuns.get(row)??new Map<string,object>(), run={}, snapshot=JSON.stringify(row), rows=this.rows;
      const inScope=this.source.captureWriteScope?.() ?? (()=>true);
      const headerSnapshot=JSON.stringify(this.headerData);
      runs.set(field,run);this.validationRuns.set(row,runs);
      this.validateEdit(column,row,value,{valid:false,errors:['Validating…']});
      void this.validation.validateEditorAsync({...column,type:undefined,key:field},value,row,this.columns.map(c=>({...c,type:undefined,key:c.field??c.id,disabled:this.isReadonly(c,row)}))).then(result=>{
        if(this.destroyed || runs.get(field)!==run || this.rows!==rows || !this.rows.includes(row))return;
        runs.delete(field);
        if(!inScope() || JSON.stringify(this.headerData)!==headerSnapshot || JSON.stringify(row)!==snapshot || this.isReadonly(column,row)) {
          this.validateEdit(column,row,value,{valid:false,errors:['Record changed during validation. Re-enter this value to validate again.']});return;
        }
        this.updateCellValue(column,row,value,allowBulk,result);
      });
      return;
    }
    const validation = this.validateEdit(column, row, value, accepted);
    if (!validation) return;
    if (fieldValuesEqual(previousValue, value, column.valueType)) return;
    const touched = this.touchedFields.get(row) ?? new Set<string>(); touched.add(field); this.touchedFields.set(row,touched);
    const rowIndex = this.rows.indexOf(row);
    const selectedRecord = this.resolveSelectedRecord(column, row, value);

    const { updatedFields, invalidated } = this.applyCellChange(column, row, value, selectedRecord, validation.updates);
    this.invalidateLookupRows(row, invalidated);
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
        if(column.validation?.customAsync) { this.updateCellValue(column,target,value,false); continue; }
        const targetValidation = this.validateEdit(column, target, value);
        if (!targetValidation) continue;
        bulkChanges.push({ rowIndex: index, previousValue: target[field], value });
        const change = this.applyCellChange(column, target, value, this.resolveSelectedRecord(column, target, value), targetValidation.updates);
        this.invalidateLookupRows(target, change.invalidated);
        bulkChanges[bulkChanges.length - 1].updatedFields = change.updatedFields;
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
