import {
  Component,
  DestroyRef,
  HostListener,
  Input,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
  ApiErrorService,
  ConfirmationService,
  DataSourceConfig,
  DataSourceService,
  FieldConfig,
  ListPage,
  PageCommandEvent,
  RunModalPageWindow,
  UnsavedChangesService,
} from '../../../platform/public-api';
import { SessionService } from '../../../core/services/session.service';
import {
  companiesDataSource,
  companiesHeaderConfig,
  companiesLineConfig,
  companiesListConfig,
} from './companies.config';
export * from './companies.config';

@Component({
  selector: 'app-companies',
  standalone: true,
  imports: [ListPage],
  templateUrl: './companies.html',
})
export class CompaniesPage {
  @Input() runModal?: RunModalPageWindow;
  @ViewChild(ListPage) page?: ListPage;
  private readonly data = inject(DataSourceService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly errors = inject(ApiErrorService);
  private readonly session = inject(SessionService);
  private readonly unsaved = inject(UnsavedChangesService);
  readonly source: DataSourceConfig = {
    ...companiesDataSource,
    hooks: {
      beforeDelete: (context) => {
        if (context.id === this.session.Company)
          return 'Switch to another company before deleting the current company.';
        return;
      },
    },
  };
  readonly listConfig = { ...companiesListConfig, dataSource: this.source };
  readonly headerConfig = companiesHeaderConfig;
  readonly lineConfig = { ...companiesLineConfig, dataSource: this.source };
  readonly busy = signal(false);
  private preparing = false;
  private copyDraft: Record<string, unknown> = { mode: 'setup_master' };

  constructor() {
    this.unsaved.register(this, { changed: () => false, saving: () => this.busy() });
    inject(DestroyRef).onDestroy(() => this.unsaved.release(this));
  }

  requestClose(): void {
    if (!this.busy()) this.runModal?.close();
  }
  @HostListener('window:beforeunload', ['$event'])
  protectCompanyOperation(event: BeforeUnloadEvent): void {
    if (this.busy()) {
      event.preventDefault();
      event.returnValue = '';
    }
  }

  async handleBusinessCommand(event: PageCommandEvent): Promise<void> {
    const action = event.actionKey.replace(/^cmd:/, '');
    if (action !== 'copy-company' || this.busy() || this.preparing) return;
    const checked = new Set(event.context.checkedRowKeys);
    const active = event.context.selectedRow;
    const selected = checked.size
      ? (event.context.lineRows ?? []).filter((row) => checked.has(String(row['systemId'])))
      : active && typeof active === 'object'
        ? [active as Record<string, unknown>]
        : [];
    const row = selected[0];
    if (selected.length !== 1 || !row?.['systemId']) {
      void this.confirmation.message('Select an existing company to copy.');
      return;
    }
    if (this.page?.hasPendingWrites || this.page?.hasUnsavedChanges) {
      void this.confirmation.message('Wait for your changes to finish saving, then copy the company.');
      return;
    }
    const stillInContext = this.data.captureWriteScope();
    this.preparing = true;
    let finishProgress: (() => void) | undefined;
    try {
      if (action === 'copy-company') {
        const fields: FieldConfig[] = [
          {
            key: 'code',
            label: 'New company code',
            valueType: 'code',
            required: true,
            defaultValue: this.copyDraft['code'],
          },
          {
            key: 'name',
            label: 'New company name',
            required: true,
            defaultValue: this.copyDraft['name'],
          },
          {
            key: 'mode',
            label: 'Copy scope',
            type: 'select',
            required: true,
            defaultValue: this.copyDraft['mode'],
            options: [
              { value: 'setup_master', label: 'Setup and masters — no transactions' },
              { value: 'full', label: 'Full company — includes transactions' },
            ],
          },
        ];
        const input = await this.confirmation.prompt(`Copy company · ${row['code']}`, fields, {
          confirmLabel: 'Create copy',
          message: `Copy from: ${row['code']} — ${row['name']}`,
        });
        if (!input || !stillInContext()) return;
        this.copyDraft = input;
        if (
          input['mode'] === 'full' &&
          !(await this.confirmation.confirm({
            title: 'Copy entire company',
            message:
              'Copy setup, master records, transactions and history for testing. Shared users and permission assignments are not copied. Review external integrations before using the copy; it is not a separate sandbox.',
          }))
        )
          return;
        if (!stillInContext()) return;
        if (this.page?.hasPendingWrites || this.page?.hasUnsavedChanges)
          throw new Error('Finish pending edits before copying a company.');
        this.busy.set(true);
        finishProgress = this.confirmation.progress('Copying company…', `Creating ${input['code']}. This may take a moment.`);
        const result = await firstValueFrom(
          this.data.execute(this.source, row['systemId'], 'copy', {
            ...input,
            sourceVersion: row['systemRowVersion'],
          }),
        );
        finishProgress();
        finishProgress = undefined;
        this.busy.set(false);
        this.copyDraft = { mode: 'setup_master' };
        const warnings = (result as { copyWarnings?: { code: string }[] } | null)?.copyWarnings ?? [];
        const missingFiles = warnings.filter((warning) => warning.code === 'AttachmentFileMissing').length;
        void this.confirmation.message(
          'Company copied. ' +
            (missingFiles ? `${missingFiles} attachment(s) skipped because their source files are missing. ` : '') +
            'Use Company Access to grant users access before switching.',
        );
      }
      if (stillInContext()) this.page?.handleInlineAction({ actionKey: 'cmd:line-refresh' });
    } catch (error) {
      finishProgress?.();
      finishProgress = undefined;
      this.busy.set(false);
      if (stillInContext())
        void this.confirmation.message(this.errors.toMessage(error, 'Company operation failed.'));
    } finally {
      finishProgress?.();
      this.busy.set(false);
      this.preparing = false;
    }
  }
}
