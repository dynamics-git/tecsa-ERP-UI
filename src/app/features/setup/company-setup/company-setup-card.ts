import { Component, Input, OnInit, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiErrorService, DocumentWindow, EntryStatusMessage, EntryHeaderSectionConfig } from '../../../platform/public-api';
import { PermissionService } from '../../../core/services/permission.service';
import { RestService } from '../../../core/services/rest.service';
import { SessionService } from '../../../core/services/session.service';
import { CompanySetupDefinition } from './company-setup.config';

type PendingChange = { fieldKey: string; value: unknown };

/**
 * Generic GET/PUT company-singleton page; both accounting setups use this one
 * runtime. Does not pretend that singleton setup is list CRUD or create a fake ID.
 */
@Component({
  selector: 'app-company-setup-card',
  standalone: true,
  imports: [DocumentWindow],
  template: `
    <div class="company-setup-host">
      <app-document-window
        [embedded]="true"
        [pageLabel]="'COMPANY SETUP'"
        [title]="definition.title"
        [subtitle]="companyName"
        [popupHeaderSections]="formSections"
        [popupHeaderData]="record"
        [popupHeaderToolbarButtons]="toolbar"
        [popupStatusMessage]="status"
        [popupInteractionLocked]="loading || failedLoad"
        (action)="handleAction($event)">
      </app-document-window>
    </div>
  `,
  styles: [`
    .company-setup-host {
      padding: 14px 18px;
      min-height: calc(100vh - 160px);
    }
  `],
})
export class CompanySetupCard implements OnInit {
  @Input({ required: true }) definition!: CompanySetupDefinition;

  private readonly rest = inject(RestService);
  private readonly apiError = inject(ApiErrorService);
  private readonly session = inject(SessionService);
  private readonly permission = inject(PermissionService);

  record: Record<string, unknown> = {};
  status: EntryStatusMessage = { tone: 'info', message: 'Loading setup...' };
  loading = true;
  failedLoad = false;
  saving = false;
  private pending: PendingChange[] = [];
  private persisted: Record<string, unknown> = {};
  private loadedCompanyId = '';
  private numberSeries: Record<string, unknown>[] = [];
  formSections: EntryHeaderSectionConfig[] = [];

  get companyName(): string { return this.session.CompanyName; }

  get canModify(): boolean {
    return this.permission.isSuperAdmin() ||
      this.session.hasPermission(this.definition.resource, 'modify');
  }

  get toolbar() {
    return [
      { actionKey: 'cmd:refresh', label: 'Refresh', icon: 'bi bi-arrow-clockwise', isPrimary: true },
      { actionKey: 'cmd:save', label: 'Save', icon: 'bi bi-check2', isPrimary: true,
        disabled: !this.canModify || this.loading || this.failedLoad },
    ];
  }

  ngOnInit(): void {
    void this.refresh();
  }

  async refresh(): Promise<void> {
    if (this.saving) return;
    this.loading = true;
    this.failedLoad = false;
    this.pending = [];
    this.loadedCompanyId = this.session.Company;
    this.status = { tone: 'info', message: 'Loading setup...' };

    try {
      const [result, series] = await Promise.all([
        firstValueFrom(this.rest.get(this.definition.endpoint, { suppressGlobalErrorDialog: true }))
          .catch((error: unknown) => {
            if (this.statusCode(error) === 404) return null; // Singleton not provisioned yet.
            throw error;
          }),
        this.fetchSeriesOptions(),
      ]);
      if (this.loadedCompanyId !== this.session.Company) {
        throw new Error('The company changed while setup was loading. Reload the page.');
      }
      const row = result === null ? {} : this.unwrapRecord(result);
      this.numberSeries = series;
      this.record = this.buildRecord(row);
      this.persisted = { ...this.record };
      this.formSections = this.buildSections();
      this.status = result === null
        ? { tone: 'info', message: 'Not configured yet. Select a No. Series to create setup.' }
        : { tone: 'success', message: 'Setup loaded. Changes save automatically.' };
    } catch (error: unknown) {
      this.failedLoad = true;
      this.status = { tone: 'error', message: this.errorMessage(error) };
    } finally {
      this.loading = false;
    }
  }

  handleAction(action: { actionKey: string; payload?: unknown }): void {
    if (action.actionKey === 'cmd:refresh') {
      void this.refresh();
      return;
    }
    if (action.actionKey === 'cmd:save') {
      if (this.canModify) void this.flush();
      return;
    }
    if (action.actionKey !== 'header:changed' || !this.canModify || this.failedLoad || this.loading) {
      return;
    }
    const payload = action.payload;
    if (!this.isRecord(payload)) return;
    const fieldKey = payload['fieldKey'];
    if (typeof fieldKey !== 'string' || !this.definition.editableFields.includes(fieldKey)) return;
    const field = this.definition.header.sections.flatMap(section => section.fields)
      .find(candidate => candidate.key === fieldKey);
    const value = field?.type === 'dropdown' && fieldKey.endsWith('NoSeriesId') &&
      (payload['value'] === '' || payload['value'] === undefined)
      ? null : payload['value'];
    this.record[fieldKey] = value;
    this.pending = this.pending.filter(change => change.fieldKey !== fieldKey);
    this.pending.push({ fieldKey, value });
    void this.flush();
  }

  private async flush(): Promise<void> {
    if (this.saving || !this.pending.length || !this.canModify || this.failedLoad) return;
    if (this.session.Company !== this.loadedCompanyId) {
      this.status = { tone: 'error', message: 'Company changed. Refresh setup before saving.' };
      return;
    }
    this.saving = true;
    try {
      while (this.pending.length) {
        const next = this.pending.shift()!;
        const etag = this.persisted['systemRowVersion'];
        const version = etag === undefined || etag === null ? undefined : Number(etag);
        if (version !== undefined && (!Number.isSafeInteger(version) || version < 1)) {
          throw new Error('Invalid setup record version. Refresh before saving.');
        }
        const options = version === undefined ? undefined : { ifMatch: `"${version}"` };
        this.status = { tone: 'info', message: 'Saving setup...' };
        const reply = await firstValueFrom(this.rest.put(
          this.definition.endpoint, { [next.fieldKey]: next.value }, options,
        ));
        const saved = this.unwrapRecord(reply);
        this.persisted = this.buildRecord(saved);
        // Preserve form edits awaiting their own serialized PUT.
        this.record = { ...this.persisted };
        for (const item of this.pending) this.record[item.fieldKey] = item.value;
      }
      this.status = { tone: 'success', message: 'Saved automatically.' };
    } catch (error: unknown) {
      this.pending = [];
      this.record = { ...this.persisted };
      this.status = { tone: 'error', message: `Save failed. ${this.errorMessage(error)}` };
    } finally {
      this.saving = false;
    }
  }

  private buildRecord(record: Record<string, unknown>): Record<string, unknown> {
    const data = { ...record };
    for (const section of this.definition.header.sections) {
      for (const field of section.fields) {
        if (data[field.key] === undefined) data[field.key] = field.defaultValue ?? '';
      }
    }
    for (const field of this.definition.editableFields.filter(key => key.endsWith('NoSeriesId'))) {
      data[`__options_${field}`] = this.numberSeries;
    }
    return data;
  }

  private buildSections(): EntryHeaderSectionConfig[] {
    return this.definition.header.sections.map(section => ({
      ...section,
      fields: section.fields.map(field => ({ ...field, disabled: !this.canModify })),
    }));
  }

  private async fetchSeriesOptions(): Promise<Record<string, unknown>[]> {
    const records: Record<string, unknown>[] = [];
    for (let page = 1; page <= 50; page++) {
      const reply = await firstValueFrom(this.rest.get(`/numberSeries?page=${page}&perPage=100`));
      if (!this.isRecord(reply) || !Array.isArray(reply['data'])) {
        throw new Error('Number Series lookup returned an invalid response.');
      }
      records.push(...reply['data'].filter(item => this.isRecord(item)));
      const meta = reply['meta'];
      const lastPage = this.isRecord(meta) ? Number(meta['lastPage']) : 1;
      if (!Number.isSafeInteger(lastPage) || lastPage < 1) {
        throw new Error('Number Series lookup returned invalid paging.');
      }
      if (page >= lastPage) return records;
    }
    throw new Error('Too many number series to display. Use a filtered lookup before saving.');
  }

  private unwrapRecord(reply: unknown): Record<string, unknown> {
    if (!this.isRecord(reply) || !this.isRecord(reply['data'])) {
      throw new Error('Setup API returned an invalid record.');
    }
    return reply['data'];
  }

  private statusCode(error: unknown): number | undefined {
    return this.isRecord(error) && typeof error['status'] === 'number'
      ? error['status'] : undefined;
  }

  private errorMessage(error: unknown): string {
    return this.apiError.toMessage(error, 'Unable to load or save ERP setup.');
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }
}
