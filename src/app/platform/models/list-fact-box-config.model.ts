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

export interface ListFactBoxConfig {
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

