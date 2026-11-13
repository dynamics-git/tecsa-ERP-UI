import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it } from 'vitest';
import { featurePageModules } from '../../features/feature-pages.generated';
import {
  purchaseOrderHeaderConfig,
  purchaseOrderLineConfig,
  purchaseOrderListConfig,
} from '../../features/purchasing/purchase-order/purchase-order.config';
import { dimensionValueCombinationsLineConfig } from '../../features/purchase-masters/dimension-value-combinations/dimension-value-combinations.config';
import {
  itemDefaultDimensionsHeaderConfig,
  itemDefaultDimensionsLineConfig,
} from '../../features/purchase-masters/item-default-dimensions/item-default-dimensions.config';
import { vendorDefaultDimensionsLineConfig } from '../../features/purchase-masters/vendor-default-dimensions/vendor-default-dimensions.config';
import { glAccountDefaultDimensionsLineConfig } from '../../features/purchase-masters/gl-account-default-dimensions/gl-account-default-dimensions.config';
import { dimensionsListConfig } from '../../features/purchase-masters/dimensions/dimensions.config';
import { warehouseBinsHeaderConfig } from '../../features/purchase-masters/warehouse-bins/warehouse-bins.config';
import {
  generalPostingSetupHeaderConfig,
  generalPostingSetupListConfig,
} from '../../features/purchase-masters/general-posting-setup/general-posting-setup.config';
import { DocumentPageCommandRoutingResolverService } from '../pages/document-page-command-routing-resolver.service';
import { DocumentConfigDataService } from './document-config-data.service';
import { DocumentPayloadService } from './document-payload.service';
import { DataSourceService } from './data-source.service';
import { headerDataSourceDefaults, lineConfigDefaults } from './document-config-defaults';
import { EntityContractService } from './entity-contract.service';
import { LineMasterService } from './line-master.service';
import { lookupQuery } from './lookup-dependencies';

afterEach(() => TestBed.resetTestingModule());

describe('Installed API configuration consistency', () => {
  it('does not require nonblank posting groups where the table permits a blank combination', () => {
    const source = headerDataSourceDefaults(
      generalPostingSetupListConfig.dataSource,
      generalPostingSetupHeaderConfig,
    );
    expect(source.requiredCreateFields).not.toContain('genBusPostingGroup');
    expect(source.requiredCreateFields).not.toContain('genProdPostingGroup');
  });
  it('has no fallback remote dropdown declarations', () => {
    for (const module of featurePageModules) {
      const serialized = JSON.stringify(module);
      expect(serialized).not.toMatch(/"(?:api|optionsEndpoints)":/);
      expect(serialized).not.toMatch(
        /\/purchaseOrder(?:Headers|Lines)|\/numberSeries|\/dimensions\/\{/,
      );
    }
  });

  it('creates an Order with its fixed integer scope and patches only the changed field afterwards', () => {
    const payloads = TestBed.inject(DocumentPayloadService);
    const contracts = new EntityContractService();
    const source = headerDataSourceDefaults(
      purchaseOrderListConfig.dataSource,
      purchaseOrderHeaderConfig,
    );
    const values = new DocumentConfigDataService(new LineMasterService());
    const seed = values.buildHeaderSeed(purchaseOrderHeaderConfig.sections, {
      documentType: 1,
      number: 'PO-001',
    });
    const payload = payloads.buildHeaderCreatePayload(
      seed,
      purchaseOrderHeaderConfig.sections,
      false,
    );
    expect(contracts.sanitizePayload(source, 'create', payload)).toMatchObject({
      documentType: 1,
      number: 'PO-001',
    });
    expect(payload).not.toHaveProperty('status');
    expect(source.defaultFilter).toBe('documentType eq 1');
    expect(source.updateFields).not.toContain('documentType');
    expect(source.updateFields).not.toContain('number');
    expect(contracts.sanitizePayload(source, 'update', { yourReference: 'Changed' })).toEqual({
      yourReference: 'Changed',
    });
  });

  it('keeps loaded integer line Types usable by their No. lookup and retains both parent fields', () => {
    const values = new DocumentConfigDataService(new LineMasterService());
    const lines = lineConfigDefaults(purchaseOrderLineConfig);
    const registry = { defaultType: '2', emptyType: '', byType: {} };
    const parent = { number: 'PO-001', documentType: 1 };
    const row = values.buildLineRows(
      lines,
      parent,
      [{ systemId: 'line', type: 2, number: 'ITEM001' }],
      registry,
      {},
    )[0];
    expect(row['type']).toBe(2);
    const itemLookup = lines.columns.find((column) => column.id === 'itemNumber')!;
    expect(itemLookup.editableWhen?.values).toContain(row['type']);
    expect(values.buildLineUpdatePayload(row, ['type'], lines)).toEqual({ type: 2 });
    const entry = values.createEmptyLineRow(lines, parent, registry, {});
    entry['description'] = 'Description first';
    expect(values.buildLineCreatePayload(entry, lines, ['description'])).toMatchObject({
      documentType: 1,
      documentNumber: 'PO-001',
      type: 2,
      description: 'Description first',
    });
    expect(lines.dataSource.requiredCreateFields).not.toContain('number');
  });

  it('constrains dimension-value combinations by both dimension business codes', () => {
    const data = TestBed.inject(DataSourceService);
    const source = data.relation(dimensionValueCombinationsLineConfig.dataSource, {
      dimension1Code: 'DEPARTMENT',
      dimension2Code: 'PROJECT',
      systemId: 'unrelated-record-id',
    });
    expect(source.endpoint).toBe('/dimensionValueCombinations');
    expect(source.defaultFilter).toBe(
      "dimension1Code eq 'DEPARTMENT' and dimension2Code eq 'PROJECT'",
    );
    expect(() =>
      data.relation(dimensionValueCombinationsLineConfig.dataSource, {
        dimension1Code: 'DEPARTMENT',
      }),
    ).toThrow();
    const query = lookupQuery(
      dimensionValueCombinationsLineConfig.columns[0].lookup!,
      {},
      'SALES',
      { dimension1Code: 'DEPARTMENT' },
    );
    expect(query.endpoint).toBe('/dimensionValues');
    expect(query.filter).toContain("dimensionCode eq 'DEPARTMENT'");
  });

  it('isolates default dimensions with actual table identities and the parent business number', () => {
    const data = TestBed.inject(DataSourceService);
    for (const [config, id] of [
      [itemDefaultDimensionsLineConfig, 7000392],
      [vendorDefaultDimensionsLineConfig, 7000689],
      [glAccountDefaultDimensionsLineConfig, 7000270],
    ] as const) {
      const scoped = data.relation(config.dataSource, {
        number: 'SAME-NO',
        systemId: 'technical-id',
      });
      expect(scoped.endpoint).toBe('/defaultDimensions');
      expect(scoped.defaultFilter).toContain(`tableId eq ${id}`);
      expect(scoped.defaultFilter).toContain("number eq 'SAME-NO'");
      expect(scoped.defaultFilter).not.toContain('technical-id');
    }
  });

  it('maps the chosen line to a Dimension code, leaving CRUD identity to the resolved API record', () => {
    const router = TestBed.inject(DocumentPageCommandRoutingResolverService);
    const request = router.buildEntryRunModalRequest({
      pageId: 'dimensions',
      headerData: { number: 'ITEM001', systemId: 'item-id' },
      lineRows: [],
      payload: {},
      activeLine: { dimensionCode: 'PROJECT', systemId: 'assignment-id' },
      recordMapping: itemDefaultDimensionsHeaderConfig.toolbarButtons[0].runModalRecord,
    });
    expect(request.context?.['recordMappingComplete']).toBe(true);
    expect(request.context?.['headerData']).toEqual({ code: 'PROJECT' });
    expect(dimensionsListConfig.dataSource.headerPKProp).toBe('code');
  });

  it('searches zones in their selected Location and does not erase the saved code when merely opening choices', () => {
    const zone = warehouseBinsHeaderConfig.sections
      .flatMap((section) => section.fields)
      .find((field) => field.key === 'zoneCode')!;
    const record = { locationCode: 'MAIN', zoneCode: 'PICK' };
    const query = lookupQuery(zone.lookup!, record, 'PIC');
    expect(query.endpoint).toBe('/warehouseZones');
    expect(query.filter).toContain("locationCode eq 'MAIN'");
    expect(record.zoneCode).toBe('PICK');
    expect(lookupQuery(zone.lookup!, {}).ready).toBe(false);
  });
});
