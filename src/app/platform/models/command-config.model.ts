import type { FieldConfig } from './field-config.model';

export type CommandSurface = 'list' | 'header' | 'line' | 'detail' | 'factBox';
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
  apiAction?: {
    name: string;
    payload?: Record<string, unknown>;
    inputFields?: FieldConfig[];
    states?: { field: string; values: unknown[] };
  };
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
  /** Declarative record mapping for opening a related master from a selected row. */
  runModalRecord?: { source: 'header' | 'activeLine'; fields: Record<string, string> };
  runModalPageId?: string;
  runModalTarget?: CommandRunModalTarget;
  runModalView?: CommandRunModalTarget;
  requireSelection?: boolean;
  selectionMode?: CommandSelectionMode;
  tooltip?: string;
  /** Override the default Page ID + API Action ID permission identity. */
  permissionKey?: string;
  /** Page CRUD grant for non-API administrative commands; defaults to execute. */
  permissionOperation?: 'read' | 'create' | 'modify' | 'delete' | 'execute';
}

/** API actions have their own permission identity; ordinary legacy callbacks retain
 * page-execute fallback. This resolves an identity only, never grants access. */
export function resolveCommandPermissionKey(command: CommandConfig, pageId: string): string | undefined {
  const override = command.permissionKey?.trim();
  if (override) return override;
  if (!command.apiAction || command.runModalPageId) return undefined;
  const action = command.actionKey.trim().toLowerCase().replace(/^cmd:/, '');
  return pageId.trim().toLowerCase() + '.' + action;
}
