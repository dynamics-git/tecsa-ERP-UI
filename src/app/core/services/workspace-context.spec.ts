import { provideHttpClient,withInterceptorsFromDi,HTTP_INTERCEPTORS } from '@angular/common/http';
import { HttpTestingController,provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe,it,expect,beforeEach,afterEach } from 'vitest';
import { WorkspaceContext,workspaceSlug } from './workspace-context';
import { AuthService } from './auth.service';
import { SessionService } from './session.service';
import { HttpInterceptorService } from '../interceptors/http-interceptor';
import { environment } from '../../../environments/environment';
describe('Product workspace routing',()=>{
 beforeEach(()=>localStorage.clear());afterEach(()=>localStorage.clear());
 it('leaves the existing TECSA development route unchanged',()=>{expect(workspaceSlug('/auth/login')).toBe('');const context=new WorkspaceContext();expect(context.baseHref).toBe('/');expect(context.storageKey('access-token')).toBe('access-token');});
 it('recognizes only valid workspace path prefixes',()=>{expect(workspaceSlug('/w/atlas-123/auth/login')).toBe('atlas-123');expect(workspaceSlug('/w/../auth/login')).toBe('');expect(workspaceSlug('/w/ABC/auth/login')).toBe('');expect(workspaceSlug('/customers')).toBe('');});
 it('scopes API traffic and storage while leaving other destinations untouched',()=>{const context=Object.assign(new WorkspaceContext(),{slug:'atlas-123'});expect(context.apiUrl('http://localhost:8002/api/v1/auth/login','http://localhost:8002/api/v1')).toBe('http://localhost:8002/api/v1/workspaces/atlas-123/auth/login');expect(context.apiUrl('https://other.test/api','http://localhost:8002/api/v1')).toBe('https://other.test/api');expect(context.storageKey('access-token')).toBe('erp-workspace:atlas-123:access-token');});
 it('uses the workspace-specific API and cannot borrow the internal TECSA token',()=>{
  localStorage.setItem('access-token','internal-token');
  const context=Object.assign(new WorkspaceContext(),{slug:'atlas-123'});
  TestBed.configureTestingModule({providers:[provideRouter([]),provideHttpClient(withInterceptorsFromDi()),provideHttpClientTesting(),{provide:WorkspaceContext,useValue:context},{provide:HTTP_INTERCEPTORS,useClass:HttpInterceptorService,multi:true}]});
  const session=TestBed.inject(SessionService);expect(session.AccessToken).toBe('');
  const auth=TestBed.inject(AuthService);auth.login({email:'a@example.test',password:'test-password'}).subscribe({error:()=>{}});
  const http=TestBed.inject(HttpTestingController);const request=http.expectOne(environment.apiBaseUrl+'/workspaces/atlas-123/auth/login');
  expect(request.request.headers.has('Authorization')).toBe(false);request.flush({},{status:401,statusText:'Unauthorized'});http.verify();
  expect(localStorage.getItem('access-token')).toBe('internal-token');
 });
});
