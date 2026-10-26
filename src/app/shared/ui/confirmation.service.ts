import { Injectable } from '@angular/core';
import { ConfirmationDialogConfig } from '../../platform/models/confirmation-dialog-config.model';
import { RunModalStackService } from '../../platform/run-modal/run-modal-stack.service';
import { FieldConfig } from '../../platform/models/field-config.model';

export type ConfirmationOptions = {
  title?: string;
  message: string;
};

export type ConfirmationIntent = 'delete';

export type ConfirmationEntity = string;

export type IntentConfirmationOptions = {
  intent: ConfirmationIntent;
  entity?: ConfirmationEntity;
  entityLabel?: string;
  count?: number;
  customTitle?: string;
  customMessage?: string;
  customHint?: string;
};

@Injectable({ providedIn: 'root' })
export class ConfirmationService {
  private readonly pending = new Map<string, { resolve: (value: boolean) => void }>();

  private readonly labels = {
    deleteTitle: 'Delete Confirmation',
    messageTitle: 'System Message',
    deleteSingle: 'Delete selected {label}?',
    deleteMulti: 'Delete {count} {labelPlural}?',
    deleteHint: 'This operation is permanent.'
  } as const;

  private readonly intentTemplates: Record<ConfirmationIntent, { title: string; single: string; multi: string; hint: string }> = {
    delete: {
      title: 'Delete Confirmation',
      single: 'Delete selected {label}?',
      multi: 'Delete {count} {labelPlural}?',
      hint: 'This operation is permanent.'
    }
  };

  private readonly entityLabels: Record<string, string> = {
    record: 'record',
    purchaseOrder: 'purchase order'
  };

  constructor(private readonly popupStack: RunModalStackService) {}

  confirm(options: ConfirmationOptions): Promise<boolean> {
    const title = (options.title ?? '').trim();
    const message = options.message.trim();
    if (!message.length) {
      return Promise.resolve(false);
    }

    return this.openDialog({
      title,
      message,
      confirmLabel: 'OK',
      cancelLabel: 'Cancel',
      kind: 'confirm'
    });
  }

  confirmIntent(options: IntentConfirmationOptions): Promise<boolean> {
    const template = this.intentTemplates[options.intent];
    const count = Number.isFinite(options.count) ? Math.max(0, Math.trunc(options.count ?? 1)) : 1;
    const customMessage = (options.customMessage ?? '').trim();
    if (customMessage) {
      const customHint = (options.customHint ?? '').trim();
      const customTitle = (options.customTitle ?? template.title).trim() || template.title;
      const message = customHint ? `${customMessage}\n\n${customHint}` : customMessage;
      return this.confirm({
        title: customTitle,
        message
      });
    }

    const label = this.resolveEntityLabel(options.entity, options.entityLabel);
    const labelPlural = count === 1 ? label : `${label}s`;
    const body = count <= 1
      ? template.single.replace('{label}', label)
      : template.multi
        .replace('{count}', String(count))
        .replace('{labelPlural}', labelPlural);

    return this.confirm({
      title: template.title,
      message: `${body}\n\n${template.hint}`
    });
  }

  private resolveEntityLabel(entity: ConfirmationEntity | undefined, entityLabel: string | undefined): string {
    const explicitLabel = (entityLabel ?? '').trim();
    if (explicitLabel) {
      return explicitLabel;
    }

    const entityKey = (entity ?? '').trim();
    if (!entityKey) {
      return this.entityLabels['record'];
    }

    const configured = this.entityLabels[entityKey];
    if (configured) {
      return configured;
    }

    return entityKey
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/[_-]+/g, ' ')
      .trim()
        .toLowerCase() || this.entityLabels['record'];
  }

  message(text: string, title: string = this.labels.messageTitle): Promise<void> {
    const value = text.trim();
    if (!value.length) {
      return Promise.resolve();
    }

    const normalizedTitle = title.trim();
    return this.openDialog({
      title: normalizedTitle,
      message: value,
      confirmLabel: 'OK',
      kind: 'alert'
    }).then(() => undefined);
  }

  async prompt(title: string, fields: FieldConfig[]): Promise<Record<string, unknown> | null> {
    const values = Object.fromEntries(fields.map(field => [field.key, field.defaultValue ?? '']));
    const confirmed = await this.openDialog({ title, message: '', kind: 'confirm', confirmLabel: 'Continue', cancelLabel: 'Cancel',
      sections: [{ id: 'command-input', fields }], values });
    return confirmed ? values : null;
  }

  resolveDialog(popupId: string, value: boolean): void {
    const pending = this.pending.get(popupId);
    if (!pending) {
      return;
    }

    this.pending.delete(popupId);
    this.popupStack.close(popupId);
    pending.resolve(value);
  }

  dismissDialog(popupId: string): void {
    this.resolveDialog(popupId, false);
  }

  private openDialog(config: ConfirmationDialogConfig): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      const popupId = `confirmation-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      this.pending.set(popupId, { resolve });

      this.popupStack.open({
        id: popupId,
        title: config.title,
        mode: 'modal',
        size: 'sm',
        allowNested: true,
        closeOnBackdrop: config.kind === 'confirm',
        data: {
          confirmationDialogConfig: config
        }
      });
    });
  }
}
