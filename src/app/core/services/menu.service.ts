import { Injectable } from '@angular/core';
import { MenuItem, MenuSearchItem } from '../models/menu-item.model';
import { PermissionService } from './permission.service';
import { isPageIdRegistered } from './run-modal-config-registry';

@Injectable({ providedIn: 'root' })
export class MenuService {
  private readonly items: MenuItem[] = [
    {
      pageId: 'setup', label: 'Setup', module: 'Setup', icon: 'bi bi-gear',
      children: [
        { pageId: 'number-series', label: 'No. Series', module: 'Setup',
          route: '/number-series', icon: 'bi bi-123', group: 'Numbering',
          permissionKey: 'number_series' },
        { pageId: 'sales-receivables-setup', label: 'Sales & Receivables Setup',
          module: 'Setup', route: '/sales-receivables-setup', openMode: 'route',
          icon: 'bi bi-receipt', group: 'Sales', permissionKey: 'sales_receivables_setup' },
        { pageId: 'purchases-payables-setup', label: 'Purchases & Payables Setup',
          module: 'Setup', route: '/purchases-payables-setup', openMode: 'route',
          icon: 'bi bi-wallet', group: 'Purchase', permissionKey: 'purchases_payables_setup' },
      ],
    },
    {
      pageId: 'sales', label: 'Sales', module: 'Sales', icon: 'bi bi-people',
      children: [{
        pageId: 'customer', label: 'Customers', module: 'Sales',
        route: '/customer', icon: 'bi bi-person-lines-fill',
        group: 'Master Data', permissionKey: 'customers',
      }],
    },
    {
      pageId: 'purchase', label: 'Purchase', module: 'Purchase', icon: 'bi bi-bag',
      children: [{
        pageId: 'purchase-requisition', label: 'Purchase Requisitions', module: 'Purchase',
        route: '/purchase-requisition', icon: 'bi bi-clipboard-check',
        group: 'Purchase', permissionKey: 'purchase_requisitions',
      }],
    },
  ];

  constructor(private readonly permissionService: PermissionService) {}

  getModules(): MenuItem[] {
    return this.items.map((item) => ({
      ...item,
      children: this.filterItems(item.children ?? []),
    })).filter(item => item.children.length > 0);
  }

  getModule(moduleKey: string): MenuItem | undefined {
    const normalizedKey = this.normalize(moduleKey);
    return this.getModules().find((menuItem) =>
      this.normalize(menuItem.module) === normalizedKey ||
      this.normalize(menuItem.pageId) === normalizedKey);
  }

  getModuleItems(moduleKey: string): MenuItem[] {
    return this.getModule(moduleKey)?.children ?? [];
  }

  search(query: string, limit = 8): MenuSearchItem[] {
    const normalizedQuery = this.normalizeQuery(query);
    if (!normalizedQuery) return [];
    return this.getModules()
      .flatMap((module) => this.collectSearchItems(module.children ?? [], module.label))
      .filter((item) => this.matchesQuery(item, normalizedQuery))
      .sort((left, right) => this.compareSearchItems(left, right, normalizedQuery))
      .slice(0, limit);
  }

  private collectSearchItems(items: MenuItem[], moduleLabel: string): MenuSearchItem[] {
    return items.flatMap((item) => {
      const isSearchablePage = Boolean(item.pageId?.trim() || item.route?.trim());
      const current: MenuSearchItem[] = isSearchablePage ? [{ ...item, moduleLabel }] : [];
      const children = item.children ? this.collectSearchItems(item.children, moduleLabel) : [];
      return [...current, ...children];
    });
  }

  private matchesQuery(item: MenuSearchItem, normalizedQuery: string): boolean {
    return [item.label, item.moduleLabel, item.group, item.pageId, item.route]
      .filter((value): value is string => Boolean(value))
      .some((value) => this.normalize(value).includes(normalizedQuery));
  }

  private compareSearchItems(left: MenuSearchItem, right: MenuSearchItem, normalizedQuery: string): number {
    const leftScore = this.getSearchScore(left, normalizedQuery);
    const rightScore = this.getSearchScore(right, normalizedQuery);
    if (leftScore !== rightScore) return leftScore - rightScore;
    return left.label.localeCompare(right.label);
  }

  private getSearchScore(item: MenuSearchItem, normalizedQuery: string): number {
    const label = this.normalize(item.label);
    const moduleLabel = this.normalize(item.moduleLabel);
    if (label === normalizedQuery) return 0;
    if (label.startsWith(normalizedQuery)) return 1;
    if (moduleLabel.startsWith(normalizedQuery)) return 2;
    return 3;
  }

  private filterItems(items: MenuItem[]): MenuItem[] {
    return items
      .filter(item => (item.openMode === 'route' || isPageIdRegistered(item.pageId)) &&
        this.permissionService.hasPermission(item.permissionKey))
      .map(item => ({ ...item, children: item.children ? this.filterItems(item.children) : undefined }));
  }

  private normalizeQuery(value: string): string {
    return this.normalize(value).replace(/\s+/g, ' ');
  }

  private normalize(value: string): string { return value.trim().toLowerCase(); }
}
