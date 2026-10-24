import type { Type } from '@angular/core';
import type { CommandConfig } from './command-config.model';

export interface ListFactBoxFieldConfig {
  id: string;
  label: string;
  field?: string;
}

export interface ListFactBoxBadgeConfig {
  id: string;
  label?: string;
  field?: string;
  tone?: 'neutral' | 'success' | 'warning' | 'danger';
}

export interface ListFactBoxSectionConfig {
  id: string;
  title: string;
  subtitle?: string;
  fields?: ListFactBoxFieldConfig[];
  badges?: ListFactBoxBadgeConfig[];
  collapsed?: boolean;
  layout?: 'details' | 'metrics';
  buttons?: CommandConfig[];
}

export interface ListFactBoxBindingConfig {
  labelField?: string;
  labelFallbackFields?: string[];
  titleField?: string;
  titleFallbackFields?: string[];
  subtitleField?: string;
  subtitleFallbackFields?: string[];
  summaryField?: string;
  summaryFallbackFields?: string[];
  summaryType?: 'text' | 'number' | 'date' | 'currency';
}

export interface FactBoxPanelConfig {
  id: string;
  title: string;
  kind?: 'overview' | 'notes' | 'attachments';
  enabled?: boolean;
  /** Trusted, compiled SDK component accepting context and data inputs. */
  component?: Type<unknown>;
  data?: Record<string, unknown>;
  buttons?: CommandConfig[];
}

export interface ListFactBoxConfig {
  overview?: boolean;
  notes?: boolean;
  attachments?: boolean;
  /** Optional order/custom components. Omit to use the shared default design. */
  panels?: FactBoxPanelConfig[];
  buttons?: CommandConfig[];
  id?: string;
  label?: string;
  title?: string;
  subtitle?: string;
  enabled?: boolean;
  width?: string;
  defaultSectionId?: string;
  binding?: ListFactBoxBindingConfig;
  sections?: ListFactBoxSectionConfig[];
}

