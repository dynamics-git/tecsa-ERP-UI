import { CommandConfig, StandardCommandConfig } from './command-config.model';
import { DataSourceConfig } from './data-source-config.model';
import { DataSurfaceColumnConfig, DataSurfaceConfig } from './data-surface-config.model';
import { ListFactPanelConfig } from './list-page-factbox-config.model';
import { ListFilterConfig } from './list-filter-config.model';
import { PopupConfig } from './popup-config.model';

export type PageType = 'list' | 'card' | 'document' | 'worksheet' | 'setup';

export interface PageToolsConfig {
  refresh?: boolean;
  filter?: boolean;
  advancedFilter?: boolean;
  export?: boolean;
  columns?: boolean;
}

export type ListPageColumnConfig = DataSurfaceColumnConfig;

export interface ListPageBehaviorConfig {
  strictFieldMapping?: boolean;
  keyFallbackFields?: string[];
  typeField?: string;
  typeFallbackFields?: string[];
  typeDefault?: string;
  statusField?: string;
  statusFallbackFields?: string[];
  statusDefault?: string;
  toneField?: string;
  toneFallbackFields?: string[];
  toneDefault?: string;
  iconByType?: Record<string, string>;
  defaultIcon?: string;
}

export type ListCommandSelectionMode = 'none' | 'single' | 'multiple';

export interface ListCommandSelectionPolicyConfig {
  defaultMode?: ListCommandSelectionMode;
  commands?: Record<string, ListCommandSelectionMode>;
}

export interface BasePageConfig extends Record<string, unknown> {
  pageId?: string;
  pageType?: PageType;
  title?: string;
  subtitle?: string;
  module?: string;
  company?: string;
  viewSuffix?: string;
  tools?: PageToolsConfig;
  filterConfig?: ListFilterConfig;
  commands?: CommandConfig[];
  popup?: PopupConfig;
  dataSource?: DataSourceConfig;
}

export interface ListPageConfig extends BasePageConfig {
  views?: Array<{ id: string; label: string; filter?: string }>;
  activeViewId?: string;
  searchFields?: string[];
  searchPlaceholder?: string;
  commandSelectionPolicy?: ListCommandSelectionPolicyConfig;
  /**
   * Transitional override only. Normal list pages derive standard actions from
   * dataSource capabilities and tools defaults.
   */
  standardActions?: StandardCommandConfig;
  dataSurface?: DataSurfaceConfig;
  behavior?: ListPageBehaviorConfig;
  factPanel?: ListFactPanelConfig;
}

// Setup pages share the same shape today; this alias keeps naming explicit.
export type SetupPageConfig = ListPageConfig;

