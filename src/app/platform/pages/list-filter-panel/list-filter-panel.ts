import { buildFieldFilter } from '../list-filter-expression';
import type { ListAppliedFilter } from '../../models/list-personalization-config.model';
import type { FilterOperator } from '../../models/list-filter-config.model';
import { ListPersonalizationService } from '../list-personalization.service';
import { ChangeDetectorRef, Component, EventEmitter, HostBinding, Input, OnDestroy, OnInit, Output, inject } from '@angular/core';
import { Subscription, finalize, timeout } from 'rxjs';
import { DataSourceService } from '../../data/data-source.service';
import { ActionDispatcherService } from '../../../shared/ui/action-dispatcher.service';
import { RunModalLoadingService } from '../../run-modal/run-modal-loading.service';
import { ListFilterFieldConfig } from '../../models/list-filter-config.model';

type FilterRow = {
  id: string;
  field: string;
  operator: FilterOperator;
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
  @Input() listenToPageActions = false;
  @Input() embedded = false;
  @HostBinding('class.is-visible') get isVisible(): boolean { return this.visible; }
  @HostBinding('class.embedded') get isEmbedded(): boolean { return this.embedded; }
  validationMessage = '';
  private appliedFilters: ListAppliedFilter[] = [];
  private readonly personalization = inject(ListPersonalizationService);
  private readonly changeDetector = inject(ChangeDetectorRef);
  @Input() columns: Array<{ id?: string; label?: string; field?: string; type?: string; hidden?: boolean; filterable?: boolean; filter?: Omit<ListFilterFieldConfig, 'field' | 'label'> }> = [];
  @Input() filterOptions: ListFilterFieldConfig[] = [];
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
  private destroyed = false;
  private readonly loadingInstanceId = crypto.randomUUID();

  constructor(
    private readonly actionDispatcher: ActionDispatcherService,
    private readonly dataSource: DataSourceService,
    private readonly loading: RunModalLoadingService,
  ) {}

  get resolvedFilterOptions(): ListFilterFieldConfig[] {
    if (this.filterOptions.length > 0) {
      return this.filterOptions;
    }

    return this.columns.filter(column => !column.hidden && column.filterable !== false)
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
          type,
          options: column.type === 'boolean' ? [{ value: 'true', label: 'Yes' }, { value: 'false', label: 'No' }] : undefined,
          ...column.filter,
        } as ListFilterFieldConfig;
      })
      .filter((option): option is ListFilterFieldConfig => Boolean(option));
  }

  get canAddMoreFilters(): boolean {
    return this.filters.length < 12;
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
        if (!this.enabled || !this.listenToPageActions || event.actionKey !== 'filter') {
          return;
        }

        this.toggle();
        this.changeDetector.markForCheck();
      })
    );
  }

  ngOnDestroy(): void {
    this.destroyed = true;
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

  getAvailableFilterOptions(currentIndex: number): ListFilterFieldConfig[] {
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
      return !!option.apiUrl || !!option.options?.length;
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
        { value: 'expression', label: 'Filter expression / range' },
        { value: 'eq', label: 'equals' }, { value: 'ne', label: 'not equal' },
        { value: 'gt', label: 'greater than' }, { value: 'ge', label: 'at least' },
        { value: 'lt', label: 'less than' }, { value: 'le', label: 'at most' }
      ];
    }

    if (type === 'badge' || type === 'lookup' || type === 'select' || type === 'dropdown') {
      return [{ value: 'eq', label: 'equals' }];
    }

    return [
      { value: 'expression', label: 'Filter expression (wildcards / alternatives)' },
      { value: 'contains', label: 'contains' },
      { value: 'startswith', label: 'starts with' },
      { value: 'eq', label: 'equals' }, { value: 'ne', label: 'not equal' }
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
    if (!this.validateFilters()) return;
    const name = this.bookmarkName.trim().slice(0, 60);
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

    this.setFilters(bookmark.filters, true);
  }

  deleteBookmark(index: number): void {
    this.bookmarks = this.bookmarks.filter((_, current) => current !== index);
    this.persistBookmarks();
  }

  setFilters(filters: ListAppliedFilter[], apply = false): void {
    const valid = filters.filter(filter => !!this.getFieldConfig(filter.field));
    this.filters = valid.map(filter => ({...filter, operator: this.normalizeOperator(filter.operator), id: `f-${++this.nextId}`}));
    this.filters.forEach(filter => this.preloadSelectOptions(filter));
    this.ensureOneEmptyRow();
    if (apply) this.apply();
  }

  toggle(): void {
    if (!this.enabled) return;
    if (this.visible) this.close();
    else { this.setFilters(this.appliedFilters); this.visible = true; this.validationMessage = ''; }
  }

  clear(): void {
    this.filters = []; this.appliedFilters = []; this.validationMessage = '';
    this.ensureOneEmptyRow();
    this.command.emit({actionKey: 'advancedFilterChanged', payload: {filters: []}});
  }

  apply(): void {
    if (!this.validateFilters()) return;
    const filters = this.filters.filter(filter => filter.field && this.hasValue(filter.value))
      .map(filter => ({field: filter.field, operator: filter.operator, value: String(filter.value).trim()}));
    this.appliedFilters = structuredClone(filters);
    this.command.emit({actionKey: 'advancedFilterChanged', payload: {filters}});
    this.visible = false;
  }

  close(): void { this.setFilters(this.appliedFilters); this.visible = false; this.validationMessage = ''; }

  private validateFilters(): boolean {
    try {
      for (const filter of this.filters.filter(row => row.field && this.hasValue(row.value))) {
        const type = this.columns.find(column => (column.field ?? column.id) === filter.field)?.type ?? this.getFieldConfig(filter.field)?.valueType ?? this.getFieldType(filter.field);
        buildFieldFilter(filter.field, String(filter.value), filter.operator, type);
      }
      this.validationMessage = ''; return true;
    } catch (error) { this.validationMessage = error instanceof Error ? error.message : 'Check your filter values.'; return false; }
  }
  removeFilter(index: number): void {
    this.filters = this.filters.filter((_, current) => current !== index);
    this.ensureOneEmptyRow();
    this.validateFilters();
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
      this.validateFilters();
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
    this.validateFilters();
  }

  trackByFilter(_index: number, filter: FilterRow): string {
    return filter.id;
  }

  private loadBookmarks(): void {
    if (!this.storageKey.length) {
      return;
    }

    try {
      const stored = this.personalization.read<unknown>(this.storageKey, 'filters', []);
      this.bookmarks = Array.isArray(stored) ? stored.filter(item => item && typeof item.name === 'string' && Array.isArray(item.filters)).slice(0, 20) : [];
    } catch {
      this.bookmarks = [];
    }
  }

  private persistBookmarks(): void {
    if (!this.storageKey.length) {
      return;
    }

    try {
      this.personalization.write(this.storageKey, 'filters', this.bookmarks);
    } catch {
      // ignore storage quota issues
    }
  }

  private ensureOneEmptyRow(): void {
    if (this.filters.length === 0) {
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
    this.subscriptions.add(this.dataSource.loadList({ endpoint: config.apiUrl, pageSize: 50 }).pipe(
      timeout(15000),
      finalize(() => {
        this.dropdownLoading[row.id] = false; this.loading.end(scope);
        if (!this.destroyed) this.changeDetector.markForCheck();
      }),
    ).subscribe({
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

      },
      error: () => {
        this.validationMessage = `Unable to load ${config.label} options. Close and reopen filters to retry.`;
      }
    }));
  }

  private buildFilterLoadScope(field: string): string {
    const key = this.storageKey.trim() || 'global';
    const normalizedField = field.trim().toLowerCase() || 'options';
    return `section:filter:${key}:${this.loadingInstanceId}:${normalizedField}`;
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

  private getFieldConfig(field: string): ListFilterFieldConfig | undefined {
    return this.resolvedFilterOptions.find((option) => option.field === field);
  }

  private defaultOperatorForField(field: string): FilterRow['operator'] {
    const configured = this.getFieldConfig(field)?.operator;
    if (configured) {
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

  private mapColumnTypeToFilterType(type: unknown): ListFilterFieldConfig['type'] {
    const normalized = String(type ?? '').trim().toLowerCase();
    if (normalized === 'date') {
      return 'date';
    }

    if (normalized === 'currency' || normalized === 'number' || normalized === 'integer' || normalized === 'decimal') {
      return 'number';
    }

    if (normalized === 'lookup' || normalized === 'badge' || normalized === 'boolean') {
      return 'select';
    }

    return 'text';
  }

  private updateFilter(index: number, patch: Partial<FilterRow>): void {
    this.filters = this.filters.map((filter, current) => current === index ? { ...filter, ...patch } : filter);
  }

  private normalizeOperator(value: string): FilterRow['operator'] {
    if (value === 'eq' || value === 'ge' || value === 'le' || value === 'startswith' || value === 'ne' || value === 'gt' || value === 'lt' || value === 'expression') {
      return value;
    }

    return 'contains';
  }
}
