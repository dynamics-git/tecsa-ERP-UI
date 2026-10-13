import { FieldFactPanelConfig } from './field-config.model';

export type DataSurfaceMode = 'table';

export type DataSurfaceColumnType = 'text' | 'number' | 'date' | 'boolean' | 'currency' | 'badge';

export interface DataSurfaceColumnConfig {
  id?: string;
  label: string;
  field?: string;
  subtitleField?: string;
  width?: string;
  align?: 'start' | 'center' | 'end';
  type?: DataSurfaceColumnType;
  isPrimary?: boolean;
  currencyCode?: string;
  hidden?: boolean;
  factPanel?: boolean | FieldFactPanelConfig;
}

export interface DataSurfaceConfig {
  id?: string;
  mode?: DataSurfaceMode;
  idField?: string;
  columns: DataSurfaceColumnConfig[];
  selectable?: boolean;
  multiSelect?: boolean;
  sortable?: boolean;
  resizable?: boolean;
  infiniteScroll?: boolean;
}
