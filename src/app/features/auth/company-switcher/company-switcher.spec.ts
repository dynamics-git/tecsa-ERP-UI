import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { of, Subject, throwError } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { SessionService } from '../../../core/services/session.service';
import { WorkspaceContext } from '../../../core/services/workspace-context';
import { UnsavedChangesService } from '../../../platform/public-api';
import { CompanySwitcher } from './company-switcher';

const companies = [{systemId:'current',name:'Tecsa',code:'TEC'}, {systemId:'other',name:'North Operations',code:'NOR'}];
describe('Company switcher drawer',()=>{
  const auth={authorizedCompanies:vi.fn(),switchCompany:vi.fn()};
  const unsaved={canLeave:vi.fn()};
  beforeEach(()=>{
    auth.authorizedCompanies.mockReturnValue(of(companies));auth.switchCompany.mockReturnValue(of({}));unsaved.canLeave.mockResolvedValue(true);
    TestBed.configureTestingModule({imports:[CompanySwitcher],providers:[
      {provide:AuthService,useValue:auth}, {provide:SessionService,useValue:{Company:'current',CompanyName:'Tecsa'}},
      {provide:UnsavedChangesService,useValue:unsaved},{provide:WorkspaceContext,useValue:{baseHref:'/w/tecsa/'}}
    ]});
  });
  afterEach(()=>{TestBed.resetTestingModule();vi.restoreAllMocks();vi.clearAllMocks();});
  async function create(){const f=TestBed.createComponent(CompanySwitcher);f.detectChanges();await Promise.resolve();await f.whenStable();f.detectChanges();return f;}

  it('loads authorized companies, identifies the current company and searches name or code',async()=>{
    const f=await create(),c=f.componentInstance;
    expect(auth.authorizedCompanies).toHaveBeenCalledOnce();expect(c.selectedId()).toBe('current');expect(c.canSwitch()).toBe(false);
    expect(f.nativeElement.textContent).toContain('Current');c.query.set('nor');f.detectChanges();
    expect(c.filteredCompanies()).toEqual([companies[1]]);c.query.set('no match');f.detectChanges();
    expect(f.nativeElement.textContent).toContain('No companies match');
  });
  it('selects without switching and confirms through the existing guard and auth service',async()=>{
    const f=await create(),c=f.componentInstance,refresh=vi.spyOn(c,'refreshWorkspace').mockImplementation(()=>{});
    c.selectCompany('other');expect(auth.switchCompany).not.toHaveBeenCalled();expect(c.canSwitch()).toBe(true);
    await c.switchCompany();expect(unsaved.canLeave).toHaveBeenCalledOnce();expect(auth.switchCompany).toHaveBeenCalledExactlyOnceWith('other');expect(refresh).toHaveBeenCalledOnce();
  });
  it('does not switch the current company or an unavailable company',async()=>{
    const c=(await create()).componentInstance;c.selectCompany('unavailable');await c.switchCompany();expect(auth.switchCompany).not.toHaveBeenCalled();
  });
  it('keeps the selection and context when pending edits block switching',async()=>{
    unsaved.canLeave.mockResolvedValue(false);const c=(await create()).componentInstance;c.selectCompany('other');await c.switchCompany();
    expect(c.selectedId()).toBe('other');expect(c.currentCompanyId).toBe('current');expect(auth.switchCompany).not.toHaveBeenCalled();expect(c.switching()).toBe(false);
  });
  it('prevents duplicate requests and selection changes during switching',async()=>{
    const response=new Subject<unknown>();auth.switchCompany.mockReturnValue(response);
    const c=(await create()).componentInstance,refresh=vi.spyOn(c,'refreshWorkspace').mockImplementation(()=>{}),busy=vi.fn();c.busyChange.subscribe(busy);
    c.selectCompany('other');const pending=c.switchCompany();await Promise.resolve();
    c.selectCompany('current');await c.switchCompany();expect(c.selectedId()).toBe('other');expect(auth.switchCompany).toHaveBeenCalledOnce();
    response.next({});response.complete();await pending;expect(busy.mock.calls).toEqual([[true],[false]]);expect(refresh).toHaveBeenCalledOnce();
  });
  it('retains a failed selection and permits retry without refreshing the workspace',async()=>{
    auth.switchCompany.mockReturnValue(throwError(()=>new Error('Company access changed.')));
    const f=await create(),c=f.componentInstance,refresh=vi.spyOn(c,'refreshWorkspace').mockImplementation(()=>{});c.selectCompany('other');await c.switchCompany();f.detectChanges();
    expect(f.nativeElement.querySelector('[role="alert"]').textContent).toContain('Company access changed.');expect(c.selectedId()).toBe('other');expect(c.canSwitch()).toBe(true);expect(refresh).not.toHaveBeenCalled();
    auth.switchCompany.mockReturnValue(of({}));await c.switchCompany();expect(refresh).toHaveBeenCalledOnce();
  });
  it('shows load errors and retries, and renders an authorized empty list',async()=>{
    auth.authorizedCompanies.mockReturnValue(throwError(()=>new Error('Connection failed.')));const f=await create(),c=f.componentInstance;
    expect(f.nativeElement.textContent).toContain('Connection failed.');auth.authorizedCompanies.mockReturnValue(of([]));await c.loadCompanies();f.detectChanges();
    expect(f.nativeElement.textContent).toContain('No companies are available');expect(c.canSwitch()).toBe(false);
  });
  it('cancels without calling the switch API',async()=>{
    const f=await create(),cancelled=vi.fn();f.componentInstance.cancelled.subscribe(cancelled);
    f.nativeElement.querySelector('.company-actions button').click();expect(cancelled).toHaveBeenCalledOnce();expect(auth.switchCompany).not.toHaveBeenCalled();
  });
  it('focuses search and handles Escape locally, without dismissing during switching',async()=>{
    const f=await create(),c=f.componentInstance,cancelled=vi.fn();c.cancelled.subscribe(cancelled);
    expect(document.activeElement).toBe(f.nativeElement.querySelector('input[type="search"]'));
    c.switching.set(true);const blocked=new KeyboardEvent('keydown',{key:'Escape',bubbles:true});f.nativeElement.dispatchEvent(blocked);expect(cancelled).not.toHaveBeenCalled();
    c.switching.set(false);f.nativeElement.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));expect(cancelled).toHaveBeenCalledOnce();
  });
});
