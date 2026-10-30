import { inject, viewChildren } from '@angular/core';
import { UnsavedChangesService } from '../../../platform/pages/unsaved-changes.service';
import { DocumentPageCommandPermissionService } from '../../../platform/pages/document-page-command-permission.service';
import type { CommandConfig } from '../../../platform/models/command-config.model';
import { NgComponentOutlet, NgTemplateOutlet } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FactBoxSectionConfig } from '../../../platform/models/document-window-config.model';
import {
  FactBoxConfig,
  FactBoxPanelConfig,
} from '../../../platform/models/fact-box-config.model';
import { FactBoxContext } from '../../../platform/models/fact-box-context.model';
import { FactBoxOverview } from './overview';
import { Notes } from './notes';
import { Attachments } from './attachments';

let nextId = 0;
/** Shared frame and config-driven composition. Feature behavior stays inside each part. */
@Component({
  selector: 'app-fact-box',
  standalone: true,
  imports: [NgComponentOutlet, NgTemplateOutlet, FactBoxOverview, Notes, Attachments],
  templateUrl: './fact-box.html',
  styleUrl: './fact-box.scss',
})
export class FactBox {
  @Input() sections: FactBoxSectionConfig[] = [];
  @Input() config?: FactBoxConfig;
  @Input() context: FactBoxContext = {};
  @Input() label = '';
  @Input() title = '';
  @Input() subtitle = '';
  @Output() action = new EventEmitter<string>();
  readonly id = 'factbox-' + ++nextId;
  private readonly permissions = inject(DocumentPageCommandPermissionService);
  buttonState(button: CommandConfig): CommandConfig {
    return this.permissions.apply(button, this.context.pageId ?? '');
  }
  private readonly noteEditors = viewChildren(Notes);
  private readonly attachmentEditors = viewChildren(Attachments);
  private readonly unsaved = inject(UnsavedChangesService);
  private readonly editorScope = {};
  async canLeave(): Promise<boolean> {
    if (
      !(await this.unsaved.canLeave(
        [...this.noteEditors(), ...this.attachmentEditors()],
        this.editorScope,
      ))
    )
      return false;
    this.unsaved.discard([...this.noteEditors(), ...this.attachmentEditors()], this.editorScope);
    return true;
  }
  private selected?: string;
  private readonly visited = new Set<string>();
  private readonly emitAction = (key: string) => this.runAction(key);
  get partContext(): FactBoxContext {
    return { ...this.context, unsavedScope: this.editorScope, action: this.emitAction };
  }
  get panels(): FactBoxPanelConfig[] {
    const defaults: FactBoxPanelConfig[] = [
      { id: 'overview', title: 'Overview', kind: 'overview' },
      { id: 'notes', title: 'Notes', kind: 'notes' },
      { id: 'attachments', title: 'Files', kind: 'attachments' },
    ];
    return (this.config?.panels ?? defaults).filter(
      (panel) => panel.enabled !== false && (!panel.kind || this.config?.[panel.kind] !== false),
    );
  }
  get activeId(): string | undefined {
    return (
      this.panels.find((p) => p.id === this.selected)?.id ??
      this.panels.find((p) => p.id === this.config?.defaultSectionId)?.id ??
      this.panels[0]?.id
    );
  }
  select(id: string): void {
    if (this.activeId) this.visited.add(this.activeId);
    this.selected = id;
    this.visited.add(id);
  }
  mounted(id: string): boolean {
    return id === this.activeId || this.visited.has(id);
  }
  navigate(event: KeyboardEvent, index: number): void {
    const length = this.panels.length;
    const next =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? length - 1
          : event.key === 'ArrowRight'
            ? (index + 1) % length
            : event.key === 'ArrowLeft'
              ? (index + length - 1) % length
              : -1;
    if (next < 0 || !length) return;
    event.preventDefault();
    this.select(this.panels[next].id);
    (event.currentTarget as HTMLElement).parentElement
      ?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
      [next]?.focus();
  }
  runAction(key: string): void {
    if (key) this.action.emit(key);
  }
}
