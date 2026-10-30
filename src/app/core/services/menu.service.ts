import { Injectable } from '@angular/core';
import { MenuItem, MenuSearchItem } from '../models/menu-item.model';
import { PermissionService } from './permission.service';
import { isPageIdRegistered } from './page-registry';
import { featurePageModules } from '../../features/feature-pages.generated';
import { ListPageConfig } from '../../platform/models/page-config.model';

@Injectable({
  providedIn: 'root'
})
export class MenuService {
  private readonly items: MenuItem[] = this.buildConfiguredMenu();

  private buildConfiguredMenu(): MenuItem[] {
    const modules = new Map<string, MenuItem>();
    for (const bucket of featurePageModules) {
      for (const value of Object.values(bucket)) {
        const page = value as ListPageConfig | undefined;
        if (!page?.menu || !page.pageId) continue;
        const menu = page.menu;
        let module = modules.get(menu.module);
        if (!module) {
          module = { pageId: menu.module.toLowerCase(), label: menu.module, module: menu.module, icon: menu.moduleIcon ?? menu.icon, children: [] };
          modules.set(menu.module, module);
        }
        module.children!.push({ pageId: page.pageId, label: page.title ?? page.pageId, module: menu.module, group: menu.group, route: menu.route, icon: menu.icon });
      }
    }
    return [...modules.values()];
  }

  constructor(private readonly permissionService: PermissionService) {}

  getModules(): MenuItem[] {
    return this.items.map((item) => ({
      ...item,
      children: this.filterItems(item.children ?? [])
    })).filter(item => item.children.length > 0);
  }

  getModule(moduleKey: string): MenuItem | undefined {
    const normalizedKey = this.normalize(moduleKey);
    const item = this.getModules().find((menuItem) => this.normalize(menuItem.module) === normalizedKey || this.normalize(menuItem.pageId) === normalizedKey);

    if (!item) {
      return undefined;
    }

    return item;
  }

  getModuleItems(moduleKey: string): MenuItem[] {
    return this.getModule(moduleKey)?.children ?? [];
  }

  search(query: string, limit = 8): MenuSearchItem[] {
    const normalizedQuery = this.normalizeQuery(query);
    if (!normalizedQuery) {
      return [];
    }

    return this.getModules()
      .flatMap((module) => this.collectSearchItems(module.children ?? [], module.label))
      .filter((item) => this.matchesQuery(item, normalizedQuery))
      .sort((left, right) => this.compareSearchItems(left, right, normalizedQuery))
      .slice(0, limit);
  }

  private collectSearchItems(items: MenuItem[], moduleLabel: string): MenuSearchItem[] {
    return items.flatMap((item) => {
      const isSearchablePage = Boolean(item.pageId?.trim() || item.route?.trim());
      const current: MenuSearchItem[] = isSearchablePage
        ? [{ ...item, moduleLabel }]
        : [];

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

    if (leftScore !== rightScore) {
      return leftScore - rightScore;
    }

    return left.label.localeCompare(right.label);
  }

  private getSearchScore(item: MenuSearchItem, normalizedQuery: string): number {
    const label = this.normalize(item.label);
    const moduleLabel = this.normalize(item.moduleLabel);

    if (label === normalizedQuery) {
      return 0;
    }

    if (label.startsWith(normalizedQuery)) {
      return 1;
    }

    if (moduleLabel.startsWith(normalizedQuery)) {
      return 2;
    }

    return 3;
  }

  private filterItems(items: MenuItem[]): MenuItem[] {
    return items
      .filter(item => isPageIdRegistered(item.pageId) && this.permissionService.canView(item.pageId))
      .map(item => ({ ...item, children: item.children ? this.filterItems(item.children) : undefined }));
  }

  private normalizeQuery(value: string): string {
    return this.normalize(value).replace(/\s+/g, ' ');
  }

  private normalize(value: string): string {
    return value.trim().toLowerCase();
  }
}

