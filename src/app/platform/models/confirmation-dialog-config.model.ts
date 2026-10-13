export type ConfirmationDialogKind = 'confirm' | 'alert';

export interface ConfirmationDialogConfig {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  kind: ConfirmationDialogKind;
}
