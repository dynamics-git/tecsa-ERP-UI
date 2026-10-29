import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PermissionAdminApi, PermissionPage } from './permission-admin-api.service';
import { CatalogRegistration, discoverPermissionCatalog } from './permission-catalog-builder';
import { permissionPagesListConfig } from './permission-pages.config';
export * from './permission-pages.config';

@Component({
  selector: 'app-permission-pages',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './permission-pages.html',
  styleUrl: './permission-editor.scss',
})
export class PermissionPagesPage implements OnInit {
  private readonly api = inject(PermissionAdminApi);
  readonly listConfig = permissionPagesListConfig;
  pages: PermissionPage[] = [];
  discovered: CatalogRegistration[] = [];
  unmapped: string[] = [];
  selectedPageId = '';
  search = '';
  loading = false;
  saving = false;
  error = '';
  message = '';
  get visiblePages(): PermissionPage[] {
    const term = this.search.toLowerCase().trim();
    return this.pages.filter(item => !term || [item.pageId,item.title,item.module ?? '',item.route ?? '']
      .some(value => value.toLowerCase().includes(term)));
  }
  get selectedPage(): PermissionPage | undefined {
    return this.pages.find(item => item.pageId === this.selectedPageId);
  }
  ngOnInit(): void { void this.reload(); }
  async reload(): Promise<void> {
    this.loading = true; this.error = ''; this.message = '';
    try {
      const [pages, resources, registry] = await Promise.all([
        this.api.pages(), this.api.resources(), import('../../run-modal-page-modules'),
      ]);
      const catalog = discoverPermissionCatalog(
        registry.runModalPageModules as unknown as ReadonlyArray<Record<string, unknown>>, resources,
      );
      this.pages = pages; this.discovered = catalog.mapped; this.unmapped = catalog.unmapped;
      if (!pages.some(page => page.pageId === this.selectedPageId)) this.selectedPageId = pages[0]?.pageId ?? '';
    } catch (error) { this.error = this.errorText(error); }
    finally { this.loading = false; }
  }
  async sync(): Promise<void> {
    if (this.saving || this.loading || !this.discovered.length) return;
    this.saving = true; this.error = ''; this.message = '';
    try {
      await this.api.syncPages(this.discovered);
      await this.reload();
      this.message = this.discovered.length + ' Page definitions synchronized from TecSA UI configurations.';
    } catch (error) { this.error = this.errorText(error); }
    finally { this.saving = false; }
  }
  private errorText(error: unknown): string {
    if (error && typeof error === 'object') {
      const value = error as {error?: {message?: string}; message?: string};
      return value.error?.message ?? value.message ?? 'Unable to load Page Configuration.';
    }
    return String(error);
  }
}
