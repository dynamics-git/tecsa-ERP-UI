import { provideRouter } from '@angular/router';
import { providePlatformGovernance } from '../../core/providers/platform-governance.provider';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Header } from './header';

describe('Header', () => {
  let component: Header;
  let fixture: ComponentFixture<Header>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Header],
      providers: [provideRouter([]), ...providePlatformGovernance()],
    }).compileComponents();

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
    expect(component.searchResults.map(item => item.pageId)).toEqual(['purchase-order']);
  });
});
