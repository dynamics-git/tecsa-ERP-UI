import { FormSectionConfig } from './field-config.model';
import type { LineColumnConfig } from './line-config.model';
import { CommandConfig } from './command-config.model';

export type EntryDialogType = 'header' | 'dimensions' | 'attachments' | 'line' | 'posting';

export interface EntryHeaderSectionConfig extends FormSectionConfig {
  metaText?: string;
  actionLabel?: string;
  actionDialog?: EntryDialogType;
}

export interface EntryLineTotalsConfig {
  subtotal: string;
  sst: string;
  total: string;
  difference: string;
}

export type EntryFooterTotalKey = keyof EntryLineTotalsConfig;
export type EntryFooterValueSource = 'total' | 'header' | 'literal';

export interface EntryFooterRowConfig {
  id: string;
  label: string;
  source?: EntryFooterValueSource;
  totalKey?: EntryFooterTotalKey;
  field?: string;
  value?: string;
  fallback?: string;
  emphasis?: boolean;
  order?: number;
}

export interface EntryFooterSectionConfig {
  id: string;
  title?: string;
  rows: EntryFooterRowConfig[];
}

export interface EntryAttachmentsConfig {
  headerFilesCount: number;
  lineFilesCount: number;
  canUpload: boolean;
  primaryActionLabel: string;
  primaryActionKey: string;
  context?: EntryAttachmentContextConfig;
}

export interface EntryAttachmentContextConfig {
  documentNoField?: string;
  documentType?: string;
  documentStatusField?: string;
  useSelectedLineForHeaderAttachments?: boolean;
  relatedDocumentNoField?: string;
  relatedDocumentType?: string;
  relatedLineNoField?: string;
}

export type EntryCommandTone = 'primary' | 'normal' | 'danger';
export type EntryRunModalTarget = 'entry' | 'list';

export interface EntryCommandBarConfig {
  maxPrimaryActions?: number;
  maxVisibleGroups?: number;
}

export interface EntryLineCommandPolicyConfig {
  injectDefaultLineNew?: boolean;
  injectDefaultLineDelete?: boolean;
}

export type EntryLinePlacementMode = 'end' | 'after-section';

export interface EntryLinePlacementConfig {
  mode?: EntryLinePlacementMode;
  afterSectionId?: string;
}

export type EntryCommandButtonConfig = CommandConfig;

export interface EntryHeaderConfig {
  dialogTitle: string;
  commandBar?: EntryCommandBarConfig;
  toolbarButtons: EntryCommandButtonConfig[];
  detailToolbarButtons?: EntryCommandButtonConfig[];
  sections: EntryHeaderSectionConfig[];
  attachmentsDefault?: EntryAttachmentsConfig;
}

export interface FactPanelRowConfig {
  label: string;
  value: string;
}

export type FactPanelButtonConfig = CommandConfig;

export interface FactPanelSectionConfig {
  id: string;
  title: string;
  rows?: FactPanelRowConfig[];
  buttons?: FactPanelButtonConfig[];
  customComponentKey?: string;
  customData?: Record<string, unknown>;
}

export type PopupFactPanelRowConfig = FactPanelRowConfig;
export type PopupFactPanelButtonConfig = FactPanelButtonConfig;
export type PopupFactPanelSectionConfig = FactPanelSectionConfig;

export type EntryStatusTone = 'info' | 'success' | 'warning' | 'error';

export interface EntryStatusMessage {
  tone: EntryStatusTone;
  title?: string;
  message: string;
  blocking?: boolean;
}

export interface DocumentWindowConfig {
  pageLabel?: string;
  title?: string;
  subtitle?: string;
  headerCommandBar?: EntryCommandBarConfig;
  lineCommandBar?: EntryCommandBarConfig;
  lineCommandPolicy?: EntryLineCommandPolicyConfig;
  linePlacement?: EntryLinePlacementConfig;
  headerToolbarButtons?: EntryCommandButtonConfig[];
  lineToolbarButtons?: EntryCommandButtonConfig[];
  detailToolbarButtons?: EntryCommandButtonConfig[];
  headerSections?: EntryHeaderSectionConfig[];
  headerData?: Record<string, unknown>;
  lineColumns?: LineColumnConfig[];
  lineRows?: Record<string, unknown>[];
  lineTotals?: EntryLineTotalsConfig;
  footerSections?: EntryFooterSectionConfig[];
  attachments?: EntryAttachmentsConfig;
  factPanelSections?: FactPanelSectionConfig[];
  statusMessage?: EntryStatusMessage;
  interactionLocked?: boolean;
}
