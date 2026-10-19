import {
  AfterViewChecked,
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
import { CommandConfig, StandardCommandConfig, StandardCommandStateConfig } from '../../models/command-config.model';
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

type ActiveResize = {
  field: string;
  startX: number;
  startWidth: number;
};

type ListDensity = 'compact' | 'comfortable' | 'spacious';

@Component({
  selector: 'app-list-page',
  standalone: true,
  imports: [CommandBar, ListFactBox],
  templateUrl: './list-page.html',
  styleUrl: './list-page.scss',
})
export class ListPage implements AfterViewChecked, OnChanges, OnDestroy {
  private readonly sessionService = inject(SessionService);
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
  private dismissTimer?: ReturnType<typeof setTimeout>;
  private activeSort?: ActiveSort;
  private activeResize?: ActiveResize;
  private readonly resizedColumnWidths = new Map<string, number>();

  ngOnChanges(changes: SimpleChanges): void {
    if (!('errorMessage' in changes)) {
      return;
    }

    this.resetErrorDismissTimer();
  }

  ngOnDestroy(): void {
    this.clearErrorDismissTimer();
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
    return this.isLoadingMore ? 'Refreshing list data...' : 'Loading list data...';
  }

  get columns(): DisplayColumn[] {
    return (this.config?.dataSurface?.columns ?? []).filter((column) => column.hidden !== true);
  }

  get gridMinWidth(): string {
    const rowControlWidth = 68;
    const visibleColumnWidth = this.columns.reduce(
      (total, column) => total + this.parseColumnWidth(this.getColumnWidth(column)),
      0,
    );
    return `${Math.max(1180, rowControlWidth + visibleColumnWidth)}px`;
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
    this.clearErrorDismissTimer();
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
    return this.config?.searchPlaceholder ?? '';
  }

  get isBasicFilterEnabled(): boolean {
    return this.config?.tools?.filter !== false;
  }

  get resolvedStandardActions(): StandardCommandConfig {
    const supportsCreateBlocked = this.config?.dataSource?.supportsCreate === false;
    const supportsDeleteBlocked = this.config?.dataSource?.supportsDelete === false;
    const permissions = this.resolvePagePermissionFlags();
    const canCreate = permissions.canCreate;
    const canDelete = permissions.canDelete;

    return {
      new: this.mergeStandardActionState(this.config?.standardActions?.new, {
        label: 'New',
        icon: 'bi bi-plus-lg',
        order: 10,
        visible: true,
        hidden: false,
        disabled: supportsCreateBlocked || !canCreate,
        tooltip: supportsCreateBlocked
          ? 'Create is not supported for this page.'
          : (!canCreate ? 'You do not have create permission.' : undefined),
      }),
      delete: this.mergeStandardActionState(this.config?.standardActions?.delete, {
        label: 'Delete',
        order: 20,
        visible: true,
        hidden: false,
        disabled: supportsDeleteBlocked || !canDelete,
        tooltip: supportsDeleteBlocked
          ? 'Delete is not supported for this page.'
          : (!canDelete ? 'You do not have delete permission.' : undefined),
      }),
      refresh: this.mergeStandardActionState(this.config?.standardActions?.refresh, {
        label: 'Refresh',
        order: 30,
        visible: true,
        disabled: false,
      }),
    };
  }

  get resolvedCommands(): CommandConfig[] {
    const pagePermissions = this.resolvePagePermissionFlags();
    return (this.config?.commands ?? [])
      .map((command) => {
        if (command.hidden === true) {
          return command;
        }

        const canExecute = this.canExecuteCommand(command.permissionKey, pagePermissions.canExecute);
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

  private mergeStandardActionState(
    configured: boolean | StandardCommandStateConfig | undefined,
    defaults: StandardCommandStateConfig,
  ): boolean | StandardCommandStateConfig {
    if (configured === false) {
      return false;
    }

    if (configured === true || configured === undefined) {
      return defaults;
    }

    return {
      ...defaults,
      ...configured,
    };
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
    this.factboxOpen = !this.factboxOpen;
  }

  isViewActive(viewId: string): boolean {
    const currentView = this.activeViewId ?? this.config?.activeViewId;
    return currentView === viewId;
  }

  setActiveView(viewId: string): void {
    this.activeViewId = viewId;
    const viewFilter = this.views.find((view) => view.id === viewId)?.filter;
    if (this.isBasicFilterEnabled) {
      this.command.emit({ actionKey: 'viewChanged', payload: { viewId, viewFilter } });
      this.emitFilterChanged();
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

    return 'bi bi-chevron-right';
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

  private resetErrorDismissTimer(): void {
    this.clearErrorDismissTimer();
    if (!this.normalizedErrorMessage) {
      return;
    }

    this.dismissTimer = setTimeout(() => {
      this.dismissError();
    }, 8000);
  }

  private clearErrorDismissTimer(): void {
    if (!this.dismissTimer) {
      return;
    }

    clearTimeout(this.dismissTimer);
    this.dismissTimer = undefined;
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
      return '72px';
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
    return this.activeSort?.field === field ? this.activeSort.direction : undefined;
  }

  toggleSort(column: DisplayColumn): void {
    if (column.sortable === false || this.config?.dataSurface?.sortable === false || this.config?.dataSource?.paging === 'cursor') return;
    const field = this.getColumnKey(column);
    if (!field.length) {
      return;
    }

    if (this.activeSort?.field !== field) {
      this.activeSort = { field, direction: 'asc' };
      this.command.emit({ actionKey: 'sortChanged', payload: { sort: `${field} asc` } });
      return;
    }

    this.activeSort = {
      field,
      direction: this.activeSort.direction === 'asc' ? 'desc' : 'asc',
    };
    this.command.emit({ actionKey: 'sortChanged', payload: { sort: `${field} ${this.activeSort.direction}` } });
  }

  startColumnResize(event: PointerEvent, column: DisplayColumn): void {
    event.preventDefault();
    event.stopPropagation();

    const field = this.getColumnKey(column);
    if (!field.length) {
      return;
    }

    this.activeResize = {
      field,
      startX: event.clientX,
      startWidth: this.parseColumnWidth(this.getColumnWidth(column)),
    };
  }

  @HostListener('window:pointermove', ['$event'])
  handleColumnResizeMove(event: PointerEvent): void {
    if (!this.activeResize) {
      return;
    }

    const nextWidth = Math.max(72, this.activeResize.startWidth + event.clientX - this.activeResize.startX);
    this.resizedColumnWidths.set(this.activeResize.field, Math.round(nextWidth));
  }

  @HostListener('window:pointerup')
  stopColumnResize(): void {
    this.activeResize = undefined;
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
    // Intentionally no-op. Auto-load caused repeated background fetch churn on small datasets.
  }

  onGridScroll(event: Event): void {
    if (!this.usesConfiguredData || this.loading || !this.hasMore) {
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
    if (!this.isBasicFilterEnabled) {
      return;
    }

    const viewId = this.activeViewId ?? this.config?.activeViewId ?? '';
    const viewFilter = this.views.find((view) => view.id === viewId)?.filter;
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
    const value = this.read(row, column.field ?? column.id ?? '');

    if (this.usesConfiguredData && (value === undefined || value === null || value === '')) {
      return '';
    }

    return this.formatValue(value, column);
  }

  getSubtitle(row: unknown, column: DisplayColumn): string {
    const value = this.read(row, column.subtitleField ?? '');
    return value === undefined || value === null ? '' : String(value);
  }

  private formatValue(
    value: unknown,
    column: { type?: string; id?: string; label?: string; currencyCode?: string },
  ): string {
    if (value === undefined || value === null || value === '') {
      return '';
    }

    if (column.type === 'date' && typeof value === 'string') {
      const date = new Date(value);

      if (!Number.isNaN(date.getTime())) {
        return new Intl.DateTimeFormat('en-US', {
          month: 'short',
          day: '2-digit',
          year: 'numeric',
        }).format(date);
      }
    }

    if (column.type === 'currency' && typeof value === 'number') {
      if (column.currencyCode) {
        return new Intl.NumberFormat(undefined, {
          style: 'currency',
          currency: column.currencyCode,
          currencyDisplay: 'code',
        }).format(value);
      }

      return new Intl.NumberFormat(undefined).format(value);
    }

    return String(value);
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
