import {Component, ElementRef, ViewEncapsulation, computed, inject, signal} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {ActivatedRoute, Router, RouterLink} from '@angular/router';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';

export interface LearnArticle {
  id: string;
  section: string;
  sectionTitle: string;
  source: string;
  title: string;
  summary: string;
  searchText: string;
  readingMinutes: number;
  outline: {id: string; title: string; level: number}[];
  blocks: ({kind: 'html'; html: string} | {kind: 'code'; language: string; code: string})[];
}

@Component({
  selector: 'app-documentation',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './documentation.html',
  styleUrl: './documentation.scss',
  encapsulation: ViewEncapsulation.None,
})
export class Documentation {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef);
  readonly articles = signal<LearnArticle[]>([]);
  readonly articleId = signal('get-started/overview');
  readonly query = signal('');
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly navigationOpen = signal(false);
  readonly message = signal('');
  readonly current = computed(() => this.articles().find(article => article.id === this.articleId()));
  readonly results = computed(() => {
    const terms = this.query().trim().toLowerCase().split(/\s+/).filter(Boolean);
    return this.articles().filter(article => terms.every(term => `${article.title} ${article.searchText}`.toLowerCase().includes(term)));
  });
  readonly sections = computed(() => [...new Set(this.results().map(article => article.section))].map(section => ({
    id: section,
    title: this.results().find(article => article.section === section)!.sectionTitle,
    articles: this.results().filter(article => article.section === section),
  })));
  readonly previous = computed(() => this.articles()[this.articles().findIndex(article => article.id === this.articleId()) - 1]);
  readonly next = computed(() => this.articles()[this.articles().findIndex(article => article.id === this.articleId()) + 1]);

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe(params => {
      this.articleId.set(params.get('section') && params.get('article') ? `${params.get('section')}/${params.get('article')}` : 'get-started/overview');
      this.navigationOpen.set(false);
      const scroll = this.host.nativeElement.querySelector('.learn-scroll');
      if (scroll) scroll.scrollTop = 0;
    });
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    this.http.get<{articles: LearnArticle[]}>('documentation/content.json').subscribe({
      next: content => {this.articles.set(content.articles); this.loading.set(false);},
      error: () => {this.error.set(true); this.loading.set(false);},
    });
  }

  openHeading(id: string): void {
    const heading = [...this.host.nativeElement.querySelectorAll<HTMLElement>('[id]')].find(element => element.id === id);
    heading?.scrollIntoView({behavior: 'smooth', block: 'start'});
    if (heading) {heading.tabIndex = -1; heading.focus({preventScroll: true});}
  }

  followArticleLink(event: MouseEvent): void {
    const anchor = (event.target as HTMLElement).closest('a');
    if (!anchor || event.ctrlKey || event.metaKey || event.shiftKey || event.button !== 0) return;
    const href = anchor.getAttribute('href') ?? '';
    if (href.startsWith('/documentation/')) {
      event.preventDefault();
      const [path, fragment] = href.split('#');
      void this.router.navigateByUrl(path).then(() => {if (fragment) setTimeout(() => this.openHeading(fragment));});
    } else if (href.startsWith('#')) {event.preventDefault(); this.openHeading(href.slice(1));}
  }

  async copy(text: string): Promise<void> {
    try {await navigator.clipboard.writeText(text); this.message.set('Copied to clipboard.');}
    catch {this.message.set('Copy is unavailable. Select and copy the text instead.');}
  }

  copyLink(): void {void this.copy(window.location.href);}
  print(): void {window.print();}
}
