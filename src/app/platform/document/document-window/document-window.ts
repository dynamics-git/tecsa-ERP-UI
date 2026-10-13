import { NgTemplateOutlet } from '@angular/common';
import { Component, ElementRef, EventEmitter, HostListener, Input, Output, inject } from '@angular/core';
import { DynamicForm } from '../../../shared/ui/dynamic-form/dynamic-form';
import { FactBox } from '../../../shared/ui/fact-box/fact-box';
import { DocumentLines } from '../document-lines/document-lines';
import { FieldConfig, FieldFactPanelConfig } from '../../models/field-config.model';
import { LineColumnConfig } from '../../models/line-config.model';
import {
  EntryAttachmentsConfig,
  EntryCommandBarConfig,
  EntryCommandButtonConfig,
  EntryFooterRowConfig,
  EntryFooterSectionConfig,
  EntryLineCommandPolicyConfig,
  EntryLinePlacementConfig,
  EntryDialogType,
  EntryHeaderSectionConfig,
  EntryLineTotalsConfig,
  EntryStatusMessage,
  FactPanelSectionConfig
} from '../../models/document-window-config.model';
import { ApiErrorService } from '../../data/api-error.service';

export type EntryDialog = EntryDialogType;
export type DocumentWindowActionEvent = { actionKey: string; payload?: unknown };
type EntryCommandGroup = { name: string; buttons: EntryCommandButtonConfig[] };
type FactPanelDraftSection = {
  id: string;
  title: string;
  buttons?: FactPanelSectionConfig['buttons'];
  order: number;
  rows: Array<{ label: string; value: string; order: number }>;
};

@Component({
  selector: 'app-document-window',
  standalone: true,
  imports: [DynamicForm, DocumentLines, FactBox, NgTemplateOutlet],
  templateUrl: './document-window.html',
  styleUrl: './document-window.scss'
})
export class DocumentWindow {
  private static readonly GLOBAL_LINE_PRIMARY_COMMANDS = new Set(['cmd:line-new', 'line-new', 'cmd:line-delete', 'line-delete']);

  private readonly apiError = inject(ApiErrorService);
  private readonly hostElement = inject(ElementRef<HTMLElement>);
  @Input() overlayZIndex = 21;
  @Input() embedded = false;
  @Input() pageLabel?: string;
  @Input() title?: string;
  @Input() subtitle?: string;
  @Input() popupHeaderCommandBar?: EntryCommandBarConfig;
  @Input() popupLineCommandBar?: EntryCommandBarConfig;
  @Input() popupLineCommandPolicy?: EntryLineCommandPolicyConfig;
  @Input() popupLinePlacement?: EntryLinePlacementConfig;
  @Input() popupHeaderToolbarButtons?: EntryCommandButtonConfig[];
  @Input() popupLineToolbarButtons?: EntryCommandButtonConfig[];
  @Input() popupDetailToolbarButtons?: EntryCommandButtonConfig[];
  @Input() popupHeaderSections?: EntryHeaderSectionConfig[];
  @Input() popupHeaderData?: Record<string, unknown>;
  @Input() popupLineColumns?: LineColumnConfig[];
  @Input() popupLineRows?: Record<string, unknown>[];
  @Input() popupLineTotals?: EntryLineTotalsConfig;
  @Input() popupFooterSections?: EntryFooterSectionConfig[];
  @Input() popupAttachments?: EntryAttachmentsConfig;
  @Input() popupFactPanelSections?: FactPanelSectionConfig[];
  @Input() popupStatusMessage?: EntryStatusMessage;
  @Input() popupInteractionLocked = false;
  @Output() closed = new EventEmitter<void>();
  @Output() action = new EventEmitter<DocumentWindowActionEvent>();

  entryMaximized = false;
  activeEntryDialog: EntryDialog | null = null;
  private selectedLineIndexes: number[] = [];
  private activeLineRow?: Record<string, unknown>;

  private readonly emptyAttachments: EntryAttachmentsConfig = {
    headerFilesCount: 0,
    lineFilesCount: 0,
    canUpload: false,
    primaryActionLabel: '',
    primaryActionKey: ''
  };

  private readonly emptyLineTotals: EntryLineTotalsConfig = {
    subtotal: '',
    sst: '',
    total: '',
    difference: ''
  };

  get resolvedHeaderSections(): EntryHeaderSectionConfig[] {
    return this.popupHeaderSections ?? [];
  }

  get resolvedHeaderToolbarButtons(): EntryCommandButtonConfig[] {
    return (this.popupHeaderToolbarButtons ?? []).filter((button) => button.hidden !== true);
  }

  get resolvedPrimaryHeaderToolbarButtons(): EntryCommandButtonConfig[] {
    const sorted = this.getSortedHeaderToolbarButtons();
    const primary = sorted.filter((button) => button.isPrimary === true);
    const limit = this.resolvePrimaryActionsLimit(primary.length);
    return primary.slice(0, limit);
  }

  get resolvedGroupedHeaderToolbarButtons(): EntryCommandGroup[] {
    const sorted = this.getSortedHeaderToolbarButtons();
    const primaryKeys = new Set(this.resolvedPrimaryHeaderToolbarButtons.map((button) => this.toButtonKey(button)));
    const menuButtons = sorted.filter((button) => !primaryKeys.has(this.toButtonKey(button)));
    if (!menuButtons.length) {
      return [];
    }

    const grouped = new Map<string, EntryCommandButtonConfig[]>();
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
    const result: EntryCommandGroup[] = visibleNames.map((name) => ({
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

  get resolvedLineToolbarButtons(): EntryCommandButtonConfig[] {
    const configured = [...(this.popupLineToolbarButtons ?? [])].filter((button) => button.hidden !== true);
    const injectLineNew = this.popupLineCommandPolicy?.injectDefaultLineNew === true;
    const injectLineDelete = this.popupLineCommandPolicy?.injectDefaultLineDelete === true;

    if (injectLineNew && !configured.some((button) => this.isLineNewCommand(button.actionKey))) {
      configured.unshift({
        label: 'Line',
        actionKey: 'cmd:line-new',
        group: 'Process',
        isPrimary: true,
        order: 10,
        icon: 'bi bi-plus-lg'
      });
    }

    if (injectLineDelete && !configured.some((button) => this.isLineDeleteCommand(button.actionKey))) {
      configured.push({
        label: 'Delete',
        actionKey: 'cmd:line-delete',
        group: 'Process',
        isPrimary: true,
        order: 15,
        icon: 'bi bi-trash'
      });
    }

    return configured;
  }

  get resolvedPrimaryLineToolbarButtons(): EntryCommandButtonConfig[] {
    const sorted = this.getSortedLineToolbarButtons();
    const primary = sorted.filter((button) => button.isPrimary === true || this.isGlobalLinePrimaryCommand(button.actionKey));
    const globalPrimaryCount = primary.filter((button) => this.isGlobalLinePrimaryCommand(button.actionKey)).length;
    const limit = Math.max(this.resolveLinePrimaryActionsLimit(primary.length), globalPrimaryCount);
    return primary.slice(0, limit);
  }

  get resolvedGroupedLineToolbarButtons(): EntryCommandGroup[] {
    const sorted = this.getSortedLineToolbarButtons();
    const primaryKeys = new Set(this.resolvedPrimaryLineToolbarButtons.map((button) => this.toButtonKey(button)));
    const menuButtons = sorted.filter((button) => !primaryKeys.has(this.toButtonKey(button)));
    if (!menuButtons.length) {
      return [];
    }

    const grouped = new Map<string, EntryCommandButtonConfig[]>();
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
    const result: EntryCommandGroup[] = visibleNames.map((name) => ({ name, buttons: grouped.get(name) ?? [] }));

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

  get resolvedDetailToolbarButtons(): EntryCommandButtonConfig[] {
    return (this.popupDetailToolbarButtons ?? []).filter((button) => button.hidden !== true);
  }

  get resolvedHeaderData(): Record<string, unknown> {
    return this.popupHeaderData ?? {};
  }

  get resolvedLineColumns(): LineColumnConfig[] {
    return this.popupLineColumns ?? [];
  }

  get resolvedLineRows(): Record<string, unknown>[] {
    return this.popupLineRows ?? [];
  }

  get resolvedLineTotals(): EntryLineTotalsConfig {
    return this.popupLineTotals ?? this.emptyLineTotals;
  }

  get resolvedFooterSections(): EntryFooterSectionConfig[] {
    return this.popupFooterSections ?? [];
  }

  resolveFooterRows(section: EntryFooterSectionConfig): EntryFooterRowConfig[] {
    return [...section.rows].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }

  resolveFooterValue(row: EntryFooterRowConfig): string {
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

  get resolvedAttachments(): EntryAttachmentsConfig {
    return this.popupAttachments ?? this.emptyAttachments;
  }

  get resolvedFactPanelSections(): FactPanelSectionConfig[] {
    if (this.popupFactPanelSections?.length) {
      return this.popupFactPanelSections;
    }

    return this.buildFactPanelSectionsFromEntryConfig();
  }

  get resolvedStatusMessage(): EntryStatusMessage | undefined {
    return this.popupStatusMessage;
  }

  get resolvedStatusLabel(): string {
    const message = this.apiError.toMessage(this.resolvedStatusMessage?.message ?? '', '');
    if (message.length) {
      return message;
    }

    return this.apiError.toMessage(this.resolvedStatusMessage?.title ?? '', '');
  }

  get isEntryBusy(): boolean {
    return this.resolvedStatusMessage?.blocking === true;
  }

  get isInteractionLocked(): boolean {
    return this.popupInteractionLocked;
  }

  shouldRenderLinesAfter(section: EntryHeaderSectionConfig): boolean {
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

  private get resolvedLinePlacement(): EntryLinePlacementConfig {
    return this.popupLinePlacement ?? { mode: 'end' };
  }

  private buildFactPanelSectionsFromEntryConfig(): FactPanelSectionConfig[] {
    const sectionMap = new Map<string, FactPanelDraftSection>();

    for (const [sectionIndex, section] of this.resolvedHeaderSections.entries()) {
      for (const [fieldIndex, field] of section.fields.entries()) {
        const factPanel = this.resolveFieldFactPanelConfig(field);
        if (!factPanel) {
          continue;
        }

        const sectionId = this.toText(factPanel.sectionId).trim() || section.id || 'details';
        const sectionTitle = this.toText(factPanel.sectionTitle).trim() || section.title || 'Details';
        const rowOrder = Number.isFinite(factPanel.order) ? Number(factPanel.order) : fieldIndex;
        const draft = this.ensureFactPanelSection(sectionMap, sectionId, sectionTitle, sectionIndex);
        this.appendFactPanelButtons(draft, factPanel.buttons);
        draft.rows.push({
          label: this.toText(factPanel.label).trim() || field.label,
          value: this.resolveFactPanelFieldValue(field, factPanel),
          order: rowOrder
        });
      }
    }

    this.appendLineFactPanelSections(sectionMap);
    this.appendAttachmentsFactPanelSection(sectionMap);

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

  private resolveFieldFactPanelConfig(field: FieldConfig): FieldFactPanelConfig | undefined {
    if (field.factPanel === true) {
      return { show: true };
    }

    if (this.isRecord(field.factPanel)) {
      const factPanel = field.factPanel as FieldFactPanelConfig;
      return factPanel.show === false ? undefined : factPanel;
    }

    return undefined;
  }

  private appendLineFactPanelSections(sectionMap: Map<string, FactPanelDraftSection>): void {
    const activeLine = this.activeLineRow ?? this.resolvedLineRows[0];
    if (!activeLine) {
      return;
    }

    for (const [columnIndex, column] of this.resolvedLineColumns.entries()) {
      const factPanel = this.resolveLineFactPanelConfig(column);
      if (!factPanel) {
        continue;
      }

      const sectionId = this.toText(factPanel.sectionId).trim() || 'line';
      const sectionTitle = this.toText(factPanel.sectionTitle).trim() || 'Line';
      const rowOrder = Number.isFinite(factPanel.order) ? Number(factPanel.order) : columnIndex;
      const sectionOrder = sectionId === 'line' ? 500 : 500 + columnIndex;
      const draft = this.ensureFactPanelSection(sectionMap, sectionId, sectionTitle, sectionOrder);
      this.appendFactPanelButtons(draft, factPanel.buttons);
      draft.rows.push({
        label: this.toText(factPanel.label).trim() || column.label,
        value: this.resolveFactPanelLineValue(column, activeLine, factPanel),
        order: rowOrder
      });
    }
  }

  private resolveLineFactPanelConfig(column: LineColumnConfig): FieldFactPanelConfig | undefined {
    if (column.factPanel === true) {
      return { show: true };
    }

    if (this.isRecord(column.factPanel)) {
      const factPanel = column.factPanel as FieldFactPanelConfig;
      return factPanel.show === false ? undefined : factPanel;
    }

    return undefined;
  }

  private ensureFactPanelSection(
    sectionMap: Map<string, FactPanelDraftSection>,
    id: string,
    title: string,
    order: number
  ): FactPanelDraftSection {
    const existing = sectionMap.get(id);
    if (existing) {
      return existing;
    }

    const next: FactPanelDraftSection = {
      id,
      title,
      order,
      rows: []
    };
    sectionMap.set(id, next);
    return next;
  }

  private appendFactPanelButtons(
    section: FactPanelDraftSection,
    buttons: FactPanelSectionConfig['buttons'] | undefined
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

  private resolveFactPanelFieldValue(field: FieldConfig, config: FieldFactPanelConfig): string {
    const rawValue = this.resolvedHeaderData[field.key] ?? field.defaultValue;
    const fallback = this.toText(config.fallback ?? field.defaultValue ?? '-');
    if (rawValue === null || rawValue === undefined || rawValue === '') {
      return fallback;
    }

    return this.toText(rawValue);
  }

  private resolveFactPanelLineValue(
    column: LineColumnConfig,
    line: Record<string, unknown>,
    config: FieldFactPanelConfig
  ): string {
    const key = this.toText(column.field ?? column.id).trim();
    const rawValue = key ? line[key] : undefined;
    const fallback = this.toText(config.fallback ?? '-');
    if (rawValue === null || rawValue === undefined || rawValue === '') {
      return fallback;
    }

    return this.toText(rawValue);
  }

  private appendAttachmentsFactPanelSection(sectionMap: Map<string, FactPanelDraftSection>): void {
    const attachments = this.popupAttachments;
    if (!attachments) {
      return;
    }

    const section = this.ensureFactPanelSection(sectionMap, 'attachments', 'Attachments', Number.MAX_SAFE_INTEGER);
    section.buttons = attachments.primaryActionKey ? [
      {
        label: attachments.primaryActionLabel,
        actionKey: attachments.primaryActionKey,
        icon: 'bi bi-paperclip',
        disabled: !attachments.canUpload
      }
    ] : undefined;
    section.rows.push(
      { label: 'Header files', value: String(attachments.headerFilesCount), order: 10 },
      { label: 'Line files', value: String(attachments.lineFilesCount), order: 20 }
    );
  }

  toggleEntrySize(): void {
    this.entryMaximized = !this.entryMaximized;
  }

  openEntryDialog(dialog: EntryDialog): void {
    this.activeEntryDialog = dialog;
  }

  handleLineAction(event: { actionKey: string; row?: Record<string, unknown>; payload?: unknown }): void {
    const payload = this.mergeLineActionPayload(event.row, event.payload);
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
    this.action.emit({ actionKey: 'cmd:autosave', payload: event });
  }

  handleHeaderFieldChanged(event: { fieldKey: string; value: unknown; updates?: Record<string, unknown> }): void {
    this.action.emit({ actionKey: 'header:changed', payload: event });
    this.action.emit({ actionKey: 'cmd:autosave', payload: event });
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

  handleFactPanelAction(actionKey: string): void {
    this.routeAction(actionKey);
  }

  handleEntryCommandAction(actionKey: string): void {
    this.routeAction(actionKey);
  }

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

  closeEntryDialog(): void {
    this.activeEntryDialog = null;
  }

  get detailTitle(): string {
    switch (this.activeEntryDialog) {
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
    switch (this.activeEntryDialog) {
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
      this.openEntryDialog(dialog);
    }
  }

  private handleCommandAction(command: string, payload?: unknown): void {
    if (command === 'close') {
      this.closeEntryDialog();
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

  private getSortedHeaderToolbarButtons(): EntryCommandButtonConfig[] {
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

  private getSortedLineToolbarButtons(): EntryCommandButtonConfig[] {
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
    const configured = this.popupHeaderCommandBar?.maxPrimaryActions;
    if (typeof configured !== 'number' || configured <= 0) {
      return fallback;
    }

    return configured;
  }

  private resolveVisibleGroupLimit(fallback: number): number {
    const configured = this.popupHeaderCommandBar?.maxVisibleGroups;
    if (typeof configured !== 'number' || configured <= 0) {
      return fallback;
    }

    return configured;
  }

  private resolveLinePrimaryActionsLimit(fallback: number): number {
    const configured = this.popupLineCommandBar?.maxPrimaryActions;
    if (typeof configured !== 'number' || configured <= 0) {
      return fallback;
    }

    return configured;
  }

  private resolveLineVisibleGroupLimit(fallback: number): number {
    const configured = this.popupLineCommandBar?.maxVisibleGroups;
    if (typeof configured !== 'number' || configured <= 0) {
      return fallback;
    }

    return configured;
  }

  private toButtonKey(button: EntryCommandButtonConfig): string {
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
    if (!this.isLineDeleteCommand(actionKey)) {
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
