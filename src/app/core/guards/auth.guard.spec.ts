import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot, provideRouter } from '@angular/router';
import { afterEach, describe, expect, it } from 'vitest';
import { authGuard } from './auth.guard';
import { SessionService } from '../services/session.service';
import { DataSourceService } from '../../platform/public-api';

afterEach(() => { TestBed.resetTestingModule(); localStorage.clear(); });

describe('Restored login permissions', () => {
  it.each([true, false])('reuses stored rights without any extra API calls (SUPER=%s)', async superAdmin => {
    localStorage.clear();
    TestBed.configureTestingModule({providers:[provideRouter([]),provideHttpClient(),provideHttpClientTesting()]});
    const session=TestBed.inject(SessionService);
    const company='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    session.applySessionContext({user:{systemId:'user'},accessToken:'fixture-token',company,superAdmin,
      permissions:[{pageId:'items',apiPath:'/items',canRead:true,canDelete:superAdmin}]});
    const http=TestBed.inject(HttpTestingController);
    const route={data:{}} as ActivatedRouteSnapshot;
    const state={} as RouterStateSnapshot;
    expect(TestBed.runInInjectionContext(()=>authGuard(route,state))).toBe(true);
    await Promise.resolve();
    http.expectNone(()=>true);
    expect(TestBed.inject(DataSourceService).operationAllowed({endpoint:'/items'},'delete')).toBe(superAdmin);
    expect(TestBed.runInInjectionContext(()=>authGuard(route,state))).toBe(true);
    await Promise.resolve();
    http.expectNone(()=>true);
    http.verify();
  });
});
