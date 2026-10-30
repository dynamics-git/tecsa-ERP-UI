import { ColumnReorder, ColumnReorderEvent } from '../../../shared/directives/column-reorder.directive';
import { ColumnResize } from '../../../shared/directives/column-resize.directive';
import { writeTabularText } from '../../data/tabular-text';
import { RunModalService } from '../../run-modal/run-modal.service';
import { FactBoxHostService } from '../../../shared/ui/fact-box-toggle/fact-box-host.service';
import { FactBoxToggle } from '../../../shared/ui/fact-box-toggle/fact-box-toggle';
import { LoadingIndicator } from '../../../shared/ui/loading-indicator/loading-indicator';
import { ListExportService, ListExportFormat } from '../list-export.service';
import { StandardListActionsService } from '../standard-list-actions.service';
import { formatRecordValue } from '../record-value-formatter';
import { ListFilterPanel } from '../list-filter-panel/list-filter-panel';
import { ListPersonalizationService } from '../list-personalization.service';
import type { ListAppliedFilter, ListPersonalizationState, ListSavedView } from '../../models/list-personalization-config.model';
import {
  AfterViewChecked,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  inject,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { SessionService } from '../../../core/services/session.service';
import { PageAccessService } from '../../../core/services/page-access.service';
import { DocumentPageCommandPermissionService } from '../document-page-command-permission.service';
import { CommandConfig, StandardCommandConfig, resolveCommandPermissionKey } from '../../models/command-config.model';
import { ListPageColumnConfig, ListPageConfig } from '../../models/page-config.model';
import { CommandBar } from '../../../shared/ui/command-bar/command-bar';
import { ListFactBox } from '../list-fact-box/list-fact-box';

type DisplayColumn = ListPageColumnConfig & {
  primary?: boolean;
  sortable?: boolean;
  filterable?: boolean;
};

type SortDirection = 'asc' | 'desc';

type ActiveSort = {
  field: string;
  direction: SortDirection;
};

type ListRenderEntry = {key: string; row?: unknown; group?: {key: string; label: string; rows: unknown[]}};

type ListDensity = 'compact' | 'comfortable' | 'spacious';

@Component({
  selector: 'app-list-grid',
  standalone: true,
  imports: [ColumnReorder, ColumnResize, FactBoxToggle, LoadingIndicator,  CommandBar, ListFactBox, ListFilterPanel],
  templateUrl: './list-grid.html',
  styleUrl: './list-grid.scss',
})
export class ListGrid implements AfterViewChecked, OnChanges, OnDestroy {
  readonly saves = inject(RunModalService);
  private readonly factBoxHost = inject(FactBoxHostService);
  private readonly sessionService = inject(SessionService);
  private readonly pageAccess = inject(PageAccessService);
  private readonly commandPermissions = inject(DocumentPageCommandPermissionService);
  private readonly standardActions = inject(StandardListActionsService);
  private readonly listExport = inject(ListExportService);
  exportBusy = false;
  private readonly changeDetector = inject(ChangeDetectorRef);
  @ViewChild('gridScroll') private readonly gridScroll?: ElementRef<HTMLElement>;

  @Input() config?: ListPageConfig;
  @Input() data: unknown[] = [];
  @Input() hasMore = false;
  @Input() loading = false;
  @Input() errorMessage?: string;
  @Input() selectedRecord?: unknown;
  @Input() showCommandBar = false;
  @Output() loadMore = new EventEmitter<void>();
  @Output() rowSelected = new EventEmitter<unknown>();
  @Output() primaryAction = new EventEmitter<unknown>();
  @Output() selectionChanged = new EventEmitter<unknown>();
  @Output() checkedKeysChanged = new EventEmitter<string[]>();
  @Output() errorDismissed = new EventEmitter<void>();
  @Output() command = new EventEmitter<{ actionKey: string; payload?: unknown }>();

  selectedNos = new Set<string>();
  searchText = '';
  density: ListDensity = 'compact';
  factboxOpen = true;
  private activeViewId?: string;
  private activeSort?: ActiveSort;
  private readonly resizedColumnWidths = new Map<string, number>();

  private readonly personalization = inject(ListPersonalizationService);
  @ViewChild('filterPanel') private filterPanel?: ListFilterPanel;
  @ViewChild(ListFactBox) private factBox?: ListFactBox;
  canLeaveFactBox(): Promise<boolean> { return this.factBox?.canLeave() ?? Promise.resolve(true); }
  savedViews: ListSavedView[] = [];
  appliedFilters: ListAppliedFilter[] = [];
  columnOrder: string[] = [];
  hiddenColumns = new Set<string>();
  showColumns = false;
  showSaveView = false;
  groupingField = '';
  frozenThrough = '';
  collapsedGroups = new Set<string>();
  get rowGroups(): Array<{key: string; label: string; rows: unknown[]}> {
    if (!this.groupingField) return [{key: 'all', label: '', rows: this.rows}];
    const groups = new Map<string, {key: string; label: string; rows: unknown[]}>();
    for (const row of this.rows) {
      const value = this.read(row, this.groupingField), key = typeof value + ':' + String(value ?? '');
      if (!groups.has(key)) groups.set(key, {key, label: value === null || value === undefined || value === '' ? '(blank)' : typeof value === 'boolean' ? value ? 'Yes' : 'No' : String(value), rows: []});
      groups.get(key)!.rows.push(row);
    }
    return [...groups.values()];
  }
  setGrouping(field: string): void { this.groupingField = field; this.collapsedGroups.clear(); this.persistPersonalization(); }
  toggleGroup(key: string): void { if (this.collapsedGroups.has(key)) this.collapsedGroups.delete(key); else this.collapsedGroups.add(key); }
  private renderOffset = 0;
  private measuredRowHeight?: number;
  private resetRenderViewport(): void { this.renderOffset = 0; if (this.gridScroll) this.gridScroll.nativeElement.scrollTop = 0; }
  private renderCache?: {data: unknown[]; length: number; grouping: string; collapsed: string; entries: ListRenderEntry[]};
  private get renderEntries(): ListRenderEntry[] {
    const collapsed = [...this.collapsedGroups].sort().join('|');
    const cached = this.renderCache;
    if (cached && cached.data === this.data && cached.length === this.data.length && cached.grouping === this.groupingField && cached.collapsed === collapsed) return cached.entries;
    const entries: ListRenderEntry[] = [];
    for (const group of this.rowGroups) {
      if (this.groupingField) entries.push({key:'group:' + group.key, group});
      if (!this.collapsedGroups.has(group.key)) for (const row of group.rows) entries.push({key:'row:' + this.getRowKey(row), row});
    }
    this.renderCache = {data:this.data, length:this.data.length, grouping:this.groupingField, collapsed, entries};
    return entries;
  }
  get renderWindow(): {entries: ListRenderEntry[]; before: number; after: number; start: number; total:number} {
    const entries = this.renderEntries;
    // Subtitle rows can vary in height; measure their real height before windowing.
    const height = this.renderRowHeight;
    const first = entries.length > 200 ? Math.min(Math.max(0, Math.floor(this.renderOffset / height) - 12), Math.max(0, entries.length - 80)) : 0;
    const end = entries.length > 200 ? Math.min(entries.length, first + 80) : entries.length;
    return {entries:entries.slice(first,end), before:first * height, after:(entries.length-end) * height, start:first, total:entries.length};
  }
  private get renderRowHeight(): number {
    return this.measuredRowHeight ?? (this.density === 'compact' ? 36 : this.density === 'spacious' ? 52 : 44);
  }
  viewName = '';
  personalizationMessage = '';
  private preferenceScope = '';

  get configurableColumns(): DisplayColumn[] {
    const columns = (this.config?.dataSurface?.columns ?? []).filter(column => column.hidden !== true &&
      this.pageAccess.field(this.config?.pageId ?? '', 'header', column.field ?? column.id ?? '').visible);
    const positions = new Map(this.columnOrder.map((key, index) => [key, index]));
    return [...columns].sort((a, b) => (positions.get(this.getColumnKey(a)) ?? 999) - (positions.get(this.getColumnKey(b)) ?? 999));
  }

  get advancedFilterEnabled(): boolean { return this.config?.tools?.advancedFilter !== false && this.config?.filterConfig?.enabled !== false; }
  get columnsEnabled(): boolean { return this.config?.tools?.columns !== false; }
  get savedViewsEnabled(): boolean { return this.config?.tools?.savedViews !== false && this.config?.personalization?.enabled !== false; }
  get factBoxEnabled(): boolean { return this.config?.factBox?.enabled !== false; }
  columnWidthNumber(column: DisplayColumn): number { return this.parseColumnWidth(this.getColumnWidth(column)); }
  setColumnWidth(column: DisplayColumn, width: number): void {
    this.resizedColumnWidths.set(this.getColumnKey(column), width);
  }
  onRowKey(event: KeyboardEvent, row: unknown): void {
    if (event.target !== event.currentTarget) return;
    if (['ArrowDown','ArrowUp','Home','End'].includes(event.key)) {
      event.preventDefault();
      const entries = this.renderEntries.filter(entry => !entry.group);
      const current = entries.findIndex(entry => entry.row === row);
      const index = event.key === 'Home' ? 0 : event.key === 'End' ? entries.length-1 : Math.min(entries.length-1,Math.max(0,current+(event.key === 'ArrowDown' ? 1 : -1)));
      const next = entries[index];
      if (next) {
        const position = this.renderEntries.indexOf(next);
        this.renderOffset = position * this.renderRowHeight;
        if (this.gridScroll) this.gridScroll.nativeElement.scrollTop = this.renderOffset;
        this.selectRow(next.row); this.changeDetector.detectChanges();
        const key = this.getRowKey(next.row);
        Array.from(this.gridScroll?.nativeElement.querySelectorAll<HTMLElement>('tr[data-record-key]') ?? []).find(element => element.dataset['recordKey'] === key)?.focus();
      }
      return;
    }
    if (event.key === 'Enter') { event.preventDefault(); this.openRow(row); }
    if (event.key === ' ' && this.config?.dataSurface?.selectable !== false) { event.preventDefault(); this.toggleRow(row, event); }
  }
  get searchEnabled(): boolean { return this.isBasicFilterEnabled && this.config?.tools?.search !== false; }
  get allRecordsViewId(): string { return this.views.find(view => !view.filter?.trim())?.id ?? '__all'; }
  get currentViewId(): string {
    const id = this.activeViewId ?? this.config?.activeViewId ?? this.views[0]?.id ?? '__all';
    return id === '__all' ? this.allRecordsViewId : id;
  }
  get currentSort(): ActiveSort | undefined {
    if (this.activeSort) return this.activeSort;
    const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*(asc|desc)?/i.exec(this.config?.dataSource?.defaultSort ?? '');
    return match ? {field: match[1]!, direction: match[2]?.toLowerCase() === 'desc' ? 'desc' : 'asc'} : undefined;
  }
  get sortLabel(): string {
    const sort = this.currentSort;
    if (!sort) return '';
    const label = this.configurableColumns.find(column => this.getColumnKey(column) === sort.field)?.label ?? sort.field;
    return `${label}: ${sort.direction === 'asc' ? 'ascending' : 'descending'}`;
  }
  get personalizationKey(): string { return this.config?.personalization?.storageKey ?? this.config?.pageId ?? this.config?.dataSurface?.id ?? 'list'; }
  get currentPersonalization(): ListPersonalizationState {
    return {columnOrder: this.columnOrder, hiddenColumns: [...this.hiddenColumns], columnWidths: Object.fromEntries(this.resizedColumnWidths), density: this.density, factBoxOpen: this.factboxOpen, groupingField: this.groupingField, ...(this.frozenThrough ? {frozenThrough:this.frozenThrough} : {})};
  }

  initializePersonalization(): void {
    const scope = `${this.sessionService.UserId}:${this.sessionService.Company}:${this.personalizationKey}`;
    if (this.preferenceScope === scope) return;
    this.preferenceScope = scope;
    if (this.config?.personalization?.enabled === false) return;
    this.restorePersonalization(this.personalization.read<unknown>(this.personalizationKey, 'layout', null));
    const views = this.personalization.read<unknown>(this.personalizationKey, 'views', []);
    const fields = new Set((this.config?.dataSurface?.columns ?? []).map(column => this.getColumnKey(column)));
    this.savedViews = Array.isArray(views) ? views.filter((view): view is ListSavedView => {
      if (!view || typeof view !== 'object') return false;
      const item = view as ListSavedView;
      return typeof item.id === 'string' && typeof item.label === 'string' && item.label.length <= 60 && Array.isArray(item.filters)
        && item.filters.every(filter => fields.has(filter.field) && typeof filter.value === 'string') && (!item.viewFilter || typeof item.viewFilter === 'string') && !!item.personalization;
    }).slice(0, 20) : [];
  }

  restorePersonalization(value: unknown): void {
    if (!value || typeof value !== 'object') return;
    const state = value as Partial<ListPersonalizationState>;
    const fields = new Set((this.config?.dataSurface?.columns ?? []).filter(column => !column.hidden).map(column => this.getColumnKey(column)));
    this.columnOrder = Array.isArray(state.columnOrder) ? [...new Set(state.columnOrder.filter(field => fields.has(field)))] : [];
    this.hiddenColumns = new Set(Array.isArray(state.hiddenColumns) ? state.hiddenColumns.filter(field => fields.has(field)) : []);
    if (this.hiddenColumns.size >= fields.size) this.hiddenColumns.clear();
    this.resizedColumnWidths.clear();
    if (state.columnWidths && typeof state.columnWidths === 'object') {
      for (const [field, width] of Object.entries(state.columnWidths)) if (fields.has(field) && Number.isFinite(width)) this.resizedColumnWidths.set(field, Math.min(800, Math.max(72, width)));
    }
    if (state.density === 'compact' || state.density === 'comfortable' || state.density === 'spacious') this.density = state.density;
    this.frozenThrough = typeof state.frozenThrough==='string' && fields.has(state.frozenThrough) ? state.frozenThrough : '';
    this.groupingField = state.groupingField && fields.has(state.groupingField) ? state.groupingField : '';
    if (typeof state.factBoxOpen === 'boolean') this.factboxOpen = state.factBoxOpen;
  }

  persistPersonalization(): void {
    if (this.config?.personalization?.enabled === false) return;
    if (!this.personalization.write(this.personalizationKey, 'layout', this.currentPersonalization)) this.personalizationMessage = 'Layout is applied for this session; browser storage is unavailable.';
  }

  setDensity(value: string): void {
    this.measuredRowHeight = undefined;
    if (value !== 'compact' && value !== 'comfortable' && value !== 'spacious') return;
    this.density = value;
    this.persistPersonalization();
  }

  setColumnVisible(column: DisplayColumn, visible: boolean): void {
    const field = this.getColumnKey(column);
    if (visible) this.hiddenColumns.delete(field);
    else if (this.columns.length > 1) this.hiddenColumns.add(field);
    this.persistPersonalization();
  }

  moveColumn(column: DisplayColumn, delta: number): void {
    const keys = this.configurableColumns.map(item => this.getColumnKey(item));
    const index = keys.indexOf(this.getColumnKey(column)), next = index + delta;
    if (index < 0 || next < 0 || next >= keys.length) return;
    [keys[index], keys[next]] = [keys[next]!, keys[index]!];
    this.columnOrder = keys;
    this.persistPersonalization();
  }

  reorderColumn(event: ColumnReorderEvent): void {
    const previous = this.configurableColumns.map(column => this.getColumnKey(column));
    const frozen = this.columns.filter(column => this.isFrozen(column)).map(column => this.getColumnKey(column));
    const keys = previous.filter(key => key !== event.sourceKey);
    const index = keys.indexOf(event.targetKey);
    if (index < 0 || !previous.includes(event.sourceKey)) return;
    keys.splice(index + (event.after ? 1 : 0), 0, event.sourceKey);
    if (keys.every((key, position) => key === previous[position])) return;
    this.columnOrder = keys;
    if (frozen.length) this.frozenThrough = keys.filter(key => frozen.includes(key)).at(-1) ?? '';
    this.persistPersonalization();
  }

  resetColumns(): void { this.frozenThrough=''; this.columnOrder = []; this.hiddenColumns.clear(); this.resizedColumnWidths.clear(); this.persistPersonalization(); }

  handleAdvancedFilter(event: {actionKey: string; payload?: unknown}): void {
    if (event.actionKey === 'advancedFilterChanged') {
      const payload = event.payload as {filters?: ListAppliedFilter[]};
      this.appliedFilters = payload?.filters ?? [];
    }
    this.command.emit(event);
  }

  removeAppliedFilter(index: number): void {
    this.filterPanel?.setFilters(this.appliedFilters.filter((_, current) => index !== current), true);
  }

  filterCaption(filter: ListAppliedFilter): string {
    const column = this.configurableColumns.find(item => this.getColumnKey(item) === filter.field);
    return `${column?.label ?? filter.field} ${filter.operator === 'expression' ? ':' : filter.operator} ${filter.value}`;
  }

  clearSearch(): void { this.searchText = ''; this.emitFilterChanged(); }

  saveView(): void {
    const label = this.viewName.trim().slice(0, 60);
    if (!label) return;
    const existing = this.savedViews.find(view => view.label.toLowerCase() === label.toLowerCase());
    if (!existing && this.savedViews.length >= 20) { this.personalizationMessage = 'Remove a saved view before adding another (limit 20).'; return; }
    const view: ListSavedView = {id: existing?.id ?? `personal-${crypto.randomUUID()}`, label, filters: structuredClone(this.appliedFilters), sort: this.currentSort ? `${this.currentSort.field} ${this.currentSort.direction}` : undefined, viewFilter: this.savedViews.find(view => view.id === this.currentViewId)?.viewFilter ?? this.views.find(view => view.id === this.currentViewId)?.filter, personalization: structuredClone(this.currentPersonalization)};
    this.savedViews = [...this.savedViews.filter(item => item.id !== view.id), view];
    this.activeViewId = view.id;
    this.showSaveView = false;
    this.personalizationMessage = this.personalization.write(this.personalizationKey, 'views', this.savedViews) ? 'View saved for your user and company.' : 'View is available for this session; browser storage is unavailable.';
  }

  removeSavedView(): void {
    this.savedViews = this.savedViews.filter(view => view.id !== this.currentViewId);
    this.personalization.write(this.personalizationKey, 'views', this.savedViews);
    this.setActiveView('__all');
  }

  async copyRows(): Promise<void> {
    if(this.config?.tools?.export===false)return;
    const rows=this.selectedNos.size?this.rows.filter(row=>this.selectedNos.has(this.getRowKey(row))):this.selectedRow?[this.selectedRow]:[];
    if(!rows.length){this.personalizationMessage='Select the rows to copy.';return;}
    try { await navigator.clipboard.writeText(writeTabularText(rows.map(row=>this.columns.map(column=>this.getCellValue(row,column)))));this.personalizationMessage=rows.length+' selected rows copied.'; }
    catch {this.personalizationMessage='Clipboard access is unavailable in this browser.';}
    this.changeDetector.markForCheck();
  }

  freezeThrough(column: DisplayColumn): void {
    const key=this.getColumnKey(column);this.frozenThrough=this.frozenThrough===key?'':key;this.persistPersonalization();
  }
  isFrozen(column: DisplayColumn): boolean {
    const end=this.columns.findIndex(c=>this.getColumnKey(c)===this.frozenThrough),index=this.columns.indexOf(column);
    return end>=0 && index>=0 && index<=end;
  }
  frozenLeft(column: DisplayColumn): number|null {
    return this.isFrozen(column)?60+this.columns.slice(0,this.columns.indexOf(column)).reduce((total,c)=>total+this.columnWidthNumber(c),0):null;
  }

  autoFitColumn(column: DisplayColumn): void {
    if(this.config?.dataSurface?.resizable===false)return;
    // Measure only the loaded page; never fetch records to calculate a width.
    const canvas=document.createElement('canvas'),context=canvas.getContext('2d');
    if(!context)return;
    const sample=this.gridScroll?.nativeElement.querySelector('td');
    context.font=sample?getComputedStyle(sample).font:'13px sans-serif';
    let width=context.measureText(column.label).width+44;
    for(const row of this.rows.slice(0,500)) width=Math.max(width,context.measureText(String(this.getCellValue(row,column))).width+24);
    this.resizedColumnWidths.set(this.getColumnKey(column),Math.min(480,Math.max(72,Math.ceil(width))));
    this.persistPersonalization();
  }

  async exportLoadedRows(format: ListExportFormat = 'csv'): Promise<void> {
    if (this.config?.tools?.export === false || this.exportBusy) return;
    this.exportBusy = true;
    try {
      await this.listExport.export(format, {
        title: this.config?.title ?? 'List', fileName: this.config?.pageId ?? 'list',
        headers: this.columns.map(column => column.label),
        rows: this.rows.map(row => this.columns.map(column => this.getCellValue(row, column))),
      });
    } catch (error) {
      this.personalizationMessage = format === 'print' ? 'Allow the print window to open, then try again.' : 'Export could not be completed. Refresh the page and try again.';
    } finally { this.exportBusy = false; this.changeDetector.markForCheck(); }
  }

  @HostListener('keydown', ['$event'])
  handleListKey(event: KeyboardEvent): void {
    if (event.key === 'Escape') { this.showColumns = false; this.showSaveView = false; this.filterPanel?.close(); return; }
    if (event.altKey && event.key.toLowerCase() === 'f' && this.advancedFilterEnabled) { event.preventDefault(); this.filterPanel?.toggle(); return; }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'f' && this.searchEnabled) { event.preventDefault(); this.searchInput?.nativeElement.focus(); }
  }

  @ViewChild('searchInput') private searchInput?: ElementRef<HTMLInputElement>;


  ngOnChanges(changes: SimpleChanges): void {
    if (!this.showCommandBar) this.factBoxHost.host.set(this);
    else if (this.factBoxHost.host() === this) this.factBoxHost.host.set(null);
    if ('config' in changes) { this.initializePersonalization(); this.renderCache = undefined; this.measuredRowHeight = undefined; }
    if ('data' in changes) {
      this.renderCache = undefined;
      if (!changes['data'].previousValue?.length || this.data.length < changes['data'].previousValue.length) {
        this.renderOffset = 0; if (this.gridScroll) this.gridScroll.nativeElement.scrollTop = 0;
      }
      const available = new Set(this.data.map(row => this.getRowKey(row)));
      const selected = new Set([...this.selectedNos].filter(key => available.has(key)));
      if (selected.size !== this.selectedNos.size) { this.selectedNos = selected; queueMicrotask(() => this.emitCheckedKeysChanged()); }
    }
  }

  ngOnDestroy(): void {
    if (this.factBoxHost.host() === this) this.factBoxHost.host.set(null);
  }

  get usesConfiguredData(): boolean {
    return Boolean(this.config?.dataSurface);
  }

  get rows(): unknown[] {
    return this.data;
  }

  get isInitialLoading(): boolean {
    return this.loading && this.rows.length === 0;
  }

  get isLoadingMore(): boolean {
    return this.loading && this.rows.length > 0;
  }

  get loadingLabel(): string {
    return this.isLoadingMore ? 'Loading records...' : 'Loading list data...';
  }

  get columns(): DisplayColumn[] {
    return this.configurableColumns.filter(column => !this.hiddenColumns.has(this.getColumnKey(column)));
  }

  get gridMinWidth(): string {
    const rowControlWidth = 68;
    const visibleColumnWidth = this.columns.reduce(
      (total, column) => total + this.parseColumnWidth(this.getColumnWidth(column)),
      0,
    );
    return `${Math.max(320, rowControlWidth + visibleColumnWidth)}px`;
  }

  get selectedRow(): unknown {
    return this.selectedRecord ?? this.rows[0];
  }

  get selectedCount(): number {
    return this.selectedNos.size;
  }

  get selectableRows(): unknown[] {
    return this.rows.filter((row) => this.getRowKey(row).length > 0);
  }

  get isMultiSelect(): boolean {
    return this.config?.dataSurface?.multiSelect !== false;
  }

  get normalizedErrorMessage(): string {
    return (this.errorMessage ?? '').trim();
  }

  dismissError(): void {
    this.errorDismissed.emit();
  }

  get isAllRowsSelected(): boolean {
    const selectableCount = this.selectableRows.length;
    return selectableCount > 0 && this.selectedNos.size === selectableCount;
  }

  get isSelectionPartial(): boolean {
    const selectableCount = this.selectableRows.length;
    return this.selectedNos.size > 0 && this.selectedNos.size < selectableCount;
  }

  get views(): Array<{ id: string; label: string; filter?: string }> {
    return this.config?.views ?? [];
  }

  get searchPlaceholder(): string {
    return this.config?.searchPlaceholder ?? 'Search this list…';
  }

  get isBasicFilterEnabled(): boolean {
    return this.config?.tools?.filter !== false;
  }

  get resolvedStandardActions(): StandardCommandConfig {
    return this.standardActions.resolve(this.config ?? {});
  }

  get resolvedCommands(): CommandConfig[] {
    const pagePermissions = this.resolvePagePermissionFlags();
    return (this.config?.commands ?? [])
      .map((command) => {
        command = this.commandPermissions.apply(command, this.config?.pageId ?? '', this.config?.dataSource, 'list');
        if (command.hidden === true) {
          return command;
        }

        if (command.apiAction && this.config?.dataSource) return this.commandPermissions.apply(command, this.config.pageId ?? '', this.config.dataSource);
        const canExecute = this.canExecuteCommand(resolveCommandPermissionKey(command, this.config?.pageId ?? ''), pagePermissions.canExecute);
        if (canExecute) {
          return command;
        }

        return {
          ...command,
          hidden: true,
          disabled: true,
          tooltip: command.tooltip ?? 'You do not have execute permission.',
        };
      });
  }

  private resolvePagePermissionFlags(): {
    canCreate: boolean;
    canUpdate: boolean;
    canDelete: boolean;
    canExecute: boolean;
  } {
    if (this.sessionService.SuperAdmin) {
      return { canCreate: true, canUpdate: true, canDelete: true, canExecute: true };
    }

    const pageId = String(this.config?.pageId ?? '').trim();
    const records = this.sessionService.Permissions.filter((permission) => this.matchesPage(permission, pageId));
    if (!records.length) {
      return { canCreate: false, canUpdate: false, canDelete: false, canExecute: false };
    }

    return {
      canCreate: records.some((record) => this.readPermissionFlag(record, ['canCreate', 'CanCreate', 'InsertPermission'])),
      canUpdate: records.some((record) => this.readPermissionFlag(record, ['canUpdate', 'CanUpdate', 'ModifyPermission'])),
      canDelete: records.some((record) => this.readPermissionFlag(record, ['canDelete', 'CanDelete', 'DeletePermission'])),
      canExecute: records.some((record) => this.readPermissionFlag(record, ['canExecute', 'CanExecute', 'PostPermission'])),
    };
  }

  private canExecuteCommand(permissionKey: string | undefined, fallbackCanExecute: boolean): boolean {
    if (this.sessionService.SuperAdmin) {
      return true;
    }

    if (!permissionKey) {
      return fallbackCanExecute;
    }

    const normalizedPermissionKey = this.normalizePermissionValue(permissionKey);
    if (!normalizedPermissionKey.length) {
      return false;
    }

    const records = this.sessionService.Permissions.filter((permission) =>
      this.matchesPermissionKey(permission, normalizedPermissionKey),
    );
    if (!records.length) {
      return false;
    }

    return records.some((record) => this.readPermissionFlag(record, ['canExecute', 'CanExecute', 'PostPermission']));
  }

  private matchesPage(permission: unknown, pageId: string): boolean {
    const normalizedPageId = this.normalizePermissionValue(pageId);
    if (!normalizedPageId.length) {
      return false;
    }

    const declaredPageId = this.readPermissionValue(permission, ['pageId', 'PageId']);
    const declaredPageName = this.readPermissionValue(permission, ['pageName', 'PageName']);
    const declaredObjectName = this.readPermissionValue(permission, ['objectName', 'ObjectName']);

    return this.normalizePermissionValue(declaredPageId) === normalizedPageId
      || this.normalizePermissionValue(declaredPageName) === normalizedPageId
      || this.normalizePermissionValue(declaredObjectName) === normalizedPageId;
  }

  private matchesPermissionKey(permission: unknown, normalizedPermissionKey: string): boolean {
    const actionId = this.readPermissionValue(permission, ['actionId', 'ActionId']);
    const actionCode = this.readPermissionValue(permission, ['actionCode', 'ActionCode']);
    const pageName = this.readPermissionValue(permission, ['pageName', 'PageName']);
    const objectName = this.readPermissionValue(permission, ['objectName', 'ObjectName']);

    return this.normalizePermissionValue(actionId) === normalizedPermissionKey
      || this.normalizePermissionValue(actionCode) === normalizedPermissionKey
      || this.normalizePermissionValue(pageName) === normalizedPermissionKey
      || this.normalizePermissionValue(objectName) === normalizedPermissionKey;
  }

  private readPermissionValue(permission: unknown, keys: string[]): string {
    if (!permission || typeof permission !== 'object') {
      return '';
    }

    const record = permission as Record<string, unknown>;
    for (const key of keys) {
      if (!(key in record)) {
        continue;
      }

      const value = record[key];
      if (value === undefined || value === null) {
        continue;
      }

      return String(value);
    }

    return '';
  }

  private readPermissionFlag(permission: unknown, keys: string[]): boolean {
    const value = this.readPermissionValue(permission, keys);
    const normalized = value.trim().toLowerCase();
    return normalized === 'true'
      || normalized === '1'
      || normalized === 'yes'
      || normalized === 'full';
  }

  private normalizePermissionValue(value: unknown): string {
    return value === undefined || value === null
      ? ''
      : String(value)
          .trim()
          .replace(/[_-]+/g, ' ')
          .replace(/\s+/g, ' ')
          .toUpperCase();
  }

  get densityLabel(): string {
    switch (this.density) {
      case 'compact':
        return 'Compact';
      case 'spacious':
        return 'Spacious';
      default:
        return 'Comfortable';
    }
  }

  cycleDensity(): void {
    this.measuredRowHeight = undefined;
    if (this.density === 'comfortable') {
      this.density = 'compact';
      return;
    }

    if (this.density === 'compact') {
      this.density = 'spacious';
      return;
    }

    this.density = 'comfortable';
  }

  toggleFactbox(): void {
    if (this.filterPanel?.visible) { this.filterPanel.close(); this.factboxOpen = true; }
    else this.factboxOpen = !this.factboxOpen;
    this.persistPersonalization();
  }

  isViewActive(viewId: string): boolean {
    const currentView = this.activeViewId ?? this.config?.activeViewId;
    return currentView === viewId;
  }

  setActiveView(viewId: string): void {
    this.activeViewId = viewId;
    const saved = this.savedViews.find(view => view.id === viewId);
    this.command.emit({actionKey: 'viewChanged', payload: {viewId, viewFilter: saved?.viewFilter ?? this.views.find(view => view.id === viewId)?.filter ?? ''}});
    this.filterPanel?.setFilters(saved?.filters ?? [], true);
    if (saved) {
      this.restorePersonalization(saved.personalization);
      this.persistPersonalization();
      if (saved.sort && this.config?.dataSource?.paging !== 'cursor') {
        const match = /^([A-Za-z_][A-Za-z0-9_]*) (asc|desc)$/.exec(saved.sort);
        if (match && this.configurableColumns.some(column => this.getColumnKey(column) === match[1] && column.sortable !== false)) {
          this.activeSort = {field: match[1]!, direction: match[2] as SortDirection};
          this.command.emit({actionKey: 'sortChanged', payload: {sort: saved.sort}});
        }
      }
    }
  }

  handleSearchInput(event: Event): void {
    if (!this.isBasicFilterEnabled) {
      return;
    }

    const target = event.target;
    if (!(target instanceof HTMLInputElement)) {
      return;
    }

    this.searchText = target.value;
    this.emitFilterChanged();
  }

  clearSelection(): void {
    this.selectedNos.clear();
    this.emitCheckedKeysChanged();
  }

  toggleAllRows(event: Event): void {
    event.stopPropagation();

    if (!this.isMultiSelect) {
      return;
    }

    if (this.isAllRowsSelected) {
      this.selectedNos.clear();
      this.emitCheckedKeysChanged();
      return;
    }

    this.selectedNos = new Set(this.selectableRows.map((row) => this.getRowKey(row)));
    this.emitCheckedKeysChanged();
  }

  getRowKey(row: unknown): string {
    const keyField = this.config?.dataSurface?.idField;

    if (keyField) {
      return String(this.read(row, keyField) ?? '');
    }

    const configuredFallback = this.config?.behavior?.keyFallbackFields ?? [];
    const fallback = configuredFallback.length
      ? configuredFallback
      : ['systemId', 'SystemId', 'id', 'Id', 'code', 'Code', 'number', 'Number', 'no', 'No'];

    return String(this.readFirst(row, fallback) ?? '');
  }

  getSelectedRowKey(): string {
    return this.getRowKey(this.selectedRow);
  }

  getRowType(row: unknown): string {
    const behavior = this.config?.behavior;

    const candidates: string[] = [];
    if (behavior?.typeField) {
      candidates.push(behavior.typeField);
    }

    if (Array.isArray(behavior?.typeFallbackFields) && behavior.typeFallbackFields.length) {
      candidates.push(...behavior.typeFallbackFields);
    }

    return String(this.readFirst(row, candidates) ?? behavior?.typeDefault ?? '');
  }

  getStatus(row: unknown): string {
    const behavior = this.config?.behavior;

    const candidates: string[] = [];
    if (behavior?.statusField) {
      candidates.push(behavior.statusField);
    }

    if (Array.isArray(behavior?.statusFallbackFields) && behavior.statusFallbackFields.length) {
      candidates.push(...behavior.statusFallbackFields);
    }

    return String(this.readFirst(row, candidates) ?? behavior?.statusDefault ?? '');
  }

  getTone(row: unknown): string {
    const behavior = this.config?.behavior;

    const candidates: string[] = [];
    if (behavior?.toneField) {
      candidates.push(behavior.toneField);
    }

    if (Array.isArray(behavior?.toneFallbackFields) && behavior.toneFallbackFields.length) {
      candidates.push(...behavior.toneFallbackFields);
    }

    return String(this.readFirst(row, candidates) ?? behavior?.toneDefault ?? '');
  }

  getRowIcon(row: unknown): string {
    const type = this.getRowType(row);
    const configured = this.config?.behavior?.iconByType?.[type];
    if (configured) {
      return configured;
    }

    if (this.config?.behavior?.defaultIcon) {
      return this.config.behavior.defaultIcon;
    }

    return 'ts-icon ts-icon-right';
  }

  isRowChecked(row: unknown): boolean {
    return this.selectedNos.has(this.getRowKey(row));
  }

  toggleRow(row: unknown, event: Event): void {
    event.stopPropagation();
    const key = this.getRowKey(row);

    if (!key) {
      return;
    }

    const alreadySelected = this.selectedNos.has(key);

    if (this.isMultiSelect && alreadySelected) {
      this.selectedNos.delete(key);
    } else {
      if (!this.isMultiSelect) {
        this.selectedNos.clear();
      }

      this.selectedNos.add(key);
    }

    this.selectedRecord = row;
    this.selectionChanged.emit(row);
    this.emitCheckedKeysChanged();
  }

  private emitCheckedKeysChanged(): void {
    this.checkedKeysChanged.emit(Array.from(this.selectedNos));
  }

  selectRow(row: unknown): void {
    this.selectedRecord = row;
    this.selectionChanged.emit(row);
  }

  openRow(row: unknown, event?: Event): void {
    event?.stopPropagation();
    this.selectRow(row);
    this.rowSelected.emit(row);
  }

  openPrimary(row: unknown, event: Event): void {
    event.stopPropagation();
    this.selectRow(row);
    this.primaryAction.emit(row);
  }

  isPrimaryColumn(column: DisplayColumn): boolean {
    return Boolean(column.primary || column.isPrimary);
  }

  getColumnWidth(column: DisplayColumn): string {
    const field = this.getColumnKey(column);
    const resizedWidth = this.resizedColumnWidths.get(field);
    if (resizedWidth) {
      return `${resizedWidth}px`;
    }

    const configuredWidth = String(column.width ?? '').trim();
    if (configuredWidth.length) {
      return configuredWidth;
    }

    if (this.isPrimaryColumn(column)) {
      return '128px';
    }

    if (column.subtitleField) {
      return '220px';
    }

    if (column.type === 'date') {
      return '118px';
    }

    if (column.type === 'currency' || column.type === 'number') {
      return '126px';
    }

    if (column.type === 'boolean') {
      return '104px';
    }

    if (column.type === 'badge') {
      return '112px';
    }

    return '124px';
  }

  getColumnSortDirection(column: DisplayColumn): SortDirection | undefined {
    const field = this.getColumnKey(column);
    return this.currentSort?.field === field ? this.currentSort.direction : undefined;
  }

  toggleSort(column: DisplayColumn): void {
    this.resetRenderViewport();
    if (column.sortable === false || this.config?.dataSurface?.sortable === false || this.config?.dataSource?.paging === 'cursor') return;
    const field = this.getColumnKey(column);
    if (!field.length) {
      return;
    }

    if (this.currentSort?.field !== field) {
      this.activeSort = { field, direction: 'asc' };
      this.command.emit({ actionKey: 'sortChanged', payload: { sort: `${field} asc` } });
      return;
    }

    this.activeSort = {
      field,
      direction: this.currentSort?.direction === 'asc' ? 'desc' : 'asc',
    };
    this.command.emit({ actionKey: 'sortChanged', payload: { sort: `${field} ${this.activeSort.direction}` } });
  }

  private parseColumnWidth(width: string): number {
    const numeric = Number.parseFloat(width);
    return Number.isFinite(numeric) && numeric > 0 ? numeric : 124;
  }

  private getColumnKey(column: DisplayColumn): string {
    return String(column.field ?? column.id ?? column.label ?? '').trim();
  }

  private compareValues(left: unknown, right: unknown): number {
    const leftEmpty = left === undefined || left === null || left === '';
    const rightEmpty = right === undefined || right === null || right === '';

    if (leftEmpty && rightEmpty) {
      return 0;
    }

    if (leftEmpty) {
      return 1;
    }

    if (rightEmpty) {
      return -1;
    }

    const leftNumber = typeof left === 'number' ? left : Number(String(left).replace(/,/g, ''));
    const rightNumber = typeof right === 'number' ? right : Number(String(right).replace(/,/g, ''));
    if (!Number.isNaN(leftNumber) && !Number.isNaN(rightNumber)) {
      return leftNumber - rightNumber;
    }

    const leftDate = typeof left === 'string' ? Date.parse(left) : Number.NaN;
    const rightDate = typeof right === 'string' ? Date.parse(right) : Number.NaN;
    if (!Number.isNaN(leftDate) && !Number.isNaN(rightDate)) {
      return leftDate - rightDate;
    }

    return String(left).localeCompare(String(right), undefined, {
      numeric: true,
      sensitivity: 'base',
    });
  }

  ngAfterViewChecked(): void {
    // Loading more records is driven by scrolling, not change detection.
  }

  onGridScroll(event: Event): void {
    if (event.target instanceof HTMLElement) {
      const measured = event.target.querySelector('tbody tr[data-record-row]')?.getBoundingClientRect().height;
      if (measured && measured > 0) this.measuredRowHeight = measured;
      this.renderOffset = event.target.scrollTop;
    }
    if (!this.usesConfiguredData || this.loading || !this.hasMore || this.config?.dataSurface?.infiniteScroll === false) {
      return;
    }

    const target = event.target;

    if (!(target instanceof HTMLElement)) {
      return;
    }

    const distanceFromBottom = target.scrollHeight - target.scrollTop - target.clientHeight;

    if (distanceFromBottom <= 160) {
      this.loadMore.emit();
    }
  }

  private emitFilterChanged(): void {
    this.resetRenderViewport();
    if (!this.isBasicFilterEnabled) {
      return;
    }

    const viewId = this.activeViewId ?? this.config?.activeViewId ?? '';
    const viewFilter = this.savedViews.find(view => view.id === viewId)?.viewFilter ?? this.views.find((view) => view.id === viewId)?.filter ?? '';
    this.command.emit({
      actionKey: 'filterChanged',
      payload: {
        viewId,
        viewFilter,
        searchText: this.searchText,
      },
    });
  }

  getCellValue(row: unknown, column: DisplayColumn): string {
    const key = column.field ?? column.id ?? '';
    if (!this.pageAccess.field(this.config?.pageId ?? '', 'header', key).visible) return '';
    const caption = this.read(row, '__display_' + key);
    if (typeof caption === 'string') return caption;
    const value = this.read(row, key);

    if (this.usesConfiguredData && (value === undefined || value === null || value === '')) {
      return '';
    }

    const option = column.filter?.options?.find(option => String(option.value) === String(value));
    return option?.label ?? this.formatValue(value, column);
  }

  getSubtitle(row: unknown, column: DisplayColumn): string {
    if (!this.pageAccess.field(this.config?.pageId ?? '', 'header', column.subtitleField ?? '').visible) return '';
    const value = this.read(row, column.subtitleField ?? '');
    return value === undefined || value === null ? '' : String(value);
  }

  private formatValue(
    value: unknown,
    column: { type?: string; id?: string; label?: string; currencyCode?: string },
  ): string {
    return formatRecordValue(value, column);
  }

  private read(row: unknown, field: string): unknown {
    if (!field || typeof row !== 'object' || row === null) {
      return undefined;
    }

    return (row as Record<string, unknown>)[field];
  }

  private readFirst(row: unknown, fields: string[]): unknown {
    for (const field of fields) {
      const value = this.read(row, field);
      if (value !== undefined && value !== null && String(value).length > 0) {
        return value;
      }
    }

    return undefined;
  }
}
