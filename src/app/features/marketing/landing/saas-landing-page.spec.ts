import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it } from 'vitest';
import { SaasLandingPage } from './saas-landing-page';

describe('SaaS landing page', () => {
  it('shows the agreed public proposition and links to the signup preview and real login route', () => {
    TestBed.configureTestingModule({ imports: [SaasLandingPage], providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(SaasLandingPage);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).toContain('Business,');
    expect(root.textContent).toContain('in sync.');
    const allLinks = Array.from(root.querySelectorAll('a'));
    expect(allLinks.some(link => link.getAttribute('href') === '/start')).toBe(true);
    expect(allLinks.some(link => link.getAttribute('href') === '/auth/login')).toBe(true);
    expect(root.querySelector('img')?.getAttribute('src')).toBe('/illustrations/connected-business.svg');
    expect(root.textContent).toContain('registration and trial service is under development');
  });
});
