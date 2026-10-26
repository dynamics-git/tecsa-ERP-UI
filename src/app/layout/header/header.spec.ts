import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { AuthService } from '../../core/services/auth.service';
import { ConfirmationService } from '../../shared/ui/confirmation.service';
import { providePlatformGovernance } from '../../core/providers/platform-governance.provider';
import { SessionService } from '../../core/services/session.service';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Header } from './header';

describe('Header', () => {
  let component: Header;
  let fixture: ComponentFixture<Header>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Header],
      providers: [provideRouter([]), ...providePlatformGovernance(), {
        provide: AuthService,
        useValue: { listAuthorizedCompanies: () => of([]) },
      }],
    }).compileComponents();

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

  it('shows a useful response when no alternative authorized company exists', async () => {
    const confirmation = TestBed.inject(ConfirmationService);
    const message = vi.spyOn(confirmation, 'message').mockResolvedValue(undefined);
    await component.changeCompany();
    expect(message).toHaveBeenCalledWith(
      'No other authorized company is available for your account.', 'Change company',
    );
    expect(component.isCompanyChanging).toBe(false);
  });

  it('offers verified company choices without changing session when cancelled', async () => {
    const companyA = { systemId: 'a', code: 'A', name: 'Company A' };
    const companyB = { systemId: 'b', code: 'B', name: 'Company B' };
    TestBed.inject(SessionService).Company = companyA.systemId;
    const authorized = TestBed.inject(AuthService);
    vi.spyOn(authorized, 'listAuthorizedCompanies').mockReturnValue(of([companyA, companyB]));
    const prompt = vi.spyOn(TestBed.inject(ConfirmationService), 'prompt').mockResolvedValue(null);
    await component.changeCompany();
    expect(prompt).toHaveBeenCalledOnce();
    expect(prompt.mock.calls[0]?.[1][0]?.options).toHaveLength(2);
    expect(TestBed.inject(SessionService).Company).toBe(companyA.systemId);
  });
});
