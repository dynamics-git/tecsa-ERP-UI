import { Injectable, inject } from '@angular/core';
import { DataSourceConfig } from '../models/data-source-config.model';
import { LineColumnConfig, LineConfig } from '../models/line-config.model';
import { RuntimeValueMapperService } from '../data/runtime-value-mapper.service';

export type DocumentPageResolvedLineDataSource = {
  dataSource: DataSourceConfig;
  lineContextReady: boolean;
  reason?: string;
};

export type DocumentPageLineValueType = 'text' | 'number' | 'boolean' | 'date';

@Injectable({
  providedIn: 'root',
})
export class DocumentPageDataSourceResolverService {
  private readonly valueMapper = inject(RuntimeValueMapperService);

  buildLineFilter(params: {
    header: Record<string, unknown>;
    lineDataSource: DataSourceConfig;
    lineConfig?: LineConfig;
    listDataSource: DataSourceConfig;
    hasValue(value: unknown): boolean;
    toODataLiteral(value: unknown): string;
  }): string {
    if (!params.lineConfig) {
      return '';
    }

    const clauses: string[] = [];
    const parentKeyField = params.lineDataSource.parentKeyField;
    const documentNoField =
      params.lineDataSource.documentNoField ?? params.listDataSource.documentNoField;
    const documentNo = documentNoField ? params.header[documentNoField] : undefined;

    if (parentKeyField && !params.lineDataSource.navigation) {
      if (!params.hasValue(documentNo)) {
        return '';
      }

      clauses.push(`${parentKeyField} eq ${params.toODataLiteral(documentNo)}`);
    }

    for (const [field, value] of Object.entries(params.lineDataSource.parentFixedFields ?? {})) {
      clauses.push(`${field} eq ${params.toODataLiteral(value)}`);
    }

    return clauses.join(' and ');
  }

  resolveLineDataSourceForHeader(params: {
    header: Record<string, unknown>;
    lineConfig?: LineConfig;
    hasValue(value: unknown): boolean;
    toODataId(value: unknown): string;
  }): DocumentPageResolvedLineDataSource {
    if (!params.lineConfig) {
      return {
        dataSource: { endpoint: '' },
        lineContextReady: false,
        reason: 'Line config is missing.',
      };
    }

    const baseDataSource = params.lineConfig.dataSource;
    const relation = baseDataSource.navigation;
    if (!relation) {
      return { dataSource: baseDataSource, lineContextReady: true };
    }

    const parentEndpoint = relation.parentEndpoint?.trim();
    const childCollection = relation.childCollection?.trim();
    if (!parentEndpoint || !childCollection) {
      return {
        dataSource: baseDataSource,
        lineContextReady: false,
        reason: 'Line navigation requires parentEndpoint and childCollection.',
      };
    }

    const configuredParentIdFields =
      relation.parentIdFields
        ?.map((field) => field.trim())
        .filter((field) => field.length > 0) ?? [];
    if (!configuredParentIdFields.length) {
      return {
        dataSource: baseDataSource,
        lineContextReady: false,
        reason: 'Line navigation requires navigation.parentIdFields.',
      };
    }

    const parentId = this.resolveNavigationParentId({
      header: params.header,
      lineDataSource: baseDataSource,
      hasValue: params.hasValue,
    });
    if (!params.hasValue(parentId)) {
      return {
        dataSource: baseDataSource,
        lineContextReady: false,
        reason: 'Save header first before loading or editing lines.',
      };
    }

    return {
      dataSource: {
        ...baseDataSource,
        endpoint: relation.style === 'rest'
          ? `${parentEndpoint}/${encodeURIComponent(String(parentId))}/${childCollection}`
          : `${parentEndpoint}(${params.toODataId(parentId)})/${childCollection`,
      },
      lineContextReady: true,
    };
  }

  resolveNavigationParentId(params: {
    header: Record<string, unknown>;
    lineDataSource: DataSourceConfig;
    hasValue(value: unknown): boolean;
  }): unknown {
    const relation = params.lineDataSource.navigation;
    if (!relation) {
      return undefined;
    }

    const candidates =
      relation.parentIdFields
        ?.map((field) => field.trim())
        .filter((field) => field.length > 0) ?? [];

    for (const field of candidates) {
      const value = params.header[field];
      if (params.hasValue(value)) {
        return value;
      }
    }

    return undefined;
  }

  getLineTypeField(params: { lineConfig?: LineConfig }): string {
    const configured = params.lineConfig?.columns.find((column) =>
      (column.options ?? []).some((option) => this.resolveApiEndpoints({ source: option.api }).length > 0),
    );
    return this.getColumnField({ column: configured });
  }

  getLineNumberField(params: { lineConfig?: LineConfig }): string {
    const configured = params.lineConfig?.columns.find((column) => Boolean(column.fill));
    return this.getColumnField({ column: configured });
  }

  getLineColumnOptionsDataKey(params: { lineConfig?: LineConfig; fieldName: string }): string {
    const column = params.lineConfig?.columns.find((item) => this.getColumnField({ column: item }) === params.fieldName);
    return column?.optionsDataKey?.trim() || `__options_${params.fieldName}`;
  }

  getLineColumnByOptionsKey(params: {
    lineConfig?: LineConfig;
    optionsKey: string;
  }): LineColumnConfig | undefined {
    return params.lineConfig?.columns.find((column) => {
      const field = this.getColumnField({ column });
      const key = column.optionsDataKey?.trim() || (field ? `__options_${field}` : '');
      return key === params.optionsKey;
    });
  }

  getLineMasterValueFields(params: { lineConfig?: LineConfig }): string[] {
    const column = params.lineConfig?.columns.find((item) => Boolean(item.fill));
    return this.resolveConfiguredFields({ source: column?.valueField });
  }

  getLineMasterLabelFields(params: { lineConfig?: LineConfig }): string[] {
    const column = params.lineConfig?.columns.find((item) => Boolean(item.fill));
    return this.resolveConfiguredFields({ source: column?.labelField });
  }

  resolveConfiguredFields(params: { source: string | string[] | undefined }): string[] {
    return this.valueMapper.resolveConfiguredFields(params.source);
  }

  getLineFillTargetFields(params: { lineConfig?: LineConfig; fieldName: string }): string[] {
    const column = params.lineConfig?.columns.find(
      (item) => this.getColumnField({ column: item }) === params.fieldName,
    );
    return column?.fill ? Object.keys(column.fill) : [];
  }

  getLineFieldsByValueType(params: {
    lineConfig?: LineConfig;
    valueType: DocumentPageLineValueType;
  }): string[] {
    return (params.lineConfig?.columns ?? [])
      .filter((column) => column.valueType === params.valueType)
      .map((column) => this.getColumnField({ column }))
      .filter(Boolean);
  }

  getColumnField(params: { column: LineColumnConfig | undefined }): string {
    return this.valueMapper.toText(params.column?.field ?? params.column?.id).trim();
  }

  resolveLineNoField(params: { lineConfig?: LineConfig }): string {
    return params.lineConfig?.lineKeyField ?? '';
  }

  resolveApiEndpoints(params: { source: string | string[] | undefined }): string[] {
    return this.valueMapper.resolveApiEndpoints(params.source);
  }
}
