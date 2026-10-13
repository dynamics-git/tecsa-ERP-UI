import { provideRouter } from '@angular/router';
import { providePlatformGovernance } from '../../core/providers/platform-governance.provider';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MainLayout } from './main-layout';

describe('MainLayout', () => {
  let component: MainLayout;
  let fixture: ComponentFixture<MainLayout>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MainLayout],
      providers: [provideRouter([]), ...providePlatformGovernance()],
    }).compileComponents();

    fixture = TestBed.createComponent(MainLayout);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders a RunModal host on the dashboard for global search', () => {
    expect(fixture.nativeElement.querySelectorAll('app-run-modal-host')).toHaveLength(1);
  });
});
