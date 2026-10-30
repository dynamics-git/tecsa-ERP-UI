import { viewChild } from '@angular/core';
import { DataSourceService } from '../../data/data-source.service';
import type { DataSourceConfig } from '../../models/data-source-config.model';
import type { FactBoxContext } from '../../models/fact-box-context.model';
import { FactBoxToggle } from '../../../shared/ui/fact-box-toggle/fact-box-toggle';
import { automaticDetailFields, detailValue } from '../../pages/fact-box-display';
import { SessionService } from '../../../core/services/session.service';
import type { FactBoxConfig } from '../../models/fact-box-config.model';
import { LoadingIndicator } from '../../../shared/ui/loading-indicator/loading-indicator';
import type { CommandConfig } from '../../models/command-config.model';
import { NgTemplateOutlet } from '@angular/common';
import { Component, ElementRef, EventEmitter, HostListener, Input, Output, inject, viewChildren } from '@angular/core';
import { DynamicForm } from '../../../shared/ui/dynamic-form/dynamic-form';
import { FieldValidationResult } from '../field-validation.service';
import { FactBox } from '../../../shared/ui/fact-box/fact-box';
import { ViewChild } from '@angular/core';
import { DocumentLines } from '../document-lines/document-lines';
import { FieldConfig, FieldFactBoxConfig } from '../../models/field-config.model';
import { LineColumnConfig } from '../../models/line-config.model';
import { AttachmentsConfig, CommandBarConfig, FooterRowConfig, FooterSectionConfig, LineCommandPolicyConfig, LinePlacementConfig, DocumentDetailType, HeaderSectionConfig, LineTotalsConfig, DocumentStatusMessage, FactBoxSectionConfig } from '../../models/document-window-config.model';
import { ApiErrorService } from '../../data/api-error.service';

export type DocumentWindowActionEvent = { actionKey: string; payload?: unknown };
type CommandGroup = { name: string; buttons: CommandConfig[] };
type FactBoxDraftSection = {
  id: string;
  title: string;
  buttons?: FactBoxSectionConfig['buttons'];
  order: number;
  rows: Array<{ label: string; value: string; order: number }>;
};

@Component({
  selector: 'app-document-window',
  host: {'[style.--ts-factbox-width]': 'factBoxConfig?.width ?? null'},
  standalone: true,
  imports: [FactBoxToggle, LoadingIndicator, DynamicForm, DocumentLines, FactBox, NgTemplateOutlet],
  templateUrl: './document-window.html',
  styleUrl: './document-window.scss'
})
export class DocumentWindow {
  readonly collapsedSections = new Set<string>();
  linesCollapsed = false;
  factBoxOpen = true;
  private readonly factBox = viewChild(FactBox);
  canLeaveFactBox(): Promise<boolean> { return this.factBox()?.canLeave() ?? Promise.resolve(true); }
  async requestClose(): Promise<void> { if (await this.canLeaveFactBox()) this.closed.emit(); }
  private preferredLineGridHeight?: number;
  readonly minLineGridHeight = 96;
  readonly maxLineGridHeight = 640;
  get lineGridHeight(): number {
    // Size to entered rows, not the empty entry placeholders. Long documents scroll inside the grid.
    const automatic = 36 + Math.max(2, Math.min(this.enteredLineCount, 12)) * 33 + 16;
    return Math.max(this.minLineGridHeight, Math.min(this.maxLineGridHeight, this.preferredLineGridHeight ?? automatic));
  }
  set lineGridHeight(value: number) {
    if (Number.isFinite(value)) this.preferredLineGridHeight = Math.max(this.minLineGridHeight, Math.min(this.maxLineGridHeight, value));
  }
  resetLineGridHeight(): void { this.preferredLineGridHeight = undefined; }
  private lineResize?: { y: number; height: number };
  toggleSection(id: string): void {
    if (this.collapsedSections.has(id)) this.collapsedSections.delete(id); else this.collapsedSections.add(id);
  }
  resizeLines(event: PointerEvent): void {
    event.preventDefault();
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    this.lineResize = { y: event.clientY, height: this.lineGridHeight };
  }
  moveLineResize(event: PointerEvent): void {
    if (this.lineResize) this.lineGridHeight = this.lineResize.height + event.clientY - this.lineResize.y;
  }
  stopLineResize(): void { this.lineResize = undefined; }
  resizeLinesByKeyboard(event: KeyboardEvent): void {
    if (event.key === 'Home') { event.preventDefault(); this.resetLineGridHeight(); return; }
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
    event.preventDefault();
    this.lineGridHeight = this.lineGridHeight + (event.key === 'ArrowDown' ? 32 : -32);
  }

  private static readonly GLOBAL_LINE_PRIMARY_COMMANDS = new Set(['cmd:line-new', 'line-new', 'cmd:line-delete', 'line-delete']);

  private readonly apiError = inject(ApiErrorService);
  private readonly hostElement = inject(ElementRef<HTMLElement>);
  @Input() overlayZIndex = 21;
  @Input() embedded = false;
  @Input() worksheet = false;
  @Input() pageLabel?: string;
  @Input() title?: string;
  @Input() subtitle?: string;
  @Input() headerCommandBar?: CommandBarConfig;
  @Input() lineCommandBar?: CommandBarConfig;
  @Input() lineCommandPolicy?: LineCommandPolicyConfig;
  @Input() linePlacement?: LinePlacementConfig;
  @Input() headerToolbarButtons?: CommandConfig[];
  @Input() lineToolbarButtons?: CommandConfig[];
  @Input() detailToolbarButtons?: CommandConfig[];
  @Input() headerSections?: HeaderSectionConfig[];
  @Input() headerData?: Record<string, unknown>;
  @Input() lineColumns?: LineColumnConfig[];
  @Input() lineRows?: Record<string, unknown>[];
  get enteredLineCount(): number { return this.resolvedLineRows.filter(row => !row['__entryPlaceholder']).length; }
  @Input() lineTotals?: LineTotalsConfig;
  @Input() footerSections?: FooterSectionConfig[];
  @Input() attachments?: AttachmentsConfig;
  private readonly session = inject(SessionService);
  private readonly forms = viewChildren(DynamicForm);
  validateHeaderForms(): boolean { return this.forms().map(form => form.validate()).every(Boolean); }
  validate(field: string, value: unknown): Promise<FieldValidationResult> {
    if (this.interactionLocked) return Promise.resolve({valid:false,errors:['Wait for the current operation to finish.']});
    const form = this.forms().find(form => form.sections.some(section => section.fields.some(item => item.key === field)));
    return form?.validateField(field,value) ?? Promise.resolve({valid:false,errors:['Unknown field: ' + field]});
  }
  validateLine(row: Record<string,unknown>, field: string, value: unknown): Promise<FieldValidationResult> {
    if (this.interactionLocked) return Promise.resolve({valid:false,errors:['Wait for the current operation to finish.']});
    return this.lineEditor?.validate(row,field,value) ?? Promise.resolve({valid:false,errors:['Line editor is unavailable.']});
  }
  @Input() preferenceKey = '';
  @Input() factBoxConfig?: FactBoxConfig;
  @Input() factBoxDataSource?: DataSourceConfig;
  private readonly factBoxSource = inject(DataSourceService);
  @Input() factBoxSections?: FactBoxSectionConfig[];
  @Input() statusMessage?: DocumentStatusMessage;
  @Input() contentReady = true;
  @Input() interactionLocked = false;
  @Output() closed = new EventEmitter<void>();
  @Output() action = new EventEmitter<DocumentWindowActionEvent>();

  maximized = false;
  activeDocumentDetail: DocumentDetailType | null = null;
  private selectedLineIndexes: number[] = [];
  private activeLineRow?: Record<string, unknown>;

  private readonly emptyAttachments: AttachmentsConfig = {
    headerFilesCount: 0,
    lineFilesCount: 0,
    canUpload: false,
    primaryActionLabel: '',
    primaryActionKey: ''
  };

  private readonly emptyLineTotals: LineTotalsConfig = {
    subtotal: '',
    sst: '',
    total: '',
    difference: ''
  };

  get resolvedHeaderSections(): HeaderSectionConfig[] {
    return this.headerSections ?? [];
  }

  get resolvedHeaderToolbarButtons(): CommandConfig[] {
    return (this.headerToolbarButtons ?? []).filter((button) => button.hidden !== true && !this.isRowTool(button));
  }

  get resolvedPrimaryHeaderToolbarButtons(): CommandConfig[] {
    const sorted = this.getSortedHeaderToolbarButtons();
    const primary = sorted.filter((button) => button.isPrimary === true);
    const limit = this.resolvePrimaryActionsLimit(primary.length);
    return primary.slice(0, limit);
  }

  get resolvedGroupedHeaderToolbarButtons(): CommandGroup[] {
    const sorted = this.getSortedHeaderToolbarButtons();
    const primaryKeys = new Set(this.resolvedPrimaryHeaderToolbarButtons.map((button) => this.toButtonKey(button)));
    const menuButtons = sorted.filter((button) => !primaryKeys.has(this.toButtonKey(button)));
    if (!menuButtons.length) {
      return [];
    }

    const grouped = new Map<string, CommandConfig[]>();
    const order: string[] = [];

    for (const button of menuButtons) {
      const groupName = this.toText(button.group).trim() || 'General';
      if (!grouped.has(groupName)) {
        grouped.set(groupName, []);
        order.push(groupName);
      }

      grouped.get(groupName)?.push(button);
    }

    const visibleGroups = this.resolveVisibleGroupLimit(order.length);
    const visibleNames = order.slice(0, visibleGroups);
    const hiddenNames = order.slice(visibleGroups);
    const result: CommandGroup[] = visibleNames.map((name) => ({
      name,
      buttons: grouped.get(name) ?? []
    }));

    if (hiddenNames.length) {
      const hiddenButtons = hiddenNames.flatMap((name) => grouped.get(name) ?? []);
      const existingMoreIndex = result.findIndex((group) => group.name.toLowerCase() === 'more');
      if (existingMoreIndex >= 0) {
        result[existingMoreIndex] = {
          ...result[existingMoreIndex],
          buttons: [...result[existingMoreIndex].buttons, ...hiddenButtons]
        };
      } else {
        result.push({ name: 'More', buttons: hiddenButtons });
      }
    }

    return result;
  }

  private isRowTool(button: CommandConfig): boolean {
    return ['line-copy', 'line-copy-rows', 'line-paste'].includes(button.actionKey.replace(/^cmd:/i, '').toLowerCase());
  }

  get resolvedLineRowCommands(): CommandConfig[] {
    const commands = this.worksheet ? this.headerToolbarButtons : this.lineToolbarButtons;
    return (commands ?? []).filter(button => !button.hidden && this.isRowTool(button));
  }

  get resolvedLineToolbarButtons(): CommandConfig[] {
    const configured = [...(this.lineToolbarButtons ?? [])].filter((button) => button.hidden !== true && !this.isRowTool(button));
    const injectLineNew = this.lineCommandPolicy?.injectDefaultLineNew === true;
    const injectLineDelete = this.lineCommandPolicy?.injectDefaultLineDelete === true;

    if (injectLineNew && !configured.some((button) => this.isLineNewCommand(button.actionKey))) {
      configured.unshift({
        label: 'Line',
        actionKey: 'cmd:line-new',
        group: 'Process',
        isPrimary: true,
        order: 10,
        icon: 'ts-icon ts-icon-plus'
      });
    }

    if (injectLineDelete && !configured.some((button) => this.isLineDeleteCommand(button.actionKey))) {
      configured.push({
        label: 'Delete',
        actionKey: 'cmd:line-delete',
        group: 'Process',
        isPrimary: true,
        order: 15,
        icon: 'ts-icon ts-icon-trash'
      });
    }

    return configured;
  }

  get resolvedPrimaryLineToolbarButtons(): CommandConfig[] {
    const sorted = this.getSortedLineToolbarButtons();
    const primary = sorted.filter((button) => button.isPrimary === true || this.isGlobalLinePrimaryCommand(button.actionKey));
    const globalPrimaryCount = primary.filter((button) => this.isGlobalLinePrimaryCommand(button.actionKey)).length;
    const limit = Math.max(this.resolveLinePrimaryActionsLimit(primary.length), globalPrimaryCount);
    return primary.slice(0, limit);
  }

  get resolvedGroupedLineToolbarButtons(): CommandGroup[] {
    const sorted = this.getSortedLineToolbarButtons();
    const primaryKeys = new Set(this.resolvedPrimaryLineToolbarButtons.map((button) => this.toButtonKey(button)));
    const menuButtons = sorted.filter((button) => !primaryKeys.has(this.toButtonKey(button)));
    if (!menuButtons.length) {
      return [];
    }

    const grouped = new Map<string, CommandConfig[]>();
    const order: string[] = [];

    for (const button of menuButtons) {
      const groupName = this.toText(button.group).trim() || 'General';
      if (!grouped.has(groupName)) {
        grouped.set(groupName, []);
        order.push(groupName);
      }

      grouped.get(groupName)?.push(button);
    }

    const visibleGroups = this.resolveLineVisibleGroupLimit(order.length);
    const visibleNames = order.slice(0, visibleGroups);
    const hiddenNames = order.slice(visibleGroups);
    const result: CommandGroup[] = visibleNames.map((name) => ({ name, buttons: grouped.get(name) ?? [] }));

    if (hiddenNames.length) {
      const hiddenButtons = hiddenNames.flatMap((name) => grouped.get(name) ?? []);
      const existingMoreIndex = result.findIndex((group) => group.name.toLowerCase() === 'more');
      if (existingMoreIndex >= 0) {
        result[existingMoreIndex] = {
          ...result[existingMoreIndex],
          buttons: [...result[existingMoreIndex].buttons, ...hiddenButtons]
        };
      } else {
        result.push({ name: 'More', buttons: hiddenButtons });
      }
    }

    return result;
  }

  get resolvedDetailToolbarButtons(): CommandConfig[] {
    return (this.detailToolbarButtons ?? []).filter((button) => button.hidden !== true);
  }

  private readonly emptyHeaderData: Record<string, unknown> = {};
  get resolvedHeaderData(): Record<string, unknown> {
    return this.headerData ?? this.emptyHeaderData;
  }

  get resolvedLineColumns(): LineColumnConfig[] {
    return this.lineColumns ?? [];
  }

  get resolvedLineRows(): Record<string, unknown>[] {
    return this.lineRows ?? [];
  }

  get resolvedLineTotals(): LineTotalsConfig {
    return this.lineTotals ?? this.emptyLineTotals;
  }

  get resolvedFooterSections(): FooterSectionConfig[] {
    return this.footerSections ?? [];
  }

  resolveFooterRows(section: FooterSectionConfig): FooterRowConfig[] {
    return [...section.rows].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }

  resolveFooterValue(row: FooterRowConfig): string {
    const source = row.source ?? (row.totalKey ? 'total' : row.field ? 'header' : 'literal');
    const fallback = this.toText(row.fallback ?? '');

    if (source === 'total' && row.totalKey) {
      return this.resolvedLineTotals[row.totalKey] ?? fallback;
    }

    if (source === 'header' && row.field) {
      const value = this.resolvedHeaderData[row.field];
      return value === null || value === undefined || value === '' ? fallback : this.toText(value);
    }

    return this.toText(row.value ?? fallback);
  }

  get resolvedAttachments(): AttachmentsConfig {
    return this.attachments ?? this.emptyAttachments;
  }

  private get factBoxRecord(): Record<string, unknown> | undefined {
    if (!this.worksheet) return this.resolvedHeaderData;
    const rows = this.resolvedLineRows.filter(row => !row['__entryPlaceholder']);
    return this.activeLineRow && rows.includes(this.activeLineRow) ? this.activeLineRow : rows[0];
  }

  get factBoxContext(): FactBoxContext {
    const source = this.factBoxDataSource;
    const record = this.factBoxRecord;
    const id = record?.[source?.keyField ?? 'systemId'];
    return {companyId: this.session.Company, pageId: this.preferenceKey, record,
      recordEndpoint: source && id ? (source.singleton ? source.endpoint : this.factBoxSource.recordEndpoint(source, id)) : undefined};
  }

  get resolvedFactBoxSections(): FactBoxSectionConfig[] {
    if (this.factBoxConfig?.enabled === false) return [];
    if (this.factBoxSections?.length) {
      return this.factBoxSections;
    }

    if (this.factBoxConfig?.sections?.length) {
      const sections: FactBoxSectionConfig[] = this.factBoxConfig.sections.map(section => ({
        id: section.id, title: section.title, layout: section.layout, collapsed: section.collapsed,
        subtitle: section.subtitle, buttons: section.buttons,
        rows: (section.fields ?? []).map(field => ({label: field.label, value: this.formatDetail(field)})),
      }));
      // Explicit header summaries must not suppress configured active-line details.
      const lineSections = new Map<string, FactBoxDraftSection>();
      this.appendLineFactBoxSections(lineSections);
      return [...sections, ...[...lineSections.values()].map(section => ({
        id: section.id, title: section.title, buttons: section.buttons,
        rows: section.rows.sort((a, b) => a.order - b.order).map(row => ({label: row.label, value: row.value})),
      }))];
    }
    const configured = this.buildFactBoxSectionsFromDocumentConfig();
    const hasSelectedFields = this.resolvedHeaderSections.some(section => section.fields.some(field => this.resolveFieldFactBoxConfig(field)));
    if (hasSelectedFields) return configured;
    if (this.worksheet) {
      if (this.resolvedLineColumns.some(column => this.resolveLineFactBoxConfig(column))) return configured;
      const row = this.factBoxRecord;
      const fields = automaticDetailFields(this.resolvedLineColumns.map(column => ({
        ...column, field: column.field ?? column.id, type: column.valueType ?? column.type,
      })), row ?? {});
      return [{id: 'row-details', title: 'Row details', rows: fields.length ? fields.map(field => ({label: field.label, value: this.formatDetail(field)})) : [{label: 'Details', value: 'Select a row to view details.'}]}, ...configured];
    }
    const fields = automaticDetailFields(this.resolvedHeaderSections.flatMap(section => section.fields.map(field => ({
      field: field.key, label: field.label, type: field.valueType ?? field.type, hidden: field.hidden, factBox: field.factBox,
    }))), this.resolvedHeaderData);
    return [{id: 'record-details', title: 'Record details', rows: fields.length ? fields.map(field => ({label: field.label, value: this.formatDetail(field)})) : [{label: 'Details', value: 'Record details will appear here.'}]}, ...configured];
  }

  private formatDetail(field: {field?: string; label: string; type?: string}): string {
    if (this.worksheet) {
      const row = this.factBoxRecord;
      if (!row) return '';
      const column = this.resolvedLineColumns.find(candidate => (candidate.field ?? candidate.id) === field.field);
      if (column && (column.lookup || column.options?.length)) {
        const value = row[field.field!];
        if (value === null || value === undefined || value === '') return '';
        const options = row[column.optionsDataKey ?? '__options_' + field.field];
        const candidates: unknown[] = Array.isArray(options) ? options : column.options ?? [];
        const selected = candidates.find((option): option is Record<string, unknown> => this.isRecord(option) && String(option['value']) === String(value));
        return this.toText(selected?.['label'] ?? 'Display value unavailable');
      }
      const user = this.session.User as Record<string, unknown> | undefined;
      return detailValue(row, {...field, type: column?.valueType ?? column?.type ?? field.type}, {id: this.session.UserId, name: String(user?.['name'] ?? this.session.UserName)});
    }
    const definition = this.resolvedHeaderSections.flatMap(section => section.fields).find(candidate => candidate.key === field.field);
    if (definition && (definition.lookup || definition.options?.length || ['select', 'dropdown', 'lookup'].includes(definition.type ?? ''))) {
      const value = this.resolvedHeaderData[definition.key];
      if (value === null || value === undefined || value === '') return '';
      for (const form of this.forms()) {
        const label = form.lookupLabel(definition);
        if (label) return label;
      }
      return definition.options?.find(option => String(option.value) === String(value))?.label ?? 'Display value unavailable';
    }
    const user = this.session.User as Record<string, unknown> | undefined;
    return detailValue(this.resolvedHeaderData, {...field, type: definition?.valueType ?? definition?.type ?? field.type}, {id: this.session.UserId, name: String(user?.['name'] ?? this.session.UserName)});
  }

  get resolvedStatusMessage(): DocumentStatusMessage | undefined {
    return this.statusMessage;
  }

  get resolvedStatusLabel(): string {
    const message = this.apiError.toMessage(this.resolvedStatusMessage?.message ?? '', '');
    if (message.length) {
      return message;
    }

    return this.apiError.toMessage(this.resolvedStatusMessage?.title ?? '', '');
  }

  get isDocumentBusy(): boolean {
    return this.resolvedStatusMessage?.blocking === true;
  }

  get isInteractionLocked(): boolean {
    return this.interactionLocked;
  }

  shouldRenderLinesAfter(section: HeaderSectionConfig): boolean {
    if (!this.resolvedLineColumns.length) {
      return false;
    }

    const placement = this.resolvedLinePlacement;
    if (placement.mode !== 'after-section') {
      return false;
    }

    const sectionId = this.toText(section.id).trim().toLowerCase();
    const targetSectionId = this.toText(placement.afterSectionId).trim().toLowerCase();
    return !!targetSectionId && sectionId === targetSectionId;
  }

  get shouldRenderLinesAtEnd(): boolean {
    if (!this.resolvedLineColumns.length) {
      return false;
    }

    const placement = this.resolvedLinePlacement;
    if (placement.mode === 'end') {
      return true;
    }

    const targetSectionId = this.toText(placement.afterSectionId).trim().toLowerCase();
    if (!targetSectionId.length) {
      return true;
    }

    return !this.resolvedHeaderSections.some((section) => this.toText(section.id).trim().toLowerCase() === targetSectionId);
  }

  private get resolvedLinePlacement(): LinePlacementConfig {
    return this.linePlacement ?? { mode: 'end' };
  }

  private buildFactBoxSectionsFromDocumentConfig(): FactBoxSectionConfig[] {
    const sectionMap = new Map<string, FactBoxDraftSection>();

    for (const [sectionIndex, section] of this.resolvedHeaderSections.entries()) {
      for (const [fieldIndex, field] of section.fields.entries()) {
        const factBox = this.resolveFieldFactBoxConfig(field);
        if (!factBox) {
          continue;
        }

        const sectionId = this.toText(factBox.sectionId).trim() || section.id || 'details';
        const sectionTitle = this.toText(factBox.sectionTitle).trim() || section.title || 'Details';
        const rowOrder = Number.isFinite(factBox.order) ? Number(factBox.order) : fieldIndex;
        const draft = this.ensureFactBoxSection(sectionMap, sectionId, sectionTitle, sectionIndex);
        this.appendFactBoxButtons(draft, factBox.buttons);
        draft.rows.push({
          label: this.toText(factBox.label).trim() || field.label,
          value: this.resolveFactBoxFieldValue(field, factBox),
          order: rowOrder
        });
      }
    }

    this.appendLineFactBoxSections(sectionMap);
    this.appendAttachmentsFactBoxSection(sectionMap);

    return [...sectionMap.values()]
      .sort((a, b) => a.order - b.order)
      .map((section) => ({
        id: section.id,
        title: section.title,
        buttons: section.buttons,
        rows: section.rows
          .sort((a, b) => a.order - b.order)
          .map((row) => ({ label: row.label, value: row.value }))
      }));
  }

  private resolveFieldFactBoxConfig(field: FieldConfig): FieldFactBoxConfig | undefined {
    if (field.factBox === true) {
      return { show: true };
    }

    if (this.isRecord(field.factBox)) {
      const factBox = field.factBox as FieldFactBoxConfig;
      return factBox.show === false ? undefined : factBox;
    }

    return undefined;
  }

  private appendLineFactBoxSections(sectionMap: Map<string, FactBoxDraftSection>): void {
    const activeLine = this.activeLineRow ?? this.resolvedLineRows[0];
    if (!activeLine) {
      return;
    }

    for (const [columnIndex, column] of this.resolvedLineColumns.entries()) {
      const factBox = this.resolveLineFactBoxConfig(column);
      if (!factBox) {
        continue;
      }

      const sectionId = this.toText(factBox.sectionId).trim() || 'line';
      const sectionTitle = this.toText(factBox.sectionTitle).trim() || 'Line';
      const rowOrder = Number.isFinite(factBox.order) ? Number(factBox.order) : columnIndex;
      const sectionOrder = sectionId === 'line' ? 500 : 500 + columnIndex;
      const draft = this.ensureFactBoxSection(sectionMap, sectionId, sectionTitle, sectionOrder);
      this.appendFactBoxButtons(draft, factBox.buttons);
      draft.rows.push({
        label: this.toText(factBox.label).trim() || column.label,
        value: this.resolveFactBoxLineValue(column, activeLine, factBox),
        order: rowOrder
      });
    }
  }

  private resolveLineFactBoxConfig(column: LineColumnConfig): FieldFactBoxConfig | undefined {
    if (column.factBox === true) {
      return { show: true };
    }

    if (this.isRecord(column.factBox)) {
      const factBox = column.factBox as FieldFactBoxConfig;
      return factBox.show === false ? undefined : factBox;
    }

    return undefined;
  }

  private ensureFactBoxSection(
    sectionMap: Map<string, FactBoxDraftSection>,
    id: string,
    title: string,
    order: number
  ): FactBoxDraftSection {
    const existing = sectionMap.get(id);
    if (existing) {
      return existing;
    }

    const next: FactBoxDraftSection = {
      id,
      title,
      order,
      rows: []
    };
    sectionMap.set(id, next);
    return next;
  }

  private appendFactBoxButtons(
    section: FactBoxDraftSection,
    buttons: FactBoxSectionConfig['buttons'] | undefined
  ): void {
    if (!buttons?.length) {
      return;
    }

    section.buttons ??= [];
    const existing = new Set(section.buttons.map((button) => `${button.actionKey}|${button.label}`));
    for (const button of buttons) {
      const key = `${button.actionKey}|${button.label}`;
      if (existing.has(key)) {
        continue;
      }

      section.buttons.push(button);
      existing.add(key);
    }
  }

  private resolveFactBoxFieldValue(field: FieldConfig, config: FieldFactBoxConfig): string {
    const rawValue = this.resolvedHeaderData[field.key] ?? field.defaultValue;
    const fallback = this.toText(config.fallback ?? field.defaultValue ?? '-');
    if (rawValue === null || rawValue === undefined || rawValue === '') {
      return fallback;
    }

    return this.toText(rawValue);
  }

  private resolveFactBoxLineValue(
    column: LineColumnConfig,
    line: Record<string, unknown>,
    config: FieldFactBoxConfig
  ): string {
    const key = this.toText(column.field ?? column.id).trim();
    const rawValue = key ? line[key] : undefined;
    const fallback = this.toText(config.fallback ?? '-');
    if (rawValue === null || rawValue === undefined || rawValue === '') {
      return fallback;
    }

    return this.toText(rawValue);
  }

  private appendAttachmentsFactBoxSection(sectionMap: Map<string, FactBoxDraftSection>): void {
    const attachments = this.attachments;
    if (!attachments) {
      return;
    }

    const section = this.ensureFactBoxSection(sectionMap, 'attachments', 'Attachments', Number.MAX_SAFE_INTEGER);
    section.buttons = attachments.primaryActionKey ? [
      {
        label: attachments.primaryActionLabel,
        actionKey: attachments.primaryActionKey,
        icon: 'ts-icon ts-icon-clip',
        disabled: !attachments.canUpload
      }
    ] : undefined;
    section.rows.push(
      { label: 'Header files', value: String(attachments.headerFilesCount), order: 10 },
      { label: 'Line files', value: String(attachments.lineFilesCount), order: 20 }
    );
  }

  toggleEntrySize(): void {
    this.maximized = !this.maximized;
  }

  openDocumentDetail(dialog: DocumentDetailType): void {
    this.activeDocumentDetail = dialog;
  }

  handleLineAction(event: { actionKey: string; row?: Record<string, unknown>; payload?: unknown }): void {
    const payload = this.mergeLineActionPayload(event.row, event.payload);
    if (event.actionKey === 'line-draft') { this.action.emit({actionKey:event.actionKey,payload}); return; }
    this.routeAction(event.actionKey, payload);
  }

  handleLineSelectionChanged(event: {
    activeRow?: Record<string, unknown>;
    selectedRows: Record<string, unknown>[];
    selectedIndexes: number[];
  }): void {
    this.selectedLineIndexes = [...event.selectedIndexes];
    this.activeLineRow = event.activeRow;
    this.action.emit({ actionKey: 'line:selection-changed', payload: event });
  }

  handleLineRowChanged(event: { row: Record<string, unknown>; column: LineColumnConfig; value: unknown }): void {
    this.action.emit({ actionKey: 'line:changed', payload: event });
    // The change handler owns persistence; do not enqueue a second save.
  }

  handleHeaderFieldChanged(event: { fieldKey: string; value: unknown; updates?: Record<string, unknown> }): void {
    this.action.emit({ actionKey: 'header:changed', payload: event });
    // The change handler owns persistence; do not enqueue a second save.
  }

  handleHeaderFieldInteracted(event: { fieldKey: string }): void {
    this.action.emit({ actionKey: 'header:interacted', payload: event });
  }

  handleHeaderDropdownOpened(event: { fieldKey: string }): void {
    this.action.emit({ actionKey: 'header:dropdown-opened', payload: event });
  }

  handleLineDropdownOpened(event: {
    row: Record<string, unknown>;
    column: LineColumnConfig;
    rowIndex: number;
  }): void {
    this.action.emit({ actionKey: 'line:dropdown-opened', payload: event });
  }

  handleFactBoxAction(actionKey: string): void {
    this.routeAction(actionKey);
  }

  handleEntryCommandAction(actionKey: string): void {
    this.routeAction(actionKey);
  }

  @ViewChild(DocumentLines) private lineEditor?: DocumentLines;
  handleLineToolbarAction(actionKey: string): void {
    this.routeAction(actionKey, this.buildLineCommandPayload(actionKey));
  }

  handleNestedCommandAction(actionKey: string): void {
    this.routeAction(actionKey);
  }

  handleGroupedHeaderCommandAction(actionKey: string, event: Event): void {
    this.routeAction(actionKey);
    const target = event.currentTarget as HTMLElement | null;
    const menu = target?.closest('details') as HTMLDetailsElement | null;
    if (menu) {
      menu.open = false;
    }
  }

  handleGroupedLineCommandAction(actionKey: string, event: Event): void {
    this.routeAction(actionKey, this.buildLineCommandPayload(actionKey));
    const target = event.currentTarget as HTMLElement | null;
    const menu = target?.closest('details') as HTMLDetailsElement | null;
    if (menu) {
      menu.open = false;
    }
  }

  handleGroupMenuToggle(event: Event): void {
    const menu = event.target as HTMLDetailsElement;
    if (!menu?.open) {
      return;
    }

    const host = this.hostElement.nativeElement as HTMLElement;
    const openMenus = Array.from(host.querySelectorAll('details.group-menu[open]')) as HTMLDetailsElement[];
    openMenus.forEach((candidate: HTMLDetailsElement) => {
      if (candidate !== menu) {
        candidate.open = false;
      }
    });
  }

  @HostListener('document:click', ['$event'])
  handleDocumentClick(event: MouseEvent): void {
    const target = event.target as Node | null;
    if (!target) {
      return;
    }

    const inGroupMenu = (target as HTMLElement).closest?.('details.group-menu');
    if (!inGroupMenu) {
      this.closeAllGroupMenus();
    }
  }

  @HostListener('document:keydown.escape')
  handleEscapeKey(): void {
    this.closeAllGroupMenus();
  }

  closeDocumentDetail(): void {
    this.activeDocumentDetail = null;
  }

  get detailTitle(): string {
    switch (this.activeDocumentDetail) {
      case 'header':
        return 'Header details';
      case 'dimensions':
        return 'Line dimensions';
      case 'attachments':
        return 'Attachments';
      case 'line':
        return 'Line details';
      case 'posting':
        return 'Posting preview';
      default:
        return '';
    }
  }

  get detailMessage(): string {
    switch (this.activeDocumentDetail) {
      case 'header':
        return 'Header detail content is owned by the page configuration.';
      case 'dimensions':
        return 'Dimension detail content is owned by the page configuration.';
      case 'attachments':
        return 'Attachment detail content is owned by the page configuration.';
      case 'line':
        return 'Line detail content is owned by the page configuration.';
      case 'posting':
        return 'Posting preview content is owned by the page configuration.';
      default:
        return 'No detail dialog selected.';
    }
  }

  private routeAction(rawActionKey: string, payload?: unknown): void {
    const actionKey = this.normalizeActionKey(rawActionKey);
    const command = actionKey.replace(/^cmd:/i,'').toLowerCase();
    if (command === 'line-copy-rows') { void this.lineEditor?.copySelectedRows(); return; }
    if (command === 'line-paste' && !(payload && typeof payload === 'object' && 'rows' in payload && Array.isArray(payload.rows))) { if (!this.interactionLocked) void this.lineEditor?.requestPaste(); return; }

    if (actionKey.startsWith('dialog:')) {
      this.handleDialogAction(actionKey.slice('dialog:'.length));
      return;
    }

    if (actionKey.startsWith('popup:')) {
      this.action.emit({ actionKey, payload });
      return;
    }

    if (actionKey.startsWith('cmd:')) {
      this.handleCommandAction(actionKey.slice('cmd:'.length), payload);
    }
  }

  private handleDialogAction(dialog: string): void {
    if (dialog === 'header' || dialog === 'dimensions' || dialog === 'attachments' || dialog === 'line' || dialog === 'posting') {
      this.openDocumentDetail(dialog);
    }
  }

  private handleCommandAction(command: string, payload?: unknown): void {
    if (command === 'close') {
      this.closeDocumentDetail();
      return;
    }

    this.action.emit({ actionKey: `cmd:${command}`, payload });
  }

  private normalizeActionKey(actionKey: string): string {
    switch (actionKey) {
      case 'attachments':
        return 'dialog:attachments';
      case 'line':
        return 'dialog:line';
      case 'header':
        return 'dialog:header';
      case 'posting':
      case 'post':
        return 'dialog:posting';
      case 'dimensions':
        return 'dialog:dimensions';
      case 'more':
        return 'cmd:more';
      case 'close':
        return 'cmd:close';
      case 'save':
      case 'apply':
      case 'line-new':
      case 'line-delete':
      case 'line-insert':
      case 'autosave':
        return `cmd:${actionKey}`;
      default:
        return actionKey;
    }
  }

  private toText(value: unknown): string {
    return value === null || value === undefined ? '' : String(value);
  }

  private getSortedHeaderToolbarButtons(): CommandConfig[] {
    return [...this.resolvedHeaderToolbarButtons]
      .map((button, index) => ({ button, index }))
      .sort((a, b) => {
        const orderA = typeof a.button.order === 'number' ? a.button.order : Number.MAX_SAFE_INTEGER;
        const orderB = typeof b.button.order === 'number' ? b.button.order : Number.MAX_SAFE_INTEGER;
        if (orderA === orderB) {
          return a.index - b.index;
        }

        return orderA - orderB;
      })
      .map((entry) => entry.button);
  }

  private getSortedLineToolbarButtons(): CommandConfig[] {
    return [...this.resolvedLineToolbarButtons]
      .map((button, index) => ({ button, index }))
      .sort((a, b) => {
        const orderA = typeof a.button.order === 'number' ? a.button.order : Number.MAX_SAFE_INTEGER;
        const orderB = typeof b.button.order === 'number' ? b.button.order : Number.MAX_SAFE_INTEGER;
        if (orderA === orderB) {
          return a.index - b.index;
        }

        return orderA - orderB;
      })
      .map((entry) => entry.button);
  }

  private resolvePrimaryActionsLimit(fallback: number): number {
    const configured = this.headerCommandBar?.maxPrimaryActions;
    if (typeof configured !== 'number' || configured <= 0) {
      return fallback;
    }

    return configured;
  }

  private resolveVisibleGroupLimit(fallback: number): number {
    const configured = this.headerCommandBar?.maxVisibleGroups;
    if (typeof configured !== 'number' || configured <= 0) {
      return fallback;
    }

    return configured;
  }

  private resolveLinePrimaryActionsLimit(fallback: number): number {
    const configured = this.lineCommandBar?.maxPrimaryActions;
    if (typeof configured !== 'number' || configured <= 0) {
      return fallback;
    }

    return configured;
  }

  private resolveLineVisibleGroupLimit(fallback: number): number {
    const configured = this.lineCommandBar?.maxVisibleGroups;
    if (typeof configured !== 'number' || configured <= 0) {
      return fallback;
    }

    return configured;
  }

  private toButtonKey(button: CommandConfig): string {
    return `${button.actionKey}::${button.label}`;
  }

  private isGlobalLinePrimaryCommand(actionKey: string): boolean {
    const normalized = this.toText(actionKey).trim().toLowerCase();
    return DocumentWindow.GLOBAL_LINE_PRIMARY_COMMANDS.has(normalized);
  }

  private isLineNewCommand(actionKey: string): boolean {
    const normalized = this.toText(actionKey).trim().toLowerCase();
    return normalized === 'cmd:line-new' || normalized === 'line-new';
  }

  private isLineDeleteCommand(actionKey: string): boolean {
    const normalized = this.toText(actionKey).trim().toLowerCase();
    return normalized === 'cmd:line-delete' || normalized === 'line-delete';
  }

  private buildLineCommandPayload(actionKey: string): unknown {
    if (!this.isLineDeleteCommand(actionKey) && !['line-copy', 'cmd:line-copy'].includes(actionKey.trim().toLowerCase())) {
      return this.activeLineRow ? { activeRow: this.activeLineRow } : undefined;
    }

    if (!this.selectedLineIndexes.length && !this.activeLineRow) {
      return undefined;
    }

    return {
      activeRow: this.activeLineRow,
      selectedIndexes: [...this.selectedLineIndexes]
    };
  }

  private mergeLineActionPayload(row: Record<string, unknown> | undefined, payload: unknown): unknown {
    if (!row && payload === undefined) {
      return undefined;
    }

    if (!this.isRecord(payload)) {
      return row ? { row } : payload;
    }

    return row ? { ...payload, row } : payload;
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }

  private closeAllGroupMenus(): void {
    const host = this.hostElement.nativeElement as HTMLElement;
    const openMenus = Array.from(host.querySelectorAll('details.group-menu[open]')) as HTMLDetailsElement[];
    openMenus.forEach((menu: HTMLDetailsElement) => {
      menu.open = false;
    });
  }

  // Popup stacking is handled by popup-host; entry-dialog only emits actions.
}
