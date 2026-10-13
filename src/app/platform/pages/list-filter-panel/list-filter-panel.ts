import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { Subscription } from 'rxjs';
import { RestService } from '../../../core/services/rest.service';
import { ActionDispatcherService } from '../../../shared/ui/action-dispatcher.service';
import { RunModalLoadingService } from '../../run-modal/run-modal-loading.service';
import { FilterField } from '../../models/list-filter-config.model';

type FilterRow = {
  id: string;
  field: string;
  operator: 'contains' | 'startswith' | 'eq' | 'ge' | 'le';
  value: unknown;
};

type FilterBookmark = {
  name: string;
  filters: Array<{ field: string; operator: FilterRow['operator']; value: string }>;
  savedAt: number;
};

@Component({
  selector: 'app-list-filter-panel',
  standalone: true,
  templateUrl: './list-filter-panel.html',
  styleUrl: './list-filter-panel.scss'
})
export class ListFilterPanel implements OnInit, OnDestroy {
  @Input() enabled = false;
  @Input() columns: Array<{ id?: string; label?: string; field?: string; type?: string }> = [];
  @Input() filterOptions: FilterField[] = [];
  @Input() storageKey = '';
  @Output() command = new EventEmitter<{ actionKey: string; payload?: unknown }>();

  visible = false;
  filters: FilterRow[] = [];
  bookmarks: FilterBookmark[] = [];
  showSaveInput = false;
  bookmarkName = '';
  showBookmarks = true;
  dropdownItems: Record<string, Array<{ value: unknown; label: string }>> = {};
  dropdownLoading: Record<string, boolean> = {};
  private readonly fieldCache: Record<string, Array<{ value: unknown; label: string }>> = {};

  private readonly subscriptions = new Subscription();
  private nextId = 0;

  constructor(
    private readonly actionDispatcher: ActionDispatcherService,
    private readonly rest: RestService,
    private readonly loading: RunModalLoadingService,
  ) {}

  get resolvedFilterOptions(): FilterField[] {
    if (this.filterOptions.length > 0) {
      return this.filterOptions;
    }

    return this.columns
      .map((column) => {
        const field = String(column.field ?? column.id ?? '').trim();
        const label = String(column.label ?? field).trim();
        const type = this.mapColumnTypeToFilterType(column.type);
        if (!field.length || !label.length) {
          return undefined;
        }

        return {
          field,
          label,
          type
        } as FilterField;
      })
      .filter((option): option is FilterField => Boolean(option));
  }

  get canAddMoreFilters(): boolean {
    return this.filters.length < 20;
  }

  get activeFilterCount(): number {
    return this.filters.filter((filter) => this.hasValue(filter.value) && filter.field.trim().length > 0).length;
  }

  get hasValidFiltersToSave(): boolean {
    return this.activeFilterCount > 0;
  }

  ngOnInit(): void {
    this.loadBookmarks();

    this.subscriptions.add(
      this.actionDispatcher.action$.subscribe((event) => {
        if (!this.enabled || event.actionKey !== 'filter') {
          return;
        }

        this.visible = !this.visible;
        if (this.visible && this.filters.length === 0) {
          this.ensureOneEmptyRow();
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  addFilter(): void {
    if (!this.canAddMoreFilters) {
      return;
    }

    this.filters = [...this.filters, {
      id: `f-${++this.nextId}`,
      field: '',
      operator: 'contains',
      value: ''
    }];
  }

  getAvailableFilterOptions(currentIndex: number): FilterField[] {
    const selected = new Set(
      this.filters
        .filter((_, index) => index !== currentIndex)
        .map((filter) => filter.field)
        .filter((field) => field.length > 0)
    );

    return this.resolvedFilterOptions.filter((option) => !selected.has(option.field));
  }

  getFieldLabel(field: string): string {
    return this.getFieldConfig(field)?.label ?? field;
  }

  getFieldPlaceholder(field: string): string {
    const option = this.getFieldConfig(field);
    if (option?.placeholder) {
      return option.placeholder;
    }

    if (this.shouldUseValueSelect(field)) {
      return 'Select value';
    }

    if (option?.type === 'number') {
      return 'Enter number';
    }

    return 'Enter value';
  }

  shouldUseValueSelect(field: string): boolean {
    const option = this.getFieldConfig(field);
    if (!option) {
      return false;
    }

    if (option.type === 'dropdown' || option.type === 'select') {
      return true;
    }

    return Array.isArray(option.options) && option.options.length > 0;
  }

  getValueOptions(row: FilterRow): Array<{ value: unknown; label: string }> {
    const option = this.getFieldConfig(row.field);
    if (!option) {
      return [];
    }

    if (option.apiUrl) {
      return this.dropdownItems[row.id] ?? [];
    }

    return option.options ?? [];
  }

  getOperators(field: string): Array<{ value: FilterRow['operator']; label: string }> {
    const type = this.getFieldType(field);
    if (type === 'number' || type === 'date') {
      return [
        { value: 'eq', label: 'equals' },
        { value: 'ge', label: '>=' },
        { value: 'le', label: '<=' }
      ];
    }

    if (type === 'badge' || type === 'lookup' || type === 'select' || type === 'dropdown') {
      return [{ value: 'eq', label: 'equals' }];
    }

    return [
      { value: 'contains', label: 'contains' },
      { value: 'startswith', label: 'starts with' },
      { value: 'eq', label: 'equals' }
    ];
  }

  getValueInputType(field: string): 'text' | 'number' | 'date' {
    const type = this.getFieldType(field);
    if (type === 'number' || type === 'currency') {
      return 'number';
    }

    if (type === 'date') {
      return 'date';
    }

    return 'text';
  }

  openSaveBookmark(): void {
    this.showSaveInput = true;
    this.bookmarkName = '';
  }

  cancelSaveBookmark(): void {
    this.showSaveInput = false;
    this.bookmarkName = '';
  }

  saveBookmark(): void {
    const name = this.bookmarkName.trim();
    if (!name.length) {
      return;
    }

    const filters = this.filters
      .map((filter) => ({
        field: filter.field.trim(),
        operator: filter.operator,
        value: String(filter.value ?? '').trim()
      }))
      .filter((filter) => filter.field.length > 0 && filter.value.length > 0);

    if (!filters.length) {
      return;
    }

    this.bookmarks = this.bookmarks.filter((bookmark) => bookmark.name !== name);

    this.bookmarks.unshift({ name, filters, savedAt: Date.now() });
    this.persistBookmarks();
    this.cancelSaveBookmark();
  }

  applyBookmark(index: number): void {
    const bookmark = this.bookmarks[index];
    if (!bookmark) {
      return;
    }

    this.filters = bookmark.filters.map((filter) => ({
      id: `f-${++this.nextId}`,
      field: filter.field,
      operator: this.normalizeOperator(filter.operator),
      value: filter.value
    }));

    this.filters.forEach((filter) => this.preloadSelectOptions(filter));
    this.ensureOneEmptyRow();
  }

  deleteBookmark(index: number): void {
    this.bookmarks = this.bookmarks.filter((_, current) => current !== index);
    this.persistBookmarks();
  }

  clear(): void {
    this.filters = [];
    this.ensureOneEmptyRow();
    this.command.emit({ actionKey: 'advancedFilterChanged', payload: { filters: [] } });
  }

  apply(): void {
    const filters = this.filters
      .map((filter) => ({
        field: filter.field.trim(),
        operator: filter.operator,
        value: String(filter.value ?? '').trim()
      }))
      .filter((filter) => filter.field.length > 0 && filter.value.length > 0);

    this.command.emit({ actionKey: 'advancedFilterChanged', payload: { filters } });
    this.visible = false;
  }

  close(): void {
    this.visible = false;
  }

  removeFilter(index: number): void {
    this.filters = this.filters.filter((_, current) => current !== index);
    this.ensureOneEmptyRow();
    if (this.activeFilterCount === 0) {
      this.command.emit({ actionKey: 'advancedFilterChanged', payload: { filters: [] } });
    }
  }

  updateField(index: number, value: string): void {
    const row = this.filters[index];
    const hadValue = row ? this.hasValue(row.value) : false;

    this.updateFilter(index, {
      field: value,
      operator: this.defaultOperatorForField(value),
      value: ''
    });

    const updated = this.filters[index];
    if (updated) {
      this.preloadSelectOptions(updated);
    }

    this.ensureOneEmptyRow();
    if (hadValue) {
      this.emitAdvancedFilter();
    }
  }

  updateOperator(index: number, value: string): void {
    const operator = this.normalizeOperator(value);
    this.updateFilter(index, { operator });
  }

  updateValue(index: number, value: string): void {
    this.updateFilter(index, { value });
  }

  onValueLeave(): void {
    this.emitAdvancedFilter();
  }

  trackByFilter(_index: number, filter: FilterRow): string {
    return filter.id;
  }

  private loadBookmarks(): void {
    if (!this.storageKey.length) {
      return;
    }

    try {
      const raw = window.localStorage.getItem(this.storageKeyForPage());
      this.bookmarks = raw ? JSON.parse(raw) as FilterBookmark[] : [];
    } catch {
      this.bookmarks = [];
    }
  }

  private persistBookmarks(): void {
    if (!this.storageKey.length) {
      return;
    }

    try {
      window.localStorage.setItem(this.storageKeyForPage(), JSON.stringify(this.bookmarks));
    } catch {
      // ignore storage quota issues
    }
  }

  private ensureOneEmptyRow(): void {
    const hasEmpty = this.filters.some((filter) => !filter.field);
    if (!hasEmpty && this.filters.length < 20) {
      this.addFilter();
    }
  }

  private preloadSelectOptions(row: FilterRow): void {
    const config = this.getFieldConfig(row.field);
    if (!config?.apiUrl) {
      return;
    }

    if (this.fieldCache[config.field]) {
      this.dropdownItems[row.id] = this.fieldCache[config.field];
      return;
    }

    this.dropdownLoading[row.id] = true;
    const scope = this.buildFilterLoadScope(config.field);
    this.loading.begin(scope, `Loading ${config.label} options...`);
    const endpoint = `${config.apiUrl}${config.apiUrl.includes('?') ? '&' : '?'}$top=50`;
    this.rest.get(endpoint, { suppressGlobalErrorDialog: true }).subscribe({
      next: (data) => {
        const rows = this.toRecords(data);
        const valueField = config.valueField ?? 'value';
        const labelField = config.labelField ?? valueField;

        const options = rows
          .map((item) => ({
            value: item[valueField],
            label: String(item[labelField] ?? item[valueField] ?? '')
          }))
          .filter((item) => String(item.label).trim().length > 0);

        this.fieldCache[config.field] = options;
        this.dropdownItems[row.id] = options;
        this.dropdownLoading[row.id] = false;
        this.loading.end(scope);
      },
      error: () => {
        this.dropdownLoading[row.id] = false;
        this.loading.end(scope);
      }
    });
  }

  private buildFilterLoadScope(field: string): string {
    const key = this.storageKey.trim() || 'global';
    const normalizedField = field.trim().toLowerCase() || 'options';
    return `section:filter:${key}:${normalizedField}`;
  }

  private toRecords(source: unknown): Record<string, unknown>[] {
    if (Array.isArray(source)) {
      return source.filter((item): item is Record<string, unknown> => this.isRecord(item));
    }

    if (this.isRecord(source) && Array.isArray(source['value'])) {
      return source['value'].filter((item): item is Record<string, unknown> => this.isRecord(item));
    }

    return [];
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }

  private hasValue(value: unknown): boolean {
    if (value === null || value === undefined) {
      return false;
    }

    return String(value).trim().length > 0;
  }

  private storageKeyForPage(): string {
    return `app-list-filter:${this.storageKey}`;
  }

  private emitAdvancedFilter(): void {
    const filters = this.filters
      .map((filter) => ({
        field: filter.field.trim(),
        operator: filter.operator,
        value: String(filter.value ?? '').trim()
      }))
      .filter((filter) => filter.field.length > 0 && filter.value.length > 0);

    this.command.emit({ actionKey: 'advancedFilterChanged', payload: { filters } });
  }

  private getFieldConfig(field: string): FilterField | undefined {
    return this.resolvedFilterOptions.find((option) => option.field === field);
  }

  private defaultOperatorForField(field: string): FilterRow['operator'] {
    const configured = this.getFieldConfig(field)?.operator;
    if (configured === 'eq' || configured === 'ge' || configured === 'le' || configured === 'contains') {
      return configured;
    }

    const type = this.getFieldType(field);
    if (type === 'number' || type === 'date' || type === 'badge' || type === 'lookup' || type === 'select' || type === 'dropdown') {
      return 'eq';
    }

    return 'contains';
  }

  private getFieldType(field: string): string {
    return this.getFieldConfig(field)?.type ?? 'text';
  }

  private mapColumnTypeToFilterType(type: unknown): FilterField['type'] {
    const normalized = String(type ?? '').trim().toLowerCase();
    if (normalized === 'date') {
      return 'date';
    }

    if (normalized === 'currency' || normalized === 'number' || normalized === 'integer' || normalized === 'decimal') {
      return 'number';
    }

    if (normalized === 'lookup' || normalized === 'badge') {
      return 'select';
    }

    return 'text';
  }

  private updateFilter(index: number, patch: Partial<FilterRow>): void {
    this.filters = this.filters.map((filter, current) => current === index ? { ...filter, ...patch } : filter);
  }

  private normalizeOperator(value: string): FilterRow['operator'] {
    if (value === 'eq' || value === 'ge' || value === 'le' || value === 'startswith') {
      return value;
    }

    return 'contains';
  }
}
