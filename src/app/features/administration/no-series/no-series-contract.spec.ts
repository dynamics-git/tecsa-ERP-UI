import { describe, expect, it } from 'vitest';
import {
  noSeriesListConfig, noSeriesLineConfig,
} from './no-series.config';
import {
  noSeriesLinesListConfig, noSeriesLinesLineConfig,
} from '../no-series-lines/no-series-lines.config';
import {
  noSeriesRelationshipsListConfig, noSeriesRelationshipsLineConfig,
} from '../no-series-relationships/no-series-relationships.config';
import {
  purchaseRequisitionHeaderConfig, purchaseRequisitionListConfig,
} from '../../purchasing/purchase-requisition/purchase-requisition.config';
import {
  purchasesPayablesSetupHeaderConfig,
} from '../../setup/purchases-payables-setup/purchases-payables-setup.config';

describe('No. Series BC-style worksheet and document setup contract', () => {
  it('edits the series list as worksheet rows and uses related worksheets for ranges and alternatives', () => {
    expect(noSeriesListConfig.pageType).toBe('worksheet');
    expect(noSeriesListConfig.dataSource.endpoint).toBe('/numberSeries');
    const fields = noSeriesLineConfig.columns.map(column => column.id);
    expect(fields).toContain('code');
    expect(fields).toContain('manualNos');
    expect(fields).toContain('defaultNos');
    expect(fields).not.toContain('isActive');
    expect(noSeriesLineConfig.toolbarButtons?.map(command => command.runModalPageId)).toEqual([
      'no-series-lines', 'no-series-relationships',
    ]);
  });

  it('uses the actual BC-style Code foreign key, not a guessed record identity', () => {
    expect(noSeriesLinesListConfig.pageType).toBe('worksheet');
    expect(noSeriesLinesLineConfig.dataSource.endpoint).toBe('/numberSeriesLines');
    expect(noSeriesLinesLineConfig.dataSource.lineFKProp).toBe('seriesCode');
    expect(noSeriesLinesLineConfig.dataSource.headerPKProp).toBe('code');
    expect(noSeriesLinesLineConfig.columns.map(column => column.id)).toContain('incrementByNo');
    expect(noSeriesRelationshipsListConfig.pageType).toBe('worksheet');
    expect(noSeriesRelationshipsLineConfig.dataSource.endpoint).toBe('/numberSeriesRelationships');
    expect(noSeriesRelationshipsLineConfig.dataSource.lineFKProp).toBe('code');
  });

  it('stores numbering setup as series Codes and keeps PR No. an authoring field', () => {
    const fields = purchasesPayablesSetupHeaderConfig.sections.flatMap(section => section.fields);
    const requisition = fields.find(field => field.key === 'requisitionNos');
    expect(requisition?.type).toBe('lookup');
    expect(requisition?.lookup?.valueField).toBe('code');
    const prFields = purchaseRequisitionHeaderConfig.sections.flatMap(section => section.fields);
    expect(prFields.find(field => field.key === 'number')?.required).not.toBe(true);
    expect(prFields.some(field => field.key === 'noSeriesCode')).toBe(false);
    expect(purchaseRequisitionListConfig.dataSource.autoGenerateNumber).toBe(true);
    expect(purchaseRequisitionListConfig.dataSource.omitEmptyFields).toContain('number');
  });
});
