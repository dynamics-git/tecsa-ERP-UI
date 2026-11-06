import { TestBed } from '@angular/core/testing';
import { HttpClient, HTTP_INTERCEPTORS, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from './auth.service';
import { SessionService } from './session.service';
import { PermissionService } from './permission.service';
import { HttpInterceptorService } from '../interceptors/http-interceptor';
import { environment } from '../../../environments/environment';

describe('Login-owned Company permissions', () => {
  let auth: AuthService;
  let session: SessionService;
  let permissions: PermissionService;
  let http: HttpTestingController;
  const a = {systemId:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',name:'Company A',code:'A',isActive:true};
  const b = {systemId:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',name:'Company B',code:'B',isActive:true};
  const user = {systemId:'11111111-1111-4111-8111-111111111111',userName:'ayan',name:'Ayan',email:'ayan@tecsa.com.my'};
  const base = environment.apiBaseUrl.replace(/\/$/,'');
  const loginUrl = base+'/auth/login';
  const selectionUrl = (id:string) => base+'/auth/companies?companyId='+id;
  const grants = (company=a,superAdmin=false,read=true) => ({company,isSuperAdmin:superAdmin,isCompanySuper:superAdmin,accessCenters:[],pagePermissions:[],
    pages:[{pageId:'purchase-order',pageCode:'purchase_headers',canRead:read,canCreate:false,canUpdate:false,canDelete:false,canExecute:false}]});
  const selection = (value: ReturnType<typeof grants>, companies=[a,b]) => ({data:companies,meta:{session:value}});
  const login = (companies=[a], preferred:typeof a|null=a, value:unknown=preferred?grants(preferred):null) =>
    ({data:{token:'sanctum-test-token',user,companies,defaultCompany:preferred,session:value}});
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({providers:[provideRouter([]),provideHttpClient(withInterceptorsFromDi()),provideHttpClientTesting(),
      {provide:HTTP_INTERCEPTORS,useClass:HttpInterceptorService,multi:true}]});
    auth=TestBed.inject(AuthService);session=TestBed.inject(SessionService);permissions=TestBed.inject(PermissionService);http=TestBed.inject(HttpTestingController);
  });
  afterEach(() => {http.verify();localStorage.clear();});

  it('enters ERP with permissions from the single login response and no follow-up discovery', async () => {
    const operation=firstValueFrom(auth.login({email:' ayan@tecsa.com.my ',password:'owner-password'}));
    const request=http.expectOne(loginUrl);
    expect(request.request.body).toEqual({login:user.email,password:'owner-password'});
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush(login());
    const result=await operation;
    expect(result.requiresCompanySelection).toBe(false);
    expect(session.isSessionValid()).toBe(true);
    expect(session.Company).toBe(a.systemId);
    expect(permissions.canView('purchase-order')).toBe(true);
    http.expectNone(request=>request.url.includes('/auth/context')||request.url.includes('/auth/companies'));
  });

  it('does not call any API on window focus', () => {
    session.applySessionContext({user,company:a.systemId,accessToken:'token'});
    vi.spyOn(session,'isSessionValid').mockReturnValue(true);
    window.dispatchEvent(new Event('focus'));window.dispatchEvent(new Event('focus'));
    http.expectNone(()=>true);
  });

  it('saves permission rows using only their ordinary CRUD request', () => {
    session.applySessionContext({user,company:a.systemId,accessToken:'token'});
    TestBed.inject(HttpClient).patch(base+'/companies/'+a.systemId+'/permissionSetPermissions/row',{canRead:true}).subscribe();
    http.expectOne(base+'/companies/'+a.systemId+'/permissionSetPermissions/row').flush({data:{canRead:true}});
    http.expectNone(()=>true);
  });
  it('switches Company with one existing company-selection request', async () => {
    session.applySessionContext({user,company:a.systemId,accessToken:'token'});
    const operation=firstValueFrom(auth.switchCompany(b.systemId));
    expect(session.Company).toBe(a.systemId);
    const value=grants(b,false,false);
    http.expectOne(selectionUrl(b.systemId)).flush(selection(value));
    await operation;
    expect(session.Company).toBe(b.systemId);
    expect(permissions.canView('purchase-order')).toBe(false);
    http.expectNone(()=>true);
  });

  it('rejects an unauthorized Company without replacing the current session', async () => {
    session.applySessionContext({user,company:a.systemId,accessToken:'token'});
    const operation=firstValueFrom(auth.switchCompany(b.systemId));
    http.expectOne(selectionUrl(b.systemId)).flush({data:[a]});
    await expect(operation).rejects.toThrow('Choose an authorized company.');
    expect(session.Company).toBe(a.systemId);
  });

  it('does not select an arbitrary Company when login offers multiple choices', async () => {
    const operation=firstValueFrom(auth.login({email:user.email,password:'pass'}));
    http.expectOne(loginUrl).flush(login([a,b],null));
    expect((await operation).requiresCompanySelection).toBe(true);
    expect(session.isSessionValid()).toBe(false);
    await expect(firstValueFrom(auth.selectCompany('invalid-id'))).rejects.toThrow('Choose an authorized company.');
    const chosen=firstValueFrom(auth.selectCompany(b.systemId));
    http.expectOne(selectionUrl(b.systemId)).flush(selection(grants(b)));
    await chosen;
    expect(session.Company).toBe(b.systemId);
  });

  it('rejects mismatched login permissions instead of silently making a second request', async () => {
    const operation=firstValueFrom(auth.login({email:user.email,password:'pass'}));
    http.expectOne(loginUrl).flush(login([a],a,grants(b)));
    await expect(operation).rejects.toThrow('Could not verify the selected company.');
    expect(session.isSessionValid()).toBe(false);
    expect(session.AccessToken).toBe('');
  });

  it('rejects missing permissions without a discovery fallback', async () => {
    const operation=firstValueFrom(auth.login({email:user.email,password:'pass'}));
    http.expectOne(loginUrl).flush(login([a],a,null));
    await expect(operation).rejects.toThrow('Login response is missing Company permissions.');
    http.expectNone(()=>true);
  });

  it('rejects accounts without Company membership', async () => {
    const operation=firstValueFrom(auth.login({email:user.email,password:'pass'}));
    http.expectOne(loginUrl).flush(login([],null));
    await expect(operation).rejects.toThrow('No active ERP company');
    expect(session.AccessToken).toBe('');
  });

  it('remains logged out if login rejects Company or subscription access', async () => {
    const operation=firstValueFrom(auth.login({email:user.email,password:'pass'}));
    http.expectOne(loginUrl).flush({message:'Company access denied'},{status:403,statusText:'Forbidden'});
    await expect(operation).rejects.toBeTruthy();
    expect(session.AccessToken).toBe('');
    expect(session.isSessionValid()).toBe(false);
  });

  it('does not infer SUPER from the account name', async () => {
    const operation=firstValueFrom(auth.login({email:'admin@tecsa.com.my',password:'pass'}));
    const value=login([a],a,grants(a,false,false));
    http.expectOne(loginUrl).flush({...value,data:{...value.data,user:{...user,userName:'admin',email:'admin@tecsa.com.my'}}});
    await operation;
    expect(permissions.isSuperAdmin()).toBe(false);
    expect(permissions.canView('purchase-order')).toBe(false);
  });

  it('loads page/control rules in the login response', async () => {
    const operation=firstValueFrom(auth.login({email:user.email,password:'pass'}));
    const rule={pageId:'users',targetType:'page',surface:'header',targetKey:'*',canRead:false,canCreate:false,canModify:false,canDelete:false,canExecute:false};
    const value={...grants(),pages:[{pageId:'users',apiPath:'/users',canRead:true}],pagePermissions:[rule]};
    http.expectOne(loginUrl).flush(login([a],a,value));
    await operation;
    expect(session.PagePermissions).toEqual([rule]);
    expect(permissions.canView('users')).toBe(false);
  });
  it('binds login source capabilities to existing pages and Header-Line configs', async () => {
    const operation=firstValueFrom(auth.login({email:user.email,password:'pass'}));
    const value={...grants(a,true),pages:[
      {pageId:'items',apiPath:'/items',pageCode:'items',canRead:true,canCreate:true,canUpdate:true,canDelete:true},
      {pageId:'itemUnitsOfMeasure',apiPath:'/items/{itemSystemId}/unitsOfMeasure',pageCode:'items',canRead:true,canCreate:false,canUpdate:false,canDelete:false},
      {pageId:'numberSeries',apiPath:'/numberSeries',pageCode:'number_series',canRead:true,canCreate:true,canUpdate:true,canDelete:true}]};
    http.expectOne(loginUrl).flush(login([a],a,value));
    await operation;
    const rows=session.Permissions as Record<string,unknown>[];
    expect(rows.find(row=>row['pageId']==='items')?.['canDelete']).toBe(true);
    expect(rows.find(row=>row['pageId']==='items-lines')?.['canDelete']).toBe(false);
    expect(rows.find(row=>row['pageId']==='no-series')?.['apiPath']).toBe('/numberSeries');
    expect(rows.find(row=>row['pageId']==='no-series')?.['apiSource']).toBe('numberSeries');
    expect(rows.find(row=>row['pageId']==='items-lines')?.['apiSource']).toBe('itemUnitsOfMeasure');
    expect(session.SuperAdmin).toBe(true);
  });

  it('binds source-less Page Object declarations from code-only login identities without another API call', async () => {
    const operation=firstValueFrom(auth.login({email:user.email,password:'pass'}));
    const value={...grants(),pages:[
      {pageId:'purchaseRequisitions',apiSource:'purchaseRequisitions',apiPath:'/purchaseRequisitions',pageCode:'purchase_requisitions',pageObjects:[{objectId:10000,surface:'header'}],canRead:true,canCreate:true},
      {pageId:'purchaseRequisitionLines',apiSource:'purchaseRequisitionLines',apiPath:'/purchaseRequisitionLines',pageCode:'purchase_requisitions',pageObjects:[],canRead:true,canCreate:false,canUpdate:true},
    ]};
    http.expectOne(loginUrl).flush(login([a],a,value));await operation;
    expect(permissions.canView('purchase-requisition')).toBe(true);
    const rows=session.Permissions as Record<string,unknown>[];
    expect(rows.find(row=>row['pageId']==='purchase-requisition-lines')).toMatchObject({canCreate:false,canUpdate:true,apiSource:'purchaseRequisitionLines'});
    http.expectNone(()=>true);
  });
});
