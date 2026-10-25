import type { ConfirmationDialogConfig } from './confirmation-dialog-config.model';
import type { DocumentWindowConfig } from './document-window-config.model';
import type { ListPageConfig } from './page-config.model';
import type { PopupConfig } from './popup-config.model';
import type { RunModalConfigModule } from '../run-modal/run-modal-config.token';

export type DocumentLayoutMode = 'header-line' | 'header-only' | 'line-only';

export interface NestedPopupConfig {
  mode?: PopupConfig['mode'];
  size?: PopupConfig['size'];
  closeOnBackdrop?: boolean;
  allowNested?: boolean;
  layout?: DocumentLayoutMode;
}

export interface RunModalListState {
  pageId: string;
  config: ListPageConfig;
  rows: unknown[];
  loading: boolean;
  errorMessage?: string;
  hasMore?: boolean;
}

export interface RunModalHostData {
  backgroundSave?: boolean;
  runtimePage?: { pageId: string; module: RunModalConfigModule; record: Record<string, unknown> };
  documentWindowConfig?: DocumentWindowConfig;
  runModalList?: RunModalListState;
  confirmationDialogConfig?: ConfirmationDialogConfig;
  nestedDocumentWindowConfigs?: Record<string, DocumentWindowConfig>;
  nestedPopupConfigs?: Record<string, NestedPopupConfig>;
}

/** Passed by the existing popup host to the same feature component used by routing. */
export interface RunModalPageWindow {
  record: Record<string, unknown>;
  close: () => void;
}
