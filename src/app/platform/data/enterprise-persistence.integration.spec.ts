import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it } from 'vitest';
import { SessionService } from '../../core/services/session.service';
import { EntrySaveService } from '../../core/services/entry-save.service';
import { purchaseOrderListConfig } from '../../features/purchasing/purchase-order/purchase-order.config';
import { DATA_REST_SERVICE, DataRestService } from './data-source.service';
import { DraftCreateService } from './draft-create.service';
import { DataSourceService } from './data-source.service';

describe('Enterprise persistence integration', () => {
  let draftCreate: DraftCreateService;
  let entrySave: EntrySaveService;
  let dataSource: DataSourceService;
  let restMock: DataRestService;
  let postCalls: Array<[string, unknown]>;
  let patchCalls: Array<[string, unknown, string | undefined]>;
  let deleteCalls: Array<[string]>;

  let postImpl: (endpoint: string, payload: unknown) => ReturnType<DataRestService['post']>;
  let patchImpl: (endpoint: string, payload: unknown, ifMatch?: string) => ReturnType<DataRestService['patch']>;
  let deleteImpl: (endpoint: string) => ReturnType<DataRestService['delete']>;

  beforeEach(() => {
    postCalls = [];
    patchCalls = [];
    deleteCalls = [];

    postImpl = () => of({});
    patchImpl = () => of({});
    deleteImpl = () => of({});

    restMock = {
      get: () => of([]),
      post: (endpoint, payload) => {
        postCalls.push([endpoint, payload]);
        return postImpl(endpoint, payload);
      },
      patch: (endpoint, payload, ifMatch) => {
        patchCalls.push([endpoint, payload, ifMatch]);
        return patchImpl(endpoint, payload, ifMatch);
      },
      delete: (endpoint) => {
        deleteCalls.push([endpoint]);
        return deleteImpl(endpoint);
      }
    };

    TestBed.configureTestingModule({
      providers: [
        DraftCreateService,
        EntrySaveService,
        DataSourceService,
        {
          provide: DATA_REST_SERVICE,
          useValue: restMock
        },
        {
          provide: SessionService,
          useValue: {
            UserId: 'tester',
            CompanyName: 'Demo',
            Company: 'company-id',
            AccessCenter: { Code: 'AC-01' }
          }
        }
      ]
    });

    draftCreate = TestBed.inject(DraftCreateService);
    entrySave = TestBed.inject(EntrySaveService);
    dataSource = TestBed.inject(DataSourceService);
  });

  it('retries create when BC reports unknown property', () => {
    let attempt = 0;
    postImpl = () => {
      attempt += 1;
      if (attempt === 1) {
        return throwError(() => bcError("The property 'CurrencyCode' does not exist on type 'purchaseOrderHeader'."));
      }

      return of({ Id: 'PO-1' });
    };

    let actual: unknown;
    draftCreate
      .createWithUnknownPropertyFallback(purchaseOrderListConfig.dataSource, {
        CreatedBy: 'tester',
        CurrencyCode: 'MYR'
      })
      .subscribe((response) => {
        actual = response;
      });

    expect(actual).toEqual({ Id: 'PO-1' });
    expect(postCalls.length).toBe(2);

    const firstPayload = postCalls[0][1] as Record<string, unknown>;
    const secondPayload = postCalls[1][1] as Record<string, unknown>;

    expect(firstPayload['CurrencyCode']).toBe('MYR');
    expect('CurrencyCode' in secondPayload).toBeFalsy();
  });

  it('returns null without retrying when BC rejects a create body', () => {
    postImpl = () => throwError(() => bcError('Values must be provided in the body.'));

    let actual: unknown;
    draftCreate
      .createWithUnknownPropertyFallback(purchaseOrderListConfig.dataSource, {
        UnknownField: 'value'
      })
      .subscribe((response) => {
        actual = response;
      });

    expect(actual).toBeNull();
    expect(postCalls.length).toBe(1);

    const sentPayload = postCalls[0][1] as Record<string, unknown>;
    expect(sentPayload).toEqual({ UnknownField: 'value' });
  });

  it('returns save error when BC rejects readonly field update shape', () => {
    patchImpl = () => throwError(() => bcError("Control 'Status' is read-only and cannot be modified."));

    let actualSaved = true;
    let actualMessage = '';

    entrySave
      .save({
        scope: 'purchase-order-entry',
        dataSourceConfig: purchaseOrderListConfig.dataSource,
        headerSections: [{ id: 'header', fields: [{ key: 'VendorOrderNumber', label: 'Vendor Order Number', type: 'text' }] }],
        headerData: {
          Id: 'PO-ID-1',
          Status: 'Released',
          VendorOrderNumber: 'V-123'
        }
      })
      .subscribe((result) => {
        actualSaved = result.saved;
        actualMessage = result.errorMessage ?? '';
      });

    expect(actualSaved).toBeFalsy();
    expect(actualMessage.toLowerCase()).toContain('read-only');
    expect(patchCalls.length).toBe(1);
    expect(patchCalls[0][1]).toEqual({ VendorOrderNumber: 'V-123' });
  });

  it('does not send an empty draft create request', () => {
    let actual: unknown;
    draftCreate.createWithUnknownPropertyFallback(purchaseOrderListConfig.dataSource, {})
      .subscribe(response => actual = response);
    expect(actual).toBeNull();
    expect(postCalls).toEqual([]);
  });

  it('reports missing save configuration without sending a patch request', () => {
    let errorMessage = '';
    entrySave.save({ scope: 'purchase-order-entry', headerData: { Id: 'PO-1' } })
      .subscribe(result => { expect(result.saved).toBe(false); errorMessage = result.errorMessage ?? ''; });
    expect(errorMessage).toContain('configuration is missing');
    expect(patchCalls).toEqual([]);
  });

  it('surfaces delete error from BC response shape', () => {
    deleteImpl = () => throwError(() => bcError('The requested record was not found.'));

    let actualErrorMessage = '';

    dataSource.delete(purchaseOrderListConfig.dataSource, 'PO-ID-404').subscribe({
      next: () => {
        throw new Error('Expected delete to fail');
      },
      error: (error) => {
        actualErrorMessage =
          (error as any)?.error?.error?.message ??
          (error as any)?.error?.message ??
          '';
      }
    });

    expect(actualErrorMessage).toContain('not found');
    expect(deleteCalls.length).toBe(1);
  });
});

function bcError(message: string): unknown {
  return {
    error: {
      error: {
        message
      }
    }
  };
}
