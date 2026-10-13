import { Injectable, inject } from '@angular/core';
import { EntryAttachmentsConfig, DocumentWindowConfig } from '../models/document-window-config.model';
import { ListPageConfig } from '../models/page-config.model';
import { DataSourceConfig } from '../models/data-source-config.model';
import { RuntimeValueMapperService } from '../data/runtime-value-mapper.service';
import { RunModalConfigModule, RunModalContext } from './run-modal-config.token';

@Injectable({
  providedIn: 'root',
})
export class RunModalConfigAssemblerService {
  private readonly valueMapper = inject(RuntimeValueMapperService);

  buildGenericEntryDialogConfig(params: {
    module: RunModalConfigModule;
    pageId: string;
    context: RunModalContext;
  }): DocumentWindowConfig {
    const headerConfig = this.pickObject({ module: params.module, suffix: 'HeaderConfig' });
    const lineConfig = this.pickObject({ module: params.module, suffix: 'LineConfig' });
    const title = this.pickDialogTitle({ module: params.module }) || this.toTitleCase(params.pageId);
    const pageLabel = this.resolvePageLabel({ module: params.module, pageId: params.pageId, title });
    const headerSections =
      this.pickNestedArray({ source: headerConfig, key: 'sections' })
      ?? this.pickArray({ module: params.module, suffix: 'HeaderSections' });
    const lineColumns =
      this.pickNestedArray({ source: lineConfig, key: 'columns' })
      ?? this.pickArray({ module: params.module, suffix: 'LineColumns' });
    const headerToolbarButtons =
      this.pickNestedArray({ source: headerConfig, key: 'toolbarButtons' })
      ?? this.pickArray({ module: params.module, suffix: 'HeaderToolbarButtons' });
    const lineToolbarButtons =
      this.pickNestedArray({ source: lineConfig, key: 'toolbarButtons' })
      ?? this.pickArray({ module: params.module, suffix: 'LineToolbarButtons' });
    const headerCommandBar =
      this.toRecord(headerConfig?.['commandBar'])
      ?? this.pickObject({ module: params.module, suffix: 'HeaderCommandBar' });
    const lineCommandBar =
      this.toRecord(lineConfig?.['commandBar'])
      ?? this.pickObject({ module: params.module, suffix: 'LineCommandBar' });
    const linePlacement =
      this.toRecord(lineConfig?.['placement'])
      ?? this.pickObject({ module: params.module, suffix: 'LinePlacement' });
    const lineTotalsDefault = this.pickObject({ module: params.module, suffix: 'LineTotalsDefault' });
    const footerSections = this.pickArray({ module: params.module, suffix: 'FooterSections' });
    const attachmentsDefault =
      this.toRecord(headerConfig?.['attachmentsDefault'])
      ?? this.pickObject({ module: params.module, suffix: 'AttachmentsDefault' })
      ?? this.getDefaultAttachments();

    const headerData = this.buildHeaderData({ context: params.context, headerSections });
    const lineRows = this.buildLineRows({ context: params.context });
    const lineTotals = this.buildLineTotals({ source: lineTotalsDefault });

    const entryDialogConfig: DocumentWindowConfig = {
      pageLabel,
      title,
      headerCommandBar: headerCommandBar as DocumentWindowConfig['headerCommandBar'],
      lineCommandBar: lineCommandBar as DocumentWindowConfig['lineCommandBar'],
      linePlacement: linePlacement as DocumentWindowConfig['linePlacement'],
      lineCommandPolicy: {
        injectDefaultLineNew: false,
        injectDefaultLineDelete: false,
      },
      headerToolbarButtons: headerToolbarButtons as DocumentWindowConfig['headerToolbarButtons'],
      lineToolbarButtons: lineToolbarButtons as DocumentWindowConfig['lineToolbarButtons'],
      headerSections: headerSections as DocumentWindowConfig['headerSections'],
      headerData,
      lineColumns: lineColumns as DocumentWindowConfig['lineColumns'],
      lineRows,
      lineTotals,
      footerSections: footerSections as DocumentWindowConfig['footerSections'],
      attachments: attachmentsDefault as DocumentWindowConfig['attachments'],
    };

    return entryDialogConfig;
  }

  getDefaultAttachments(): EntryAttachmentsConfig {
    return {
      headerFilesCount: 0,
      lineFilesCount: 0,
      canUpload: true,
      primaryActionLabel: 'Add attachment',
      primaryActionKey: 'dialog:attachments',
    };
  }

  pickDataSource(params: { module: RunModalConfigModule }): DataSourceConfig | undefined {
    const listConfig = this.pickListPageConfig({ module: params.module });
    const nestedDataSource = this.toRecord(listConfig?.['dataSource']);
    if (typeof nestedDataSource?.['endpoint'] === 'string') {
      return nestedDataSource as unknown as DataSourceConfig;
    }

    for (const [key, value] of Object.entries(params.module)) {
      const record = this.toRecord(value);
      if (!key.endsWith('ListDataSource') || !record) {
        continue;
      }

      if (typeof record['endpoint'] === 'string') {
        return record as unknown as DataSourceConfig;
      }
    }

    return undefined;
  }

  pickLineDataSource(params: { module: RunModalConfigModule }): DataSourceConfig | undefined {
    const lineConfig = this.pickObject({ module: params.module, suffix: 'LineConfig' });
    const nestedDataSource = this.toRecord(lineConfig?.['dataSource']);
    if (typeof nestedDataSource?.['endpoint'] === 'string') {
      return nestedDataSource as unknown as DataSourceConfig;
    }

    for (const [key, value] of Object.entries(params.module)) {
      const record = this.toRecord(value);
      if (!key.endsWith('LineDataSource') || !record) {
        continue;
      }

      if (typeof record['endpoint'] === 'string') {
        return record as unknown as DataSourceConfig;
      }
    }

    return undefined;
  }

  pickListPageConfig(params: { module: RunModalConfigModule }): ListPageConfig | undefined {
    const direct = this.pickObject({ module: params.module, suffix: 'ListPageConfig' }) as ListPageConfig | undefined;
    if (direct) {
      return direct;
    }

    const bucket = this.pickObject({ module: params.module, suffix: 'ListConfig' }) as ListPageConfig | undefined;
    if (bucket) {
      return bucket;
    }

    for (const value of Object.values(params.module)) {
      const record = this.toRecord(value);
      if (!record) {
        continue;
      }

      const pageId = this.toText(record['pageId']).trim();
      const pageType = this.toText(record['pageType']).trim();
      const dataSource = this.toRecord(record['dataSource']);
      if (pageId.length && pageType.length && dataSource && typeof dataSource['endpoint'] === 'string') {
        return record as unknown as ListPageConfig;
      }
    }

    return undefined;
  }

  pickDialogTitle(params: { module: RunModalConfigModule }): string {
    const headerConfig = this.pickObject({ module: params.module, suffix: 'HeaderConfig' });
    const nestedTitle = this.toText(headerConfig?.['dialogTitle']).trim();
    if (nestedTitle.length) {
      return nestedTitle;
    }

    for (const [key, value] of Object.entries(params.module)) {
      if (key.endsWith('DialogTitle') && typeof value === 'string' && value.trim()) {
        return value;
      }
    }

    return '';
  }

  resolvePageLabel(params: { module: RunModalConfigModule; pageId: string; title: string }): string {
    for (const [key, value] of Object.entries(params.module)) {
      if (key.endsWith('PageLabel') && typeof value === 'string' && value.trim()) {
        return value.trim();
      }
    }

    const base = params.title.trim() || this.toTitleCase(params.pageId);
    return base.toUpperCase();
  }

  pickArray(params: { module: RunModalConfigModule; suffix: string }): unknown[] {
    for (const [key, value] of Object.entries(params.module)) {
      if (key.endsWith(params.suffix) && Array.isArray(value)) {
        return value;
      }
    }

    return [];
  }

  pickNestedArray(params: {
    source: Record<string, unknown> | undefined;
    key: string;
  }): unknown[] | undefined {
    const value = params.source?.[params.key];
    return Array.isArray(value) ? value : undefined;
  }

  pickObject(params: {
    module: RunModalConfigModule;
    suffix: string;
  }): Record<string, unknown> | undefined {
    for (const [key, value] of Object.entries(params.module)) {
      const record = this.toRecord(value);
      if (key.endsWith(params.suffix) && record) {
        return record;
      }
    }

    return undefined;
  }

  resolveEntryHydrationTop(params: { module: RunModalConfigModule; dataSource: DataSourceConfig }): number {
    const pageConfig = this.pickListPageConfig({ module: params.module });
    const pageType = this.toText(pageConfig?.pageType).trim().toLowerCase();
    if (pageType === 'setup') {
      return 1;
    }

    return params.dataSource.navigation?.top ?? params.dataSource.pageSize ?? 20;
  }

  isWorksheetPage(params: { module: RunModalConfigModule }): boolean {
    const pageConfig = this.pickListPageConfig({ module: params.module });
    return this.toText(pageConfig?.pageType).trim().toLowerCase() === 'worksheet';
  }

  resolvePageType(params: { module: RunModalConfigModule; pageId: string }): string {
    const normalizedPageId = params.pageId.trim().toLowerCase();
    if (!normalizedPageId.length) {
      return '';
    }

    for (const exportedValue of Object.values(params.module)) {
      const record = this.toRecord(exportedValue);
      if (!record) {
        continue;
      }

      const declaredPageId = this.toText(record['pageId']).trim().toLowerCase();
      if (declaredPageId === normalizedPageId) {
        return this.toText(record['pageType']).trim().toLowerCase();
      }
    }

    return '';
  }

  buildHeaderData(params: {
    context: RunModalContext;
    headerSections: unknown[];
  }): Record<string, unknown> {
    const headerData = { ...(this.toRecord(params.context['headerData']) ?? {}) };
    const activeLine = this.toRecord(params.context['activeLine']);

    for (const section of params.headerSections ?? []) {
      const sectionRecord = this.toRecord(section);
      const sectionFields = Array.isArray(sectionRecord?.['fields']) ? sectionRecord['fields'] : [];
      for (const field of sectionFields) {
        const fieldRecord = this.toRecord(field);
        const key = this.toText(fieldRecord?.['key']).trim();
        if (!key.length) {
          continue;
        }

        const resolved = this.resolveContextHeaderValue(key, headerData, activeLine);
        if (resolved !== undefined) {
          headerData[key] = resolved;
          continue;
        }

        if (!(key in headerData)) {
          const valueType = this.toText(fieldRecord?.['valueType']).trim().toLowerCase();
          headerData[key] = valueType === 'number' ? 0 : '';
        }
      }
    }

    return headerData;
  }

  buildLineRows(params: { context: RunModalContext }): Record<string, unknown>[] {
    if (Array.isArray(params.context['lineRows'])) {
      return params.context['lineRows'].filter(
        (item): item is Record<string, unknown> => this.toRecord(item) !== undefined,
      );
    }

    const activeLine = this.toRecord(params.context['activeLine']);
    return activeLine ? [activeLine] : [];
  }

  buildLineTotals(params: { source: unknown }): DocumentWindowConfig['lineTotals'] {
    const totals = this.toRecord(params.source);
    if (
      totals
      && 'subtotal' in totals
      && 'sst' in totals
      && 'total' in totals
      && 'difference' in totals
    ) {
      return {
        subtotal: this.toText(totals['subtotal']),
        sst: this.toText(totals['sst']),
        total: this.toText(totals['total']),
        difference: this.toText(totals['difference']),
      };
    }

    return {
      subtotal: '0.00',
      sst: '0.00',
      total: '0.00',
      difference: '0.00',
    };
  }

  private resolveContextHeaderValue(
    key: string,
    headerData: Record<string, unknown> | undefined,
    activeLine: Record<string, unknown> | undefined,
  ): unknown {
    const direct = this.firstPresentValue([activeLine?.[key], headerData?.[key]]);
    if (direct !== undefined) {
      return direct;
    }

    return undefined;
  }

  private firstPresentValue(values: unknown[]): unknown {
    return values.find(
      (value) => value !== null && value !== undefined && String(value).trim().length > 0,
    );
  }

  private toRecord(value: unknown): Record<string, unknown> | undefined {
    if (typeof value === 'object' && value !== null) {
      return value as Record<string, unknown>;
    }

    return undefined;
  }

  private toText(value: unknown): string {
    return this.valueMapper.toText(value);
  }

  private toTitleCase(value: string): string {
    const normalized = value.replace(/[-_]+/g, ' ').trim();
    if (!normalized.length) {
      return '';
    }

    return normalized
      .split(/\s+/)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }
}
