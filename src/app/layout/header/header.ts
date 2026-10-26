import { Component, ElementRef, HostListener, ViewChild } from '@angular/core';
import { NavigationStart, Router } from '@angular/router';
import { filter, firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { MenuItem } from '../../core/models/menu-item.model';
import { MenuSearchItem } from '../../core/models/menu-item.model';
import { GlobalSearchPopupService } from '../../core/services/global-search-popup.service';
import { AuthService } from '../../core/services/auth.service';
import { WorkspaceContext } from '../../core/services/workspace-context';
import { ConfirmationService } from '../../shared/ui/confirmation.service';
import { UnsavedChangesService } from '../../platform/pages/unsaved-changes.service';
import { MenuService } from '../../core/services/menu.service';
import { shouldOpenFromMenuAsRunModal } from '../../core/services/run-modal-config-registry';
import { SessionService } from '../../core/services/session.service';
import { DrawerService } from '../../platform/public-api';
import { ModuleMenuPanel } from '../module-menu-panel/module-menu-panel';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [ModuleMenuPanel],
  templateUrl: './header.html',
  styleUrl: './header.scss'
})
export class Header {
  @ViewChild('globalSearchInput') globalSearchInput?: ElementRef<HTMLInputElement>;

  readonly isLive = Boolean(environment.isLive || environment.production);
  activeModule = '';
  isGlobalSearchOpen = false;
  isUserMenuOpen = false;
  isCompanyChanging = false;
  searchQuery = '';
  searchResults: MenuSearchItem[] = [];
  readonly userMenuItems: Array<{ id: string; label: string; icon: string; route?: string; disabled?: boolean }> = [
    { id: 'profile', label: 'Profile', icon: 'ts-icon ts-icon-profile' },
    { id: 'settings', label: 'Settings', icon: 'ts-icon ts-icon-sliders', disabled: true },
    { id: 'dashboard', label: 'Dashboard', icon: 'ts-icon ts-icon-grid', disabled: true }
  ];

  constructor(
    private readonly router: Router,
    private readonly menuService: MenuService,
    private readonly globalSearchPopup: GlobalSearchPopupService,
    private readonly sessionService: SessionService,
    private readonly drawerService: DrawerService,
    private readonly authService: AuthService,
    private readonly confirmation: ConfirmationService,
    private readonly unsaved: UnsavedChangesService,
    private readonly workspace: WorkspaceContext
  ) {
    this.router.events
      .pipe(filter((event): event is NavigationStart => event instanceof NavigationStart))
      .subscribe(() => {
        this.activeModule = '';
      });
  }

  get company(): string {
    return this.sessionService.CompanyName || 'No Company';
  }

  get userDisplayName(): string {
    return this.sessionService.UserName || this.sessionService.Email || 'User';
  }

  get userInitials(): string {
    const source = this.userDisplayName.trim();
    if (!source) {
      return 'U';
    }

    const parts = source
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase());

    if (parts.length) {
      return parts.join('');
    }

    return source.substring(0, 2).toUpperCase();
  }

  get environmentLabel(): string {
    return this.isLive ? 'Live' : 'Sandbox';
  }

  toggleModule(module: string): void {
    this.activeModule = this.activeModule === module ? '' : module;
  }

  get modules(): MenuItem[] {
    return this.menuService.getModules();
  }

  get searchResultGroups(): Array<{ label: string; items: MenuSearchItem[] }> {
    const groups = new Map<string, MenuSearchItem[]>();

    this.searchResults.forEach((item) => {
      const key = item.moduleLabel || 'Other';
      groups.set(key, [...(groups.get(key) ?? []), item]);
    });

    return Array.from(groups.entries())
      .map(([label, items]) => ({ label, items }))
      .sort((left, right) => left.label.localeCompare(right.label));
  }

  closeModulePanel(): void {
    this.activeModule = '';
  }

  closeGlobalSearch(): void {
    this.isGlobalSearchOpen = false;
    this.searchQuery = '';
    this.searchResults = [];
  }

  closeUserMenu(): void {
    this.isUserMenuOpen = false;
  }

  @HostListener('document:click', ['$event'])
  closeModulePanelOnOutsideClick(event: MouseEvent): void {
    if (!this.activeModule && !this.isGlobalSearchOpen && !this.isUserMenuOpen) {
      return;
    }

    const target = event.target;

    if (!(target instanceof HTMLElement)) {
      return;
    }

    const clickedModuleButton = Boolean(target.closest('.module-menu-item'));
    const clickedPanel = Boolean(target.closest('.app-module-panel'));
    const clickedSearchButton = Boolean(target.closest('.app-search'));
    const clickedSearchPanel = Boolean(target.closest('.app-search-panel'));
    const clickedUserButton = Boolean(target.closest('.app-user'));
    const clickedUserMenu = Boolean(target.closest('.app-user-menu'));

    if (!clickedModuleButton && !clickedPanel) {
      this.activeModule = '';
    }

    if (!clickedSearchButton && !clickedSearchPanel) {
      this.closeGlobalSearch();
    }

    if (!clickedUserButton && !clickedUserMenu) {
      this.closeUserMenu();
    }
  }

  @HostListener('document:keydown.escape')
  closeModulePanelOnEscape(): void {
    this.activeModule = '';
    this.closeGlobalSearch();
    this.closeUserMenu();
  }

  @HostListener('document:keydown', ['$event'])
  openGlobalSearchShortCut(event: Event): void {
    if (!(event instanceof KeyboardEvent)) {
      return;
    }

    const key = event.key.toLowerCase();
    if (!event.ctrlKey || key !== 'k') {
      return;
    }

    event.preventDefault();
    this.openGlobalSearch();
  }

  async onMenuNavigate(item: MenuItem): Promise<void> {
    this.activeModule = '';

    const pageId = item.pageId?.trim().toLowerCase();
    if (pageId && (item.openMode === 'popup' || shouldOpenFromMenuAsRunModal(pageId))) {
      await this.globalSearchPopup.open({
        ...item,
        moduleLabel: item.module,
      });
      return;
    }

    if (item.route?.trim()) {
      await this.router.navigate([item.route.trim()]);
    }
  }

  onGlobalSearchInput(query: string): void {
    this.searchQuery = query;
    this.searchResults = this.menuService.search(query);
  }

  onGlobalSearchFocus(): void {
    this.isGlobalSearchOpen = true;
    this.onGlobalSearchInput(this.searchQuery);
  }

  async onGlobalSearchSelect(item: MenuSearchItem): Promise<void> {
    this.activeModule = '';

    const opened = await this.globalSearchPopup.open(item);
    if (opened) {
      this.closeGlobalSearch();
    }
  }

  async changeCompany(): Promise<void> {
    if (this.isCompanyChanging) return;
    this.isCompanyChanging = true;
    try {
      const companies = await firstValueFrom(this.authService.listAuthorizedCompanies());
      const available = companies.filter(company => company.systemId !== this.sessionService.Company);
      if (!available.length) {
        await this.confirmation.message('No other authorized company is available for your account.', 'Change company');
        return;
      }
      const choice = await this.confirmation.prompt('Change company', [{
        key: 'companyId',
        label: 'Company',
        type: 'select',
        required: true,
        defaultValue: this.sessionService.Company,
        options: companies.map(company => ({
          value: company.systemId,
          label: [company.code, company.name].filter(Boolean).join(' - '),
        })),
      }]);
      const id = choice?.['companyId'];
      if (typeof id !== 'string' || !id || id === this.sessionService.Company) return;
      if (!companies.some(company => company.systemId === id)) {
        throw new Error('The selected company is not available to your account.');
      }
      // Never abandon unsaved edits or in-flight writes when switching company.
      if (!await this.unsaved.canLeave()) return;
      await firstValueFrom(this.authService.switchActiveCompany(id));
      this.unsaved.discard();
      // A clean reload destroys stale company-bound components, caches and popup stacks.
      window.location.assign(this.workspace.baseHref);
    } catch {
      await this.confirmation.message('Unable to change company. Your current company is still active. Try again.', 'Change company');
    } finally {
      this.isCompanyChanging = false;
    }
  }

  openGlobalSearch(): void {
    this.isGlobalSearchOpen = true;
    setTimeout(() => this.globalSearchInput?.nativeElement.focus(), 50);
    this.onGlobalSearchInput(this.searchQuery);
  }

  openNotifications(): void {
    this.drawerService.open({id:'notification-inbox',title:'Notifications',viewId:'notifications',size:'md',allowNested:true});
  }

  openUserMenu(): void {
    this.isUserMenuOpen = !this.isUserMenuOpen;
  }

  onUserMenuSelect(item: { id?: string; route?: string; disabled?: boolean }): void {
    if (item.disabled) {
      return;
    }

    this.closeUserMenu();

    if (item.id === 'profile') {
      this.drawerService.open({
        id: 'user-profile-drawer',
        title: 'Profile',
        viewId: 'profile',
        size: 'md',
        allowNested: false
      });
      return;
    }

    if (item.route) {
      void this.router.navigate([item.route]);
    }
  }

  logout(): void {
    this.sessionService.logout('manual-header-logout');
  }
}
