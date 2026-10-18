import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiErrorService } from '../../platform/public-api';
import { RestService } from '../../core/services/rest.service';
import { SessionService } from '../../core/services/session.service';
import { PermissionService } from '../../core/services/permission.service';
import { numberSeriesListConfig, numberSeriesHeaderConfig, numberSeriesLineConfig } from './number-series/number-series.config';
import { CompanySetupCard } from './company-setup/company-setup-card';
import { salesReceivablesSetup, purchasesPayablesSetup } from './company-setup/company-setup.config';

describe('Business Central-style numbering setup prerequisites', () => {
  it('uses the real Laravel Number Series header and dated line contracts', () => {
    expect(numberSeriesListConfig.dataSource?.endpoint).toBe('/numberSeries');
    expect(numberSeriesListConfig.dataSource?.supportsDelete).toBe(false);
    expect(numberSeriesHeaderConfig.sections[0].fields.filter(field => field.required).map(field => field.key))
      .toEqual(['code', 'description']);
    expect(numberSeriesLineConfig.dataSource.navigation).toMatchObject({
      style: 'rest', parentEndpoint: '/numberSeries', childCollection: 'lines',
    });
    expect(numberSeriesLineConfig.dataSource.supportsDelete).toBe(false);
    expect(numberSeriesLineConfig.dataSource.createDefaults).toEqual({ incrementBy: 1 });
    expect(numberSeriesLineConfig.dataSource.requiredCreateFields).toEqual(['startingDate', 'startingNo']);
  });

  it('maps Customer Nos. and PR Nos. to separate backend singleton setups', () => {
    expect(salesReceivablesSetup).toMatchObject({
      endpoint: '/salesReceivablesSetup',
      resource: 'sales_receivables_setup',
    });
    expect(purchasesPayablesSetup).toMatchObject({
      endpoint: '/purchasesPayablesSetup',
      resource: 'purchases_payables_setup',
    });
    expect(salesReceivablesSetup.editableFields).toContain('customerNoSeriesId');
    expect(purchasesPayablesSetup.editableFields).toContain('requisitionNoSeriesId');
  });
});

describe('Generic company setup GET/PUT persistence', () => {
  const customerSeries = {
    systemId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    code: 'CUST', description: 'Customer Nos.',
  };
  const purchaseSeries = {
    systemId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    code: 'PR', description: 'Requisition Nos.',
  };
  const get = vi.fn();
  const put = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      imports: [CompanySetupCard],
      providers: [
        { provide: RestService, useValue: { get, put } },
        { provide: SessionService, useValue: {
          Company: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
          CompanyName: 'TecSA',
          hasPermission: () => true,
        } },
        { provide: PermissionService, useValue: { isSuperAdmin: () => true } },
        ApiErrorService,
      ],
    });
  });

  it('handles missing setup as a new singleton; saves automatically, then uses ETag', async () => {
    get.mockImplementation((url: string) => url === '/salesReceivablesSetup'
      ? throwError(() => ({ status: 404, error: { error: { message: 'Record not found.' } } }))
      : of({ data: [customerSeries, purchaseSeries], meta: { lastPage: 1 } }));
    put.mockImplementation((_url: string, body: Record<string, unknown>) => of({
      data: { ...body, systemRowVersion: put.mock.calls.length },
    }));
    const fixture = TestBed.createComponent(CompanySetupCard);
    fixture.componentRef.setInput('definition', salesReceivablesSetup);
    fixture.detectChanges();
    await vi.waitFor(() => expect(fixture.componentInstance.loading).toBe(false));
    const page = fixture.componentInstance;
    expect(page.failedLoad).toBe(false);
    expect(page.status.message).toContain('Not configured');
    expect(page.record['__options_customerNoSeriesId']).toHaveLength(2);
    page.handleAction({ actionKey: 'header:changed', payload: {
      fieldKey: 'customerNoSeriesId', value: customerSeries.systemId,
    } });
    await vi.waitFor(() => expect(put).toHaveBeenCalledTimes(1));
    await vi.waitFor(() => expect(page.saving).toBe(false));
    expect(put).toHaveBeenNthCalledWith(1, '/salesReceivablesSetup',
      { customerNoSeriesId: customerSeries.systemId }, undefined);

    page.handleAction({ actionKey: 'header:changed', payload: {
      fieldKey: 'quoteNoSeriesId', value: purchaseSeries.systemId,
    } });
    await vi.waitFor(() => expect(put).toHaveBeenCalledTimes(2));
    expect(put).toHaveBeenNthCalledWith(2, '/salesReceivablesSetup',
      { quoteNoSeriesId: purchaseSeries.systemId }, { ifMatch: '"1"' });
  });

  it('does not treat permission errors as an unconfigured setup', async () => {
    get.mockImplementation((url: string) => url === '/salesReceivablesSetup'
      ? throwError(() => ({ status: 403, error: { error: { message: 'Permission denied.' } } }))
      : of({ data: [], meta: { lastPage: 1 } }));
    const fixture = TestBed.createComponent(CompanySetupCard);
    fixture.componentRef.setInput('definition', salesReceivablesSetup);
    fixture.detectChanges();
    await vi.waitFor(() => expect(fixture.componentInstance.loading).toBe(false));
    expect(fixture.componentInstance.failedLoad).toBe(true);
    expect(put).not.toHaveBeenCalled();
  });
});
