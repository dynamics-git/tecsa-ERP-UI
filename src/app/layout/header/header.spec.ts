import { provideRouter } from '@angular/router';
import { providePlatformGovernance } from '../../core/providers/platform-governance.provider';
import { SessionService } from '../../core/services/session.service';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Header } from './header';
import { vi } from 'vitest';
import { DrawerService, RunModalStackService, UnsavedChangesService } from '../../platform/public-api';

describe('Header', () => {
  let component: Header;
  let fixture: ComponentFixture<Header>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Header],
      providers: [provideRouter([]), ...providePlatformGovernance()],
    }).compileComponents();

    TestBed.inject(SessionService).SuperAdmin = false;
    // Global search now reads explicit backend-derived page permissions.
    TestBed.inject(SessionService).Permissions = [{
      PageId: 'purchase-requisition', PageName: 'Purchase Order', ObjectName: 'purchase_orders', ReadPermission: 'Yes',
    }];
    fixture = TestBed.createComponent(Header);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('opens the company drawer above the document using the existing stack',async()=>{
    const stack=TestBed.inject(RunModalStackService);
    stack.open({id:'document',mode:'page'});
    const guard=vi.spyOn(TestBed.inject(UnsavedChangesService),'canLeave').mockResolvedValue(true);
    const open=vi.spyOn(TestBed.inject(DrawerService),'open');
    await component.changeCompany();
    expect(guard).toHaveBeenCalled();
    expect(open).toHaveBeenCalledWith(expect.objectContaining({id:'company-switcher',viewId:'company-switcher',allowNested:true}));
    let ids:string[]=[];const subscription=stack.stack$.subscribe(popups=>ids=popups.map(popup=>popup.id));
    expect(ids).toEqual(['document','company-switcher']);subscription.unsubscribe();guard.mockRestore();open.mockRestore();
  });

  it('does not open company selection when pending edits prevent leaving',async()=>{
    const guard=vi.spyOn(TestBed.inject(UnsavedChangesService),'canLeave').mockResolvedValue(false);
    const open=vi.spyOn(TestBed.inject(DrawerService),'open');
    await component.changeCompany();expect(open).not.toHaveBeenCalled();guard.mockRestore();open.mockRestore();
  });

  it('dismisses the profile menu on pointerdown inside a document without cancelling its action', () => {
    fixture.nativeElement.querySelector('.app-user').click();fixture.detectChanges();
    const documentSurface=document.createElement('section');document.body.append(documentSurface);
    try {
      documentSurface.addEventListener('click',event=>event.stopPropagation());
      const event=new Event('pointerdown',{bubbles:true,cancelable:true});
      documentSurface.dispatchEvent(event);
      expect(component.isUserMenuOpen).toBe(false);
      expect(event.defaultPrevented).toBe(false);
    } finally { documentSurface.remove(); }
  });

  it('preserves profile-menu interactions including icon clicks and closes with Escape', () => {
    fixture.nativeElement.querySelector('.app-user').click();fixture.detectChanges();
    const menu:HTMLElement=fixture.nativeElement.querySelector('.app-user-menu');
    const icon=document.createElementNS('http://www.w3.org/2000/svg','svg');menu.append(icon);
    icon.dispatchEvent(new Event('pointerdown',{bubbles:true}));
    expect(component.isUserMenuOpen).toBe(true);
    document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
    expect(component.isUserMenuOpen).toBe(false);
  });

  it('opens documentation beside company in a separate tab', () => {
    const link: HTMLAnchorElement = fixture.nativeElement.querySelector('.app-documentation');
    expect(link.getAttribute('href')).toBe('/documentation');
    expect(link.target).toBe('_blank');
    expect(link.rel).toContain('noopener');
    expect(link.previousElementSibling?.classList.contains('app-company')).toBe(true);
  });

  it('opens global search with Ctrl K while a document is active', () => {
    const event = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, cancelable: true });
    document.dispatchEvent(event);
    fixture.detectChanges();
    expect(event.defaultPrevented).toBe(true);
    expect(fixture.nativeElement.querySelector('input[type="search"]')).not.toBeNull();
    component.onGlobalSearchInput('purchase');
    expect(component.searchResults.map(item => item.pageId)).toEqual(['purchase-requisition']);
  });
  it('hides unpermitted pages from global search', () => {
    TestBed.inject(SessionService).Permissions = [];
    component.onGlobalSearchInput('purchase');
    expect(component.searchResults).toEqual([]);
  });

});
