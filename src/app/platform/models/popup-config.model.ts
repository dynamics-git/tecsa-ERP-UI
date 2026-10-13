export type PopupSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

export type PopupMode = 'modal' | 'drawer' | 'page';

export interface PopupConfig {
  id: string;
  title?: string;
  size?: PopupSize;
  mode?: PopupMode;
  allowNested?: boolean;
  closeOnBackdrop?: boolean;
  data?: unknown;
}
