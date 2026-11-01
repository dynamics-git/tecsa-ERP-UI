import { AfterViewInit, Component, DestroyRef, ElementRef, EventEmitter, HostListener, OnInit, Output, ViewChild, computed, forwardRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { AuthService, AuthorizedCompany } from '../../../core/services/auth.service';
import { SessionService } from '../../../core/services/session.service';
import { WorkspaceContext } from '../../../core/services/workspace-context';
import { LoadingIndicator, UnsavedChangesService } from '../../../platform/public-api';

@Component({
  selector: 'app-company-switcher',
  standalone: true,
  imports: [forwardRef(() => LoadingIndicator)],
  templateUrl: './company-switcher.html',
  styleUrl: './company-switcher.scss',
})
export class CompanySwitcher implements OnInit, AfterViewInit {
  private readonly auth = inject(AuthService);
  private readonly session = inject(SessionService);
  private readonly unsaved = inject(UnsavedChangesService);
  private readonly workspace = inject(WorkspaceContext);
  private readonly destroyRef = inject(DestroyRef);
  @Output() cancelled = new EventEmitter<void>();
  @Output() busyChange = new EventEmitter<boolean>();
  @ViewChild('companySearch') private searchInput?: ElementRef<HTMLInputElement>;

  readonly currentCompanyId = this.session.Company;
  readonly currentCompanyName = this.session.CompanyName;
  readonly companies = signal<AuthorizedCompany[]>([]);
  readonly query = signal('');
  readonly selectedId = signal(this.currentCompanyId);
  readonly loading = signal(true);
  readonly switching = signal(false);
  readonly error = signal('');
  readonly filteredCompanies = computed(() => {
    const query = this.query().trim().toLocaleLowerCase();
    return this.companies().filter(company =>
      !query || `${company.name} ${company.code}`.toLocaleLowerCase().includes(query));
  });
  readonly canSwitch = computed(() => !this.loading() && !this.switching() &&
    this.selectedId() !== this.currentCompanyId && this.companies().some(company => company.systemId === this.selectedId()));

  ngOnInit(): void { void this.loadCompanies(); }
  ngAfterViewInit(): void { this.searchInput?.nativeElement.focus(); }

  @HostListener('keydown.escape', ['$event'])
  cancelOnEscape(event: Event): void {
    event.stopPropagation();
    if (!this.switching()) this.cancelled.emit();
  }

  async loadCompanies(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const companies = await firstValueFrom(this.auth.authorizedCompanies().pipe(takeUntilDestroyed(this.destroyRef)));
      this.companies.set(companies);
    } catch (error) {
      if (!this.destroyRef.destroyed) this.error.set(error instanceof Error ? error.message : 'Could not load companies. Please try again.');
    } finally { this.loading.set(false); }
  }

  selectCompany(companyId: string): void {
    if (!this.switching() && this.companies().some(company => company.systemId === companyId)) this.selectedId.set(companyId);
  }

  async switchCompany(): Promise<void> {
    if (!this.canSwitch()) return;
    const companyId = this.selectedId();
    this.switching.set(true);
    this.busyChange.emit(true);
    this.error.set('');
    try {
      // Recheck at confirmation: edits may have changed since the drawer opened.
      if (!await this.unsaved.canLeave() || this.destroyRef.destroyed) return;
      await firstValueFrom(this.auth.switchCompany(companyId).pipe(takeUntilDestroyed(this.destroyRef)));
      // Preserve the existing fresh-view boundary between company contexts.
      this.refreshWorkspace();
    } catch (error) {
      if (!this.destroyRef.destroyed) this.error.set(error instanceof Error ? error.message : 'Could not change company. Please try again.');
    } finally {
      this.switching.set(false);
      this.busyChange.emit(false);
    }
  }

  refreshWorkspace(): void { window.location.assign(this.workspace.baseHref); }
}
