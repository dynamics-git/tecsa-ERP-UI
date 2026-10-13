import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FieldFactPanelConfig } from '../../models/field-config.model';
import { ListPageColumnConfig, ListPageConfig } from '../../models/page-config.model';

type DisplayColumn = ListPageColumnConfig & {
  primary?: boolean;
  sortable?: boolean;
  filterable?: boolean;
};

type FactPanelDisplayField = {
  label: string;
  field?: string;
  type?: string;
  currencyCode?: string;
  order: number;
  fallback?: string;
};

@Component({
  selector: 'app-list-fact-box',
  standalone: true,
  imports: [],
  templateUrl: './list-fact-box.html',
  styleUrl: './list-fact-box.scss',
})
export class ListFactBox {
  @Input() config?: ListPageConfig;
  @Input() selectedRow?: unknown;
  @Output() closeRequested = new EventEmitter<void>();

  collapsed = false;

  get label(): string {
    const factPanel = this.config?.factPanel;
    const configured = this.toText(factPanel?.label).trim();
    if (configured.length && !this.isGenericLabel(configured)) {
      return configured;
    }

    const labelField = factPanel?.binding?.labelField;
    const labelFallbackFields = factPanel?.binding?.labelFallbackFields ?? [];

    const rowLabel = this.toText(
      (labelField ? this.read(this.selectedRow, labelField) : undefined) ??
        this.readFirst(this.selectedRow, labelFallbackFields),
    ).trim();
    if (rowLabel.length) {
      return rowLabel;
    }

    return 'Record';
  }

  get title(): string {
    const factPanel = this.config?.factPanel;
    const titleField = factPanel?.binding?.titleField;
    const fallbackFields = factPanel?.binding?.titleFallbackFields?.length
      ? factPanel.binding.titleFallbackFields
      : this.defaultTitleFields;

    return String(
      (titleField ? this.read(this.selectedRow, titleField) : undefined) ??
        this.readFirst(this.selectedRow, fallbackFields) ??
        factPanel?.title ??
        this.config?.title ??
        '',
    );
  }

  get subtitle(): string {
    const factPanel = this.config?.factPanel;
    const configured = this.toText(factPanel?.subtitle).trim();
    if (configured.length && !this.isGenericSubtitle(configured)) {
      return configured;
    }

    const subtitleField = factPanel?.binding?.subtitleField;
    const subtitleFallbackFields =
      factPanel?.binding?.subtitleFallbackFields ?? this.defaultSubtitleFields;

    const rowSubtitle = this.toText(
      (subtitleField ? this.read(this.selectedRow, subtitleField) : undefined) ??
        this.readFirst(this.selectedRow, subtitleFallbackFields),
    ).trim();
    if (rowSubtitle.length) {
      return rowSubtitle;
    }

    const module = this.toText(this.config?.module).trim();
    if (module.length) {
      return module;
    }

    return configured;
  }

  get summaryValue(): string {
    const factPanel = this.config?.factPanel;
    const summaryField = factPanel?.binding?.summaryField;
    if (!summaryField) {
      return '';
    }

    const summaryColumn = this.findColumnByField(summaryField);
    const fallbackFields = factPanel?.binding?.summaryFallbackFields?.length
      ? factPanel.binding.summaryFallbackFields
      : [];

    const summaryValue =
      (summaryField ? this.read(this.selectedRow, summaryField) : undefined) ??
      this.readFirst(this.selectedRow, fallbackFields) ??
      '';

    return this.formatValue(summaryValue, {
      id: 'summary',
      label: 'Summary',
      type: factPanel?.binding?.summaryType ?? summaryColumn?.type,
      currencyCode: summaryColumn?.currencyCode,
    });
  }

  get summaryLabel(): string {
    const factPanel = this.config?.factPanel;
    const summaryField = factPanel?.binding?.summaryField;
    const summaryColumn = summaryField ? this.findColumnByField(summaryField) : undefined;
    return summaryColumn?.label ?? 'Summary';
  }

  get hasSummary(): boolean {
    return this.summaryValue.trim().length > 0;
  }

  get hasStatus(): boolean {
    return this.status.trim().length > 0;
  }

  get sections(): Array<{ title: string; fields: FactPanelDisplayField[] }> {
    const factPanel = this.config?.factPanel;
    if (factPanel?.sections?.length) {
      return factPanel.sections.map((section) => ({
        title: section.title,
        fields: (section.fields ?? []).map((field) => ({
          ...field,
          ...this.pickColumnFormat(field.field),
          order: 0,
        })),
      }));
    }

    const sections = new Map<string, { title: string; fields: FactPanelDisplayField[] }>();

    this.factPanelColumns.forEach((column, index) => {
      const factPanelConfig = this.resolveColumnFactPanelConfig(column);
      if (!factPanelConfig) {
        return;
      }

      const field = this.resolveColumnField(column);
      if (!field.length) {
        return;
      }

      const sectionId = this.toText(factPanelConfig.sectionId).trim() || 'details';
      const title = this.toText(factPanelConfig.sectionTitle).trim() || 'Details';
      const existing = sections.get(sectionId) ?? { title, fields: [] };
      existing.fields.push({
        label: this.toText(factPanelConfig.label).trim() || column.label,
        field,
        type: column.type,
        currencyCode: column.currencyCode,
        order: Number.isFinite(factPanelConfig.order) ? Number(factPanelConfig.order) : index,
        fallback: factPanelConfig.fallback,
      });
      sections.set(sectionId, existing);
    });

    return Array.from(sections.values()).map((section) => ({
      ...section,
      fields: [...section.fields].sort((left, right) => left.order - right.order),
    }));
  }

  private get columns(): ListPageColumnConfig[] {
    return this.config?.dataSurface?.columns ?? [];
  }

  private get visibleColumns(): ListPageColumnConfig[] {
    return this.columns.filter((column) => column.hidden !== true);
  }

  private get factPanelColumns(): ListPageColumnConfig[] {
    return this.columns;
  }

  private get defaultTitleFields(): string[] {
    const primary = this.visibleColumns.find(
      (column) => column.isPrimary || (column as DisplayColumn).primary,
    );
    const field = primary ? this.resolveColumnField(primary) : '';
    return field ? [field] : [];
  }

  private get defaultSubtitleFields(): string[] {
    const primary = this.visibleColumns.find(
      (column) => column.isPrimary || (column as DisplayColumn).primary,
    );
    const subtitleField = (primary as DisplayColumn | undefined)?.subtitleField;
    if (subtitleField) {
      return [subtitleField];
    }

    const status = this.visibleColumns.find(
      (column) =>
        column.type === 'badge' ||
        column.id?.toLowerCase() === 'status' ||
        column.field?.toLowerCase() === 'status',
    );
    const field = status ? this.resolveColumnField(status) : '';
    return field ? [field] : [];
  }

  private resolveColumnField(column: ListPageColumnConfig): string {
    return String(column.field ?? column.id ?? '').trim();
  }

  private resolveColumnFactPanelConfig(
    column: ListPageColumnConfig,
  ): FieldFactPanelConfig | undefined {
    if (column.factPanel === true) {
      return {};
    }

    if (this.isRecord(column.factPanel)) {
      const factPanel = column.factPanel as FieldFactPanelConfig;
      return factPanel.show === false ? undefined : factPanel;
    }

    return undefined;
  }

  private findColumnByField(field: string): ListPageColumnConfig | undefined {
    const normalized = field.trim().toLowerCase();
    if (!normalized.length) {
      return undefined;
    }

    return this.columns.find((column) => this.resolveColumnField(column).toLowerCase() === normalized);
  }

  private pickColumnFormat(field: string | undefined): { type?: string; currencyCode?: string } {
    if (!field) {
      return {};
    }

    const column = this.findColumnByField(field);
    return {
      type: column?.type,
      currencyCode: column?.currencyCode,
    };
  }

  get status(): string {
    const behavior = this.config?.behavior;

    const candidates: string[] = [];
    if (behavior?.statusField) {
      candidates.push(behavior.statusField);
    }

    if (Array.isArray(behavior?.statusFallbackFields) && behavior.statusFallbackFields.length) {
      candidates.push(...behavior.statusFallbackFields);
    }

    return String(this.readFirst(this.selectedRow, candidates) ?? behavior?.statusDefault ?? '');
  }

  get tone(): string {
    const behavior = this.config?.behavior;

    const candidates: string[] = [];
    if (behavior?.toneField) {
      candidates.push(behavior.toneField);
    }

    if (Array.isArray(behavior?.toneFallbackFields) && behavior.toneFallbackFields.length) {
      candidates.push(...behavior.toneFallbackFields);
    }

    return String(this.readFirst(this.selectedRow, candidates) ?? behavior?.toneDefault ?? '');
  }

  toggleCollapsed(): void {
    this.collapsed = !this.collapsed;
  }

  requestClose(): void {
    this.closeRequested.emit();
  }

  getFieldValue(field: FactPanelDisplayField): string {
    if (field.field) {
      const formatted = this.formatValue(this.read(this.selectedRow, field.field), {
        id: field.field,
        label: field.label,
        type: field.type,
        currencyCode: field.currencyCode,
      });

      return formatted.length ? formatted : this.toText(field.fallback);
    }

    return this.toText(field.fallback);
  }

  hasFieldValue(field: FactPanelDisplayField): boolean {
    return this.getFieldValue(field).trim().length > 0;
  }

  hasSectionFields(section: { fields: FactPanelDisplayField[] }): boolean {
    return section.fields.some((field) => this.hasFieldValue(field));
  }

  private read(target: unknown, path: string): unknown {
    if (!target || !path) {
      return undefined;
    }

    const source = this.toRecord(target);
    if (!source) {
      return undefined;
    }

    if (path in source) {
      return source[path];
    }

    const lowerPath = path.toLowerCase();
    const directMatch = Object.keys(source).find((key) => key.toLowerCase() === lowerPath);
    if (directMatch) {
      return source[directMatch];
    }

    if (!path.includes('.')) {
      return undefined;
    }

    return path.split('.').reduce<unknown>((value, key) => {
      const next = this.toRecord(value);
      if (!next) {
        return undefined;
      }

      if (key in next) {
        return next[key];
      }

      const lowerKey = key.toLowerCase();
      const nestedMatch = Object.keys(next).find(
        (candidate) => candidate.toLowerCase() === lowerKey,
      );
      return nestedMatch ? next[nestedMatch] : undefined;
    }, source);
  }

  private readFirst(target: unknown, paths: string[]): unknown {
    for (const path of paths) {
      const value = this.read(target, path);
      if (value !== undefined && value !== null && value !== '') {
        return value;
      }
    }

    return undefined;
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

    if (
      (column.type === 'number' || column.type === 'currency') &&
      (typeof value === 'number' || typeof value === 'string')
    ) {
      const numeric = typeof value === 'number' ? value : Number(String(value).replace(/,/g, ''));
      if (!Number.isNaN(numeric)) {
        const formatted = new Intl.NumberFormat('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(numeric);

        if (column.type === 'currency') {
          const code = this.toText(column.currencyCode).trim();
          return code ? `${code} ${formatted}` : formatted;
        }

        return formatted;
      }
    }

    return String(value);
  }

  private isGenericSubtitle(value: string): boolean {
    const normalized = value.trim().toLowerCase();
    return (
      normalized === 'document factbox' ||
      normalized === 'factbox' ||
      normalized === 'list fact panel'
    );
  }

  private isGenericLabel(value: string): boolean {
    const normalized = value.trim().toLowerCase();
    return (
      normalized === 'list fact panel' || normalized === 'fact panel' || normalized === 'factbox'
    );
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }

  private toRecord(value: unknown): Record<string, unknown> | undefined {
    if (typeof value === 'object' && value !== null) {
      return value as Record<string, unknown>;
    }

    return undefined;
  }

  private toText(value: unknown): string {
    return value === null || value === undefined ? '' : String(value);
  }
}
