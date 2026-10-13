export interface ListFactPanelFieldConfig {
  id: string;
  label: string;
  field?: string;
}

export interface ListFactPanelBadgeConfig {
  id: string;
  label?: string;
  field?: string;
  tone?: 'neutral' | 'success' | 'warning' | 'danger';
}

export interface ListFactPanelSectionConfig {
  id: string;
  title: string;
  subtitle?: string;
  fields?: ListFactPanelFieldConfig[];
  badges?: ListFactPanelBadgeConfig[];
  collapsed?: boolean;
}

export interface ListFactPanelBindingConfig {
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

export interface ListFactPanelConfig {
  id?: string;
  label?: string;
  title?: string;
  subtitle?: string;
  enabled?: boolean;
  width?: string;
  defaultSectionId?: string;
  binding?: ListFactPanelBindingConfig;
  sections?: ListFactPanelSectionConfig[];
}

