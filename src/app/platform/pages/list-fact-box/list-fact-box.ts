import { viewChild } from '@angular/core';
import { FactBox } from '../../../shared/ui/fact-box/fact-box';
import { DataSourceService } from '../../data/data-source.service';
import type { FactBoxSectionConfig } from '../../models/document-window-config.model';
import type { FactBoxContext } from '../../models/fact-box-context.model';
import { resolvePageIdentity } from '../../data/record-identity';
import { automaticDetailFields, detailValue } from '../fact-box-display';
import { SessionService } from '../../../core/services/session.service';
import { PageAccessService } from '../../../core/services/page-access.service';
import { formatRecordValue } from '../record-value-formatter';
import { Component, EventEmitter, Input, Output, OnChanges, inject } from '@angular/core';
import { FieldFactBoxConfig } from '../../models/field-config.model';
import { ListPageColumnConfig, ListPageConfig } from '../../models/page-config.model';

type FactBoxDisplayField = {
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
  imports: [FactBox],
  templateUrl: './list-fact-box.html',
  styleUrl: './list-fact-box.scss',
})
export class ListFactBox implements OnChanges {
  recordWasSelected = false;
  ngOnChanges(): void { if (this.hasRecord) this.recordWasSelected = true; }
  private readonly session = inject(SessionService);
  private readonly access = inject(PageAccessService);
  private readonly factBox = viewChild(FactBox);
  canLeave(): Promise<boolean> { return this.factBox()?.canLeave() ?? Promise.resolve(true); }
  private readonly source = inject(DataSourceService);
  @Input() config?: ListPageConfig;
  @Input() selectedRow?: unknown;
  @Output() action = new EventEmitter<string>();
  @Output() closeRequested = new EventEmitter<void>();

  get context(): FactBoxContext {
    const row = this.toRecord(this.selectedRow), source = this.config?.dataSource;
    const id = row?.[source?.keyField ?? 'systemId'];
    return {companyId: this.session.Company, pageId: this.config?.pageId, record: row,
      recordEndpoint: source && id ? (source.singleton ? source.endpoint : this.source.recordEndpoint(source, id)) : undefined};
  }
  get displaySections(): FactBoxSectionConfig[] {
    const sections = this.sections.map((section, index) => ({
      ...section, id: this.config?.factBox?.sections?.[index]?.id ?? 'section-' + index,
      rows: section.fields.filter(field => this.access.field(this.config?.pageId ?? '', 'header', field.field ?? '').visible && this.hasFieldValue(field)).map(field => ({label: field.label, value: this.getFieldValue(field), tooltip: this.getFieldTooltip(field), badge: field.type === 'badge'})),
    }));
    if (this.hasSummary || this.hasStatus) sections.unshift({id: 'summary', title: 'Overview', rows: [
      ...(this.hasSummary ? [{label: this.summaryLabel, value: this.summaryValue}] : []),
      ...(this.hasStatus ? [{label: 'Status', value: this.status}] : []),
    ]} as typeof sections[number]);
    return sections;
  }

  collapsed = false;

  get hasRecord(): boolean { return this.isRecord(this.selectedRow) && Object.keys(this.selectedRow).length > 0; }

  get label(): string {
    const factBox = this.config?.factBox;
    const configured = this.toText(factBox?.label).trim();
    if (configured.length && !this.isGenericLabel(configured)) {
      return configured;
    }

    const labelField = factBox?.binding?.labelField;
    const labelFallbackFields = factBox?.binding?.labelFallbackFields ?? [];

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
    const factBox = this.config?.factBox;
    const titleField = factBox?.binding?.titleField;
    const fallbackFields = factBox?.binding?.titleFallbackFields?.length
      ? factBox.binding.titleFallbackFields
      : [];

    return String(
      (titleField ? this.read(this.selectedRow, titleField) : undefined) ??
        this.readFirst(this.selectedRow, fallbackFields) ??
        factBox?.title ??
        (resolvePageIdentity(this.access.displayRecord(this.config?.pageId ?? '', 'header', this.selectedRow), this.config).primary || undefined) ??
        this.config?.title ??
        '',
    );
  }

  get subtitle(): string {
    const factBox = this.config?.factBox;
    const configured = this.toText(factBox?.subtitle).trim();
    if (configured.length && !this.isGenericSubtitle(configured)) {
      return configured;
    }

    const subtitleField = factBox?.binding?.subtitleField;
    const subtitleFallbackFields =
      factBox?.binding?.subtitleFallbackFields ?? [];

    const rowSubtitle = this.toText(
      (subtitleField ? this.read(this.selectedRow, subtitleField) : undefined) ??
        this.readFirst(this.selectedRow, subtitleFallbackFields),
    ).trim();
    if (rowSubtitle.length) {
      return rowSubtitle;
    }

    const identitySubtitle = resolvePageIdentity(this.access.displayRecord(this.config?.pageId ?? '', 'header', this.selectedRow), this.config).secondary;
    if (identitySubtitle) return identitySubtitle;
    const module = this.toText(this.config?.module).trim();
    if (module.length) {
      return module;
    }

    return configured;
  }

  get summaryValue(): string {
    const factBox = this.config?.factBox;
    const summaryField = factBox?.binding?.summaryField;
    if (!summaryField) {
      return '';
    }

    const summaryColumn = this.findColumnByField(summaryField);
    const fallbackFields = factBox?.binding?.summaryFallbackFields?.length
      ? factBox.binding.summaryFallbackFields
      : [];

    const summaryValue =
      (summaryField ? this.read(this.selectedRow, summaryField) : undefined) ??
      this.readFirst(this.selectedRow, fallbackFields) ??
      '';

    return this.formatValue(summaryValue, {
      id: 'summary',
      label: 'Summary',
      type: factBox?.binding?.summaryType ?? summaryColumn?.type,
      currencyCode: summaryColumn?.currencyCode,
    });
  }

  get summaryLabel(): string {
    const factBox = this.config?.factBox;
    const summaryField = factBox?.binding?.summaryField;
    const summaryColumn = summaryField ? this.findColumnByField(summaryField) : undefined;
    return summaryColumn?.label ?? 'Summary';
  }

  get hasSummary(): boolean {
    return this.summaryValue.trim().length > 0;
  }

  get hasStatus(): boolean {
    return this.status.trim().length > 0;
  }

  get sections(): Array<{ title: string; subtitle?: string; collapsed?: boolean; layout?: 'details' | 'metrics'; buttons?: FactBoxSectionConfig['buttons']; fields: FactBoxDisplayField[] }> {
    const factBox = this.config?.factBox;
    if (factBox?.sections?.length) {
      return factBox.sections.map((section) => ({
        title: section.title, subtitle: section.subtitle, collapsed: section.collapsed, layout: section.layout, buttons: section.buttons,
        fields: (section.fields ?? []).map((field) => ({
          ...this.pickColumnFormat(field.field),
          ...field,
          order: 0,
        })),
      }));
    }

    const sections = new Map<string, { title: string; fields: FactBoxDisplayField[] }>();

    this.factBoxColumns.forEach((column, index) => {
      const factBoxConfig = this.resolveColumnFactBoxConfig(column);
      if (!factBoxConfig) {
        return;
      }

      const field = this.resolveColumnField(column);
      if (!field.length) {
        return;
      }

      const sectionId = this.toText(factBoxConfig.sectionId).trim() || 'details';
      const title = this.toText(factBoxConfig.sectionTitle).trim() || 'Details';
      const existing = sections.get(sectionId) ?? { title, fields: [] };
      existing.fields.push({
        label: this.toText(factBoxConfig.label).trim() || column.label,
        field,
        type: column.type,
        currencyCode: column.currencyCode,
        order: Number.isFinite(factBoxConfig.order) ? Number(factBoxConfig.order) : index,
        fallback: factBoxConfig.fallback,
      });
      sections.set(sectionId, existing);
    });

    if (!sections.size && this.hasRecord) return this.buildAutomaticSections();

    return Array.from(sections.values()).map((section) => ({
      ...section,
      fields: [...section.fields].sort((left, right) => left.order - right.order),
    }));
  }

  private buildAutomaticSections(): Array<{title: string; fields: FactBoxDisplayField[]}> {
    const row = this.toRecord(this.selectedRow) ?? {};
    const fields = automaticDetailFields(this.columns.map(column => ({...column, field: this.resolveColumnField(column)})), row).map((field, order) => ({...field, order}));
    return fields.length ? [{title: 'Record details', fields}] : [];
  }

  private get columns(): ListPageColumnConfig[] {
    return this.config?.dataSurface?.columns ?? [];
  }

  private get factBoxColumns(): ListPageColumnConfig[] {
    return this.columns;
  }

  private resolveColumnField(column: ListPageColumnConfig): string {
    return String(column.field ?? column.id ?? '').trim();
  }

  private resolveColumnFactBoxConfig(
    column: ListPageColumnConfig,
  ): FieldFactBoxConfig | undefined {
    if (column.factBox === true) {
      return {};
    }

    if (this.isRecord(column.factBox)) {
      const factBox = column.factBox as FieldFactBoxConfig;
      return factBox.show === false ? undefined : factBox;
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

  getFieldValue(field: FactBoxDisplayField): string {
    if (field.field) {
      const caption = this.read(this.selectedRow, '__display_' + field.field);
      if (typeof caption === 'string') return caption;
      if (field.type === 'guid') return '';
      const column = this.findColumnByField(field.field);
      const option = column?.filter?.options?.find(option => String(option.value) === String(this.read(this.selectedRow, field.field!)));
      if (option) return option.label;
      const formatted = detailValue(this.toRecord(this.selectedRow) ?? {}, field, {
        id: this.session.UserId,
        name: this.toText(this.read(this.session.User, 'name')) || this.session.UserName,
      });

      return formatted.length ? formatted : this.toText(field.fallback);
    }

    return this.toText(field.fallback);
  }

  getFieldTooltip(field: FactBoxDisplayField): string {
    return field.field && /^(system)?(created|modified)(at|by)$/i.test(field.field.replace(/_/g, ''))
      ? this.toText(this.read(this.selectedRow, field.field)) : '';
  }

  hasFieldValue(field: FactBoxDisplayField): boolean {
    return this.getFieldValue(field).trim().length > 0;
  }

  hasSectionFields(section: { fields: FactBoxDisplayField[] }): boolean {
    return section.fields.some((field) => this.hasFieldValue(field));
  }

  private read(target: unknown, path: string): unknown {
    if (!this.access.field(this.config?.pageId ?? '', 'header', path).visible) return undefined;
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
    return formatRecordValue(value, column);
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
