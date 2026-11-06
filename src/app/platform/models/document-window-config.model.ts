import type { Type } from '@angular/core';
import type { DataSourceConfig } from './data-source-config.model';
import type { FactBoxConfig } from './fact-box-config.model';
import { FormSectionConfig } from './field-config.model';
import type { LineColumnConfig } from './line-config.model';
import { CommandConfig } from './command-config.model';

export type DocumentDetailType = 'header' | 'dimensions' | 'attachments' | 'line' | 'posting';

export interface HeaderSectionConfig extends FormSectionConfig {
  metaText?: string;
  actionLabel?: string;
  actionDialog?: DocumentDetailType;
}

/** Named display totals. Existing subtotal/sst/total/difference configs remain valid. */
export interface LineTotalsConfig extends Record<string, string> {
  subtotal: string;
  sst: string;
  total: string;
  difference: string;
}

export type FooterTotalKey = keyof LineTotalsConfig;
export type FooterValueSource = 'total' | 'header' | 'literal';

export interface FooterRowConfig {
  id: string;
  label: string;
  source?: FooterValueSource;
  totalKey?: FooterTotalKey;
  field?: string;
  value?: string;
  fallback?: string;
  emphasis?: boolean;
  order?: number;
}

export interface FooterSectionConfig {
  id: string;
  title?: string;
  rows: FooterRowConfig[];
}

export interface AttachmentsConfig {
  headerFilesCount: number;
  lineFilesCount: number;
  canUpload: boolean;
  primaryActionLabel: string;
  primaryActionKey: string;
  context?: AttachmentContextConfig;
}

export interface AttachmentContextConfig {
  headerPKProp?: string;
  documentType?: string;
  documentStatusField?: string;
  useSelectedLineForHeaderAttachments?: boolean;
  relatedHeaderPKProp?: string;
  relatedDocumentType?: string;
  relatedLineNoField?: string;
}

export interface CommandBarConfig {
  maxPrimaryActions?: number;
  maxVisibleGroups?: number;
}

export interface LineCommandPolicyConfig {
  injectDefaultLineNew?: boolean;
  injectDefaultLineDelete?: boolean;
}

export type LinePlacementMode = 'end' | 'after-section';

export interface LinePlacementConfig {
  mode?: LinePlacementMode;
  afterSectionId?: string;
}

export interface HeaderConfig {
  dialogTitle: string;
  commandBar?: CommandBarConfig;
  toolbarButtons: CommandConfig[];
  detailToolbarButtons?: CommandConfig[];
  sections: HeaderSectionConfig[];
  attachmentsDefault?: AttachmentsConfig;
}

export interface FactBoxRowConfig {
  tooltip?: string;
  badge?: boolean;
  label: string;
  value: string;
}

export interface FactBoxSectionConfig {
  id: string;
  title: string;
  rows?: FactBoxRowConfig[];
  buttons?: CommandConfig[];
  customComponentKey?: string;
  customComponent?: Type<unknown>;
  layout?: 'details' | 'metrics';
  collapsed?: boolean;
  subtitle?: string;
  customData?: Record<string, unknown>;
}

export type DocumentStatusTone = 'info' | 'success' | 'warning' | 'error';

export interface DocumentStatusMessage {
  tone: DocumentStatusTone;
  title?: string;
  message: string;
  blocking?: boolean;
}

export interface DocumentWindowConfig {
  pageLabel?: string;
  title?: string;
  subtitle?: string;
  headerCommandBar?: CommandBarConfig;
  lineCommandBar?: CommandBarConfig;
  lineCommandPolicy?: LineCommandPolicyConfig;
  linePlacement?: LinePlacementConfig;
  headerToolbarButtons?: CommandConfig[];
  lineToolbarButtons?: CommandConfig[];
  detailToolbarButtons?: CommandConfig[];
  headerSections?: HeaderSectionConfig[];
  headerData?: Record<string, unknown>;
  lineColumns?: LineColumnConfig[];
  lineRows?: Record<string, unknown>[];
  lineTotals?: LineTotalsConfig;
  footerSections?: FooterSectionConfig[];
  attachments?: AttachmentsConfig;
  factBoxSections?: FactBoxSectionConfig[];
  factBoxConfig?: FactBoxConfig;
  factBoxDataSource?: DataSourceConfig;
  statusMessage?: DocumentStatusMessage;
  contentReady?: boolean;
  interactionLocked?: boolean;
}
