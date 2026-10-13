import { DataSurfaceColumnConfig } from './data-surface-config.model';
import type { DataSourceConfig } from './data-source-config.model';
import type {
  EntryCommandBarConfig,
  EntryCommandButtonConfig,
  EntryFooterSectionConfig,
  EntryLinePlacementConfig,
} from './document-window-config.model';
import {
  FieldConfig,
  FieldFactPanelConfig,
  FieldFillConfig,
  FieldOptionConfig,
} from './field-config.model';
import type {
  CalculationConfig,
  LineTotalsCalculationConfig,
} from './line-calculation-config.model';

export type LineType = 'item' | 'account' | 'resource' | 'text' | 'charge' | 'generic';
export type LineCellType = 'text' | 'select' | 'dropdown' | 'icon';
export type LineValueType = 'text' | 'number' | 'boolean' | 'date';

export interface LineColumnConfig extends DataSurfaceColumnConfig {
  id: string;
  cellType?: LineCellType;
  valueType?: LineValueType;
  readonly?: boolean;
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
  factPanel?: boolean | FieldFactPanelConfig;
}

export interface LineConfig {
  commandBar?: EntryCommandBarConfig;
  placement: EntryLinePlacementConfig;
  dataSource: DataSourceConfig;
  toolbarButtons: EntryCommandButtonConfig[];
  columns: LineColumnConfig[];
  fields?: FieldConfig[];
  lineKeyField?: string;
  parentKeyField?: string;
  selectable?: boolean;
  editable?: boolean;
  supportsSubLines?: boolean;
  lineType?: LineType;
  calculation?: CalculationConfig;
  totalsCalculation?: LineTotalsCalculationConfig;
  footerSections?: EntryFooterSectionConfig[];
}
