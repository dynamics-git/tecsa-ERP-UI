/** Shared grid baseline for visual rows and editable entry space. */
export const MINIMUM_LINE_GRID_ROWS = 8;

import type { CommandConfig } from './command-config.model';
import { DataSurfaceColumnConfig } from './data-surface-config.model';
import type { DataSourceConfig } from './data-source-config.model';
import type { CommandBarConfig, FooterSectionConfig, LinePlacementConfig } from './document-window-config.model';
import {
  FieldConfig,
  FieldFactBoxConfig,
  FieldFillConfig,
  FieldOptionConfig,
  FieldLookupConfig,
} from './field-config.model';
import type {
  CalculationConfig,
  LineTotalsCalculationConfig,
} from './line-calculation-config.model';

export type LineType = 'item' | 'account' | 'resource' | 'text' | 'charge' | 'generic';
export type LineCellType = 'text' | 'select' | 'dropdown' | 'icon';
export type LineValueType = import('./field-value').FieldValueType;

export interface LineColumnConfig extends DataSurfaceColumnConfig {
  /** Alternative backend fields share one visible column. editableWhen selects
   * the active field/lookup per row; writes retain the original API fields. */
  displayColumn?: string;
  quickEntry?: boolean;
  requiredWhen?: FieldConfig['requiredWhen'];
  readonlyWhen?: FieldConfig['readonlyWhen'];
  lookup?: FieldLookupConfig;
  defaultValue?: unknown;
  clearFieldsOnChange?: string[];
  editableWhen?: { field: string; values: unknown[] };
  id: string;
  cellType?: LineCellType;
  valueType?: LineValueType;
  required?: boolean;
  validation?: FieldConfig['validation'];
  readonly?: boolean;
  readonlyAfterCreate?: boolean;
  options?: FieldOptionConfig[];
  api?: string | string[];
  optionsDataKey?: string;
  optionsEndpoints?: string[];
  labelField?: string | string[];
  valueField?: string | string[];
  displayFormat?: string;
  fill?: FieldFillConfig;
  buttonIcon?: string;
  buttonTitle?: string;
  actionKey?: string;
  factBox?: boolean | FieldFactBoxConfig;
}

export interface LineConfig {
  /** Explicit data field containing the line kind; unlike lineType, it is a column key. */
  typeField?: string;
  /** Explicit permission scope for a child master with separate backend rights. */
  permissionPageId?: string;
  commandBar?: CommandBarConfig;
  placement: LinePlacementConfig;
  dataSource: DataSourceConfig;
  /** Standard commands are supplied by Core; declare only custom actions/overrides. */
  toolbarButtons?: CommandConfig[];
  columns: LineColumnConfig[];
  fields?: FieldConfig[];
  selectable?: boolean;
  editable?: boolean;
  supportsSubLines?: boolean;
  lineType?: LineType;
  calculation?: CalculationConfig;
  totalsCalculation?: LineTotalsCalculationConfig;
  footerSections?: FooterSectionConfig[];
}
