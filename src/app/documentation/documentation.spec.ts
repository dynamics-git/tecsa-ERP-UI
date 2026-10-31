import {TestBed} from '@angular/core/testing';
import {provideHttpClient} from '@angular/common/http';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {ActivatedRoute, convertToParamMap, provideRouter} from '@angular/router';
import {BehaviorSubject} from 'rxjs';
import {Documentation, LearnArticle} from './documentation';

describe('Documentation reading surface', () => {
  const params = new BehaviorSubject(convertToParamMap({}));
  const articles: LearnArticle[] = [
    {id: 'get-started/overview', section: 'get-started', sectionTitle: 'Get Started', title: 'Overview', summary: 'Start here', source: 'docs/learn/overview.md', readingMinutes: 1, searchText: 'Migration Model Controller', outline: [{id: 'example', title: 'Example', level: 2}], blocks: [{kind: 'html', html: '<h2 id="example">Example</h2><p>Readable guidance</p>'}, {kind: 'code', language: 'typescript', code: 'const x = "<button>";'}]},
    {id: 'backend/table', section: 'backend', sectionTitle: 'Backend', title: 'Table', summary: 'Build table', source: 'docs/learn/table.md', readingMinutes: 2, searchText: 'business key foreign key', outline: [], blocks: []},
  ];
  beforeEach(() => {
    params.next(convertToParamMap({}));
    TestBed.configureTestingModule({imports: [Documentation], providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), {provide: ActivatedRoute, useValue: {paramMap: params}}]});
  });
  afterEach(() => {TestBed.inject(HttpTestingController).verify(); TestBed.resetTestingModule();});

  it('reads static content without a business API and renders code as text', async () => {
    const fixture = TestBed.createComponent(Documentation);
    TestBed.inject(HttpTestingController).expectOne('documentation/content.json').flush({articles});
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('h1').textContent).toBe('Overview');
    expect(fixture.nativeElement.querySelector('pre').textContent).toContain('<button>');
    expect(fixture.nativeElement.querySelector('pre button')).toBeNull();
    expect(fixture.componentInstance.next()?.id).toBe('backend/table');
  });

  it('searches content across terms and follows route changes', () => {
    const fixture = TestBed.createComponent(Documentation);
    TestBed.inject(HttpTestingController).expectOne('documentation/content.json').flush({articles});
    fixture.componentInstance.query.set('foreign business');
    expect(fixture.componentInstance.results().map(item => item.id)).toEqual(['backend/table']);
    params.next(convertToParamMap({section: 'backend', article: 'table'}));
    expect(fixture.componentInstance.current()?.title).toBe('Table');
    params.next(convertToParamMap({section: 'unknown', article: 'missing'}));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('h1').textContent).toBe('Article not found');
  });

  it('shows a recoverable asset failure', () => {
    const fixture = TestBed.createComponent(Documentation);
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('documentation/content.json').flush('missing', {status: 404, statusText: 'Not Found'});
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Documentation could not load');
    fixture.componentInstance.load();
    http.expectOne('documentation/content.json').flush({articles});
    expect(fixture.componentInstance.current()?.title).toBe('Overview');
  });

  it('copies exact code and reports clipboard failures', async () => {
    const fixture = TestBed.createComponent(Documentation);
    TestBed.inject(HttpTestingController).expectOne('documentation/content.json').flush({articles});
    const clipboard = navigator.clipboard;
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {configurable: true, value: {writeText}});
    try {
      await fixture.componentInstance.copy('const amount = 12;');
      expect(writeText).toHaveBeenCalledWith('const amount = 12;');
      expect(fixture.componentInstance.message()).toBe('Copied to clipboard.');
      writeText.mockRejectedValue(new Error('Unavailable'));
      await fixture.componentInstance.copy('text');
      expect(fixture.componentInstance.message()).toContain('Select and copy');
    } finally {Object.defineProperty(navigator, 'clipboard', {configurable: true, value: clipboard});}
  });
});
