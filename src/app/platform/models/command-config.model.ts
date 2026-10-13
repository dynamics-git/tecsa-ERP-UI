export type CommandSurface = 'list' | 'header' | 'line' | 'detail' | 'factPanel';
export type CommandTone = 'primary' | 'normal' | 'danger';
export type CommandSelectionMode = 'single' | 'multiple';
export type CommandRunModalTarget = 'list' | 'entry';

export interface StandardCommandStateConfig {
  label?: string;
  icon?: string;
  order?: number;
  group?: string;
  hidden?: boolean;
  visible?: boolean;
  disabled?: boolean;
  tooltip?: string;
  permissionKey?: string;
}

export interface StandardCommandConfig {
  new?: boolean | StandardCommandStateConfig;
  delete?: boolean | StandardCommandStateConfig;
  refresh?: boolean | StandardCommandStateConfig;
}

export interface CommandConfig {
  id?: string;
  label: string;
  actionKey: string;
  surface?: CommandSurface;
  group?: string;
  icon?: string;
  trailingIcon?: string;
  order?: number;
  isPrimary?: boolean;
  tone?: CommandTone;
  disabled?: boolean;
  hidden?: boolean;
  runModalPageId?: string;
  runModalTarget?: CommandRunModalTarget;
  runModalView?: CommandRunModalTarget;
  requireSelection?: boolean;
  selectionMode?: CommandSelectionMode;
  tooltip?: string;
  permissionKey?: string;
}
