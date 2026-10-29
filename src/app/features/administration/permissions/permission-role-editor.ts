import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PageRight, PermissionAdminApi, PermissionPage, PermissionRole, ResourceRight, TargetRight } from './permission-admin-api.service';

type PageFlag = 'canRead' | 'canCreate' | 'canModify' | 'canDelete' | 'canPost';
type ResourceFlag = 'canRead' | 'canCreate' | 'canModify' | 'canDelete' | 'canExecute';
type TargetFlag = 'canView' | 'canEdit' | 'canExecute';

@Component({
  selector: 'app-permission-role-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './permission-role-editor.html',
  styleUrl: './permission-editor.scss',
})
export class PermissionRoleEditor implements OnChanges {
  private readonly api = inject(PermissionAdminApi);
  @Input({ required: true }) role!: PermissionRole;
  @Output() closed = new EventEmitter<void>();

  pages: PermissionPage[] = [];
  resources: string[] = [];
  pageRights: PageRight[] = [];
  resourceRights: ResourceRight[] = [];
  targetRights: TargetRight[] = [];
  readonly pageFlags: ReadonlyArray<{ key: PageFlag; label: string }> = [
    {key:'canRead',label:'Read'}, {key:'canCreate',label:'Insert'},
    {key:'canModify',label:'Modify'}, {key:'canDelete',label:'Delete'}, {key:'canPost',label:'Post'},
  ];
  readonly resourceFlags: ReadonlyArray<{ key: ResourceFlag; label: string }> = [
    {key:'canRead',label:'Read'}, {key:'canCreate',label:'Insert'},
    {key:'canModify',label:'Modify'}, {key:'canDelete',label:'Delete'}, {key:'canExecute',label:'Execute'},
  ];
  readonly targetFlags: ReadonlyArray<{ key: TargetFlag; label: string }> = [
    {key:'canView',label:'Visible'}, {key:'canEdit',label:'Editable'}, {key:'canExecute',label:'Execute'},
  ];
  tab: 'pages' | 'controls' | 'resources' = 'pages';
  selectedPageId = '';
  search = '';
  loading = false;
  saving = false;
  error = '';
  success = '';
  private requestId = 0;

  get readonlyRole(): boolean { return this.role.isSystem; }
  get visiblePages(): PermissionPage[] {
    const query = this.search.toLowerCase().trim();
    return this.pages.filter(page => !query || [page.pageId, page.title, page.module ?? '', page.route ?? '']
      .some(value => value.toLowerCase().includes(query)));
  }
  get visibleResources(): string[] {
    const query = this.search.toLowerCase().trim();
    return this.resources.filter(name => !query || name.toLowerCase().includes(query));
  }
  get selectedPage(): PermissionPage | undefined {
    return this.pages.find(page => page.pageId === this.selectedPageId);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['role']) void this.load();
  }

  async load(): Promise<void> {
    const revision = ++this.requestId;
    this.loading = true; this.error = ''; this.success = '';
    try {
      const [pages, resources, pageRights, resourceRights, targetRights] = await Promise.all([
        this.api.pages(), this.api.resources(), this.api.getPageRights(this.role.systemId),
        this.api.getResourceRights(this.role.systemId), this.api.getTargetRights(this.role.systemId),
      ]);
      if (revision !== this.requestId) return;
      this.pages = pages; this.resources = resources; this.pageRights = pageRights;
      this.resourceRights = resourceRights; this.targetRights = targetRights;
      if (!pages.some(page => page.pageId === this.selectedPageId)) this.selectedPageId = pages[0]?.pageId ?? '';
    } catch (e) {
      if (revision === this.requestId) this.error = this.errorText(e);
    } finally {
      if (revision === this.requestId) this.loading = false;
    }
  }

  pageFlag(id: string, flag: PageFlag): boolean {
    return this.pageRights.find(row => row.pageId === id)?.[flag] ?? false;
  }
  changePage(id: string, flag: PageFlag, checked: boolean): void {
    if (this.readonlyRole) return;
    let row = this.pageRights.find(entry => entry.pageId === id);
    if (!row) {
      row = {pageId: id, canRead: false, canCreate: false, canModify: false, canDelete: false, canPost: false};
      this.pageRights.push(row);
    }
    row[flag] = checked;
    this.success = '';
  }

  resourceFlag(id: string, flag: ResourceFlag): boolean {
    return this.resourceRights.find(row => row.resource === id)?.[flag] ?? false;
  }
  changeResource(id: string, flag: ResourceFlag, checked: boolean): void {
    if (this.readonlyRole) return;
    let row = this.resourceRights.find(entry => entry.resource === id);
    if (!row) {
      row = {resource: id, canRead: false, canCreate: false, canModify: false, canDelete: false, canExecute: false};
      this.resourceRights.push(row);
    }
    row[flag] = checked; this.success = '';
  }

  targetFlag(id: string, flag: TargetFlag): boolean {
    return this.targetRights.find(row => row.targetId === id)?.[flag] ?? true;
  }
  changeTarget(id: string, flag: TargetFlag, checked: boolean): void {
    if (this.readonlyRole) return;
    let row = this.targetRights.find(entry => entry.targetId === id);
    if (!row) {
      row = {targetId: id, canView: true, canEdit: true, canExecute: true};
      this.targetRights.push(row);
    }
    row[flag] = checked; this.success = '';
  }

  async save(): Promise<void> {
    if (this.readonlyRole || this.loading || this.saving) return;
    this.saving = true; this.error = ''; this.success = '';
    try {
      const id = this.role.systemId;
      await this.api.saveResourceRights(id, this.resourceRights.filter(row =>
        row.canRead || row.canCreate || row.canModify || row.canDelete || row.canExecute));
      // Persist even all-false rows to explicitly deny a Page for this Role.
      // Unconfigured catalog pages retain their existing backend-only behavior.
      await this.api.savePageRights(id, this.pages.map(page =>
        this.pageRights.find(row => row.pageId === page.pageId) ??
          {pageId:page.pageId,canRead:false,canCreate:false,canModify:false,canDelete:false,canPost:false}));
      await this.api.saveTargetRights(id, this.targetRights.filter(row =>
        !row.canView || !row.canEdit || !row.canExecute));
      await this.load();
      this.success = 'Permission changes saved.';
    } catch (e) {
      this.error = 'Permission update incomplete. Some lines may have saved. Reload and review. ' + this.errorText(e);
    } finally { this.saving = false; }
  }

  private errorText(error: unknown): string {
    if (error && typeof error === 'object') {
      const value = error as {error?: {message?: string}; message?: string};
      return value.error?.message ?? value.message ?? 'Request failed.';
    }
    return String(error);
  }
}
