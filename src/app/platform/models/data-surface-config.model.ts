import type { ListFilterFieldConfig } from './list-filter-config.model';
import { FieldFactBoxConfig, FieldType } from './field-config.model';

export type DataSurfaceMode = 'table';

export type DataSurfaceColumnType = FieldType;

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
  sortable?: boolean;
  filterable?: boolean;
  /** Exclude a queryable column from shared search only when explicitly false. */
  searchable?: boolean;
  filter?: Omit<ListFilterFieldConfig, 'field' | 'label'>;
  factBox?: boolean | FieldFactBoxConfig;
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
