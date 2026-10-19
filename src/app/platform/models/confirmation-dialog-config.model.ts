import type { FormSectionConfig } from './field-config.model';

export type ConfirmationDialogKind = 'confirm' | 'alert';

export interface ConfirmationDialogConfig {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  kind: ConfirmationDialogKind;
  sections?: FormSectionConfig[];
  values?: Record<string, unknown>;
}
