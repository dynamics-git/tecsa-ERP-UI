import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it } from 'vitest';
import { SessionService } from '../../core/services/session.service';
import { DocumentSaveService } from '../../core/services/document-save.service';
import { DataSourceConfig } from '../models/data-source-config.model';
const fixtureSource: DataSourceConfig = { endpoint: '/fixtureHeaders', keyField: 'Id', supportsCreate: true, supportsUpdate: true, supportsDelete: true };
import { DATA_REST_SERVICE, DataRestService } from './data-source.service';
import { DraftCreateService } from './draft-create.service';
import { DataSourceService } from './data-source.service';

describe('Enterprise persistence integration', () => {
  let draftCreate: DraftCreateService;
  let entrySave: DocumentSaveService;
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
        DocumentSaveService,
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
    entrySave = TestBed.inject(DocumentSaveService);
    dataSource = TestBed.inject(DataSourceService);
  });

  it('rejects unknown properties without dropping values or retrying', async () => {
    const error = bcError("The property 'CurrencyCode' does not exist on type 'purchaseOrderHeader'.");
    postImpl = () => postCalls.length === 1 ? throwError(() => error) : of({ Id: 'PO-1' });
    const payload = { CreatedBy: 'tester', CurrencyCode: 'MYR' };
    await expect(firstValueFrom(draftCreate.createWithUnknownPropertyFallback(fixtureSource, payload))).rejects.toBe(error);
    expect(postCalls).toHaveLength(1);
    expect(postCalls[0][1]).toEqual(payload);
    expect(payload.CurrencyCode).toBe('MYR');
  });
  it('propagates the actual create validation error without retrying', async () => {
    const error = bcError('Values must be provided in the body.');
    postImpl = () => throwError(() => error);
    await expect(firstValueFrom(draftCreate.createWithUnknownPropertyFallback(fixtureSource, { UnknownField: 'value' }))).rejects.toBe(error);
    expect(postCalls).toHaveLength(1);
    expect(postCalls[0][1]).toEqual({ UnknownField: 'value' });
  });

  it('returns save error when BC rejects readonly field update shape', async () => {
    patchImpl = () => throwError(() => bcError("Control 'Status' is read-only and cannot be modified."));

    let actualSaved = true;
    let actualMessage = '';

    const result = await firstValueFrom(entrySave.save({
        scope: 'purchase-order-entry',
        dataSourceConfig: fixtureSource,
        headerSections: [{ id: 'header', fields: [{ key: 'VendorOrderNumber', label: 'Vendor Order Number', type: 'text' }] }],
        headerData: {
          Id: 'PO-ID-1', systemRowVersion: 1,
          Status: 'Released',
          VendorOrderNumber: 'V-123'
        }
      }));
    actualSaved = result.saved;
    actualMessage = result.errorMessage ?? '';

    expect(actualSaved).toBeFalsy();
    expect(actualMessage.toLowerCase()).toContain('read-only');
    expect(patchCalls.length).toBe(1);
    expect(patchCalls[0][1]).toEqual({ VendorOrderNumber: 'V-123' });
  });

  it('does not send an empty draft create request', () => {
    let actual: unknown;
    draftCreate.createWithUnknownPropertyFallback(fixtureSource, {})
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

  it('surfaces delete error from BC response shape', async () => {
    deleteImpl = () => throwError(() => bcError('The requested record was not found.'));

    let actualErrorMessage = '';

    await firstValueFrom(dataSource.delete(fixtureSource, 'PO-ID-404', 1)).catch(error => {
      actualErrorMessage = error?.error?.error?.message ?? error?.error?.message ?? '';
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
