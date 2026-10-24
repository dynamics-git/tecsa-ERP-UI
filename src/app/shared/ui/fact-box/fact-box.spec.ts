import { Component, Input, inject } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { describe, it, expect, vi } from 'vitest';
import { Subject, of, throwError } from 'rxjs';
import { FactBox } from './fact-box';
import { ListGrid } from '../../../platform/pages/list-grid/list-grid';
import { DocumentWindow } from '../../../platform/document/document-window/document-window';
import { Notes } from './notes';
import { Attachments } from './attachments';
import {
  RecordCollaborationService,
  CollaborationPage,
} from '../../../platform/data/record-collaboration.service';
import { ConfirmationService } from '../confirmation.service';
import { DATA_REST_SERVICE, DataSourceService } from '../../../platform/data/data-source.service';
import { RestService } from '../../../core/services/rest.service';
import { firstValueFrom } from 'rxjs';
import { SessionService } from '../../../core/services/session.service';
import { UnsavedChangesService } from '../../../platform/pages/unsaved-changes.service';
import { FactBoxContext } from '../../../platform/models/fact-box-context.model';

@Component({
  selector: 'partner-panel',
  standalone: true,
  template: '<p>Partner {{ context.recordEndpoint }} {{ data["caption"] }}</p>',
})
class PartnerPanel {
  @Input() context: FactBoxContext = {};
  @Input() data: Record<string, unknown> = {};
}
@Component({ selector: 'partner-editor', standalone: true, template: '<p>Partner editor</p>' })
class PartnerEditor {
  @Input() context: FactBoxContext = {};
  @Input() data: Record<string, unknown> = {};
  dirty = true;
  saving = false;
  private readonly unsaved = inject(UnsavedChangesService);
  ngOnChanges(): void {
    this.unsaved.register(
      this,
      { changed: () => this.dirty, saving: () => this.saving, discard: () => (this.dirty = false) },
      this.context.unsavedScope,
    );
  }
  ngOnDestroy(): void {
    this.unsaved.release(this);
  }
}
@Component({
  selector: 'partner-notes-wrapper',
  standalone: true,
  imports: [Notes],
  template: '<app-notes [context]="context"></app-notes>',
})
class PartnerNotesWrapper {
  @Input() context: FactBoxContext = {};
  @Input() data: Record<string, unknown> = {};
}
const page: CollaborationPage = {
  data: [
    {
      systemId: 'note-1',
      systemRowVersion: 3,
      author: 'Amit',
      systemCreatedAt: '2026-10-24T10:00:00Z',
      systemModifiedAt: '2026-10-24T10:00:00Z',
      body: 'Saved note',
      fileName: 'spec.txt',
      byteSize: 100,
    },
  ],
  meta: { currentPage: 1, lastPage: 1, total: 1 },
  capabilities: { read: true, create: true, modify: true, delete: true },
};
function setup(superAdmin = true) {
  const api = {
    scope: vi.fn(() => 'company-a'),
    path: vi.fn((c: FactBoxContext, k: string) => c.recordEndpoint + '/' + k),
    list: vi.fn(() => of(page)),
    saveNote: vi.fn(() => of({})),
    remove: vi.fn(() => of({})),
    upload: vi.fn(() => of({})),
    download: vi.fn(() => of(new Blob(['file']))),
  };
  const confirmation = { confirm: vi.fn(() => Promise.resolve(true)) };
  TestBed.configureTestingModule({
    imports: [FactBox, Notes, Attachments],
    providers: [
      {
        provide: SessionService,
        useValue: {
          SuperAdmin: superAdmin,
          Permissions: [],
          Company: 'company-a',
          UserId: 'user-a',
        },
      },
      { provide: RecordCollaborationService, useValue: api },
      { provide: ConfirmationService, useValue: confirmation },
    ],
  });
  return { api, confirmation };
}
const context = { companyId: 'company-a', recordEndpoint: '/items/item-a' };

describe('Config-driven master FactBox', () => {
  it('uses built-in parts, false flags and fallback without creating a second command system', () => {
    const { api } = setup(),
      f = TestBed.createComponent(FactBox);
    f.componentRef.setInput('config', { notes: false, attachments: false });
    f.componentRef.setInput('context', context);
    f.componentRef.setInput('sections', [
      {
        id: 'summary',
        title: 'Item overview',
        layout: 'metrics',
        rows: [{ label: 'Unit cost', value: '12.800000' }],
      },
    ]);
    f.detectChanges();
    expect(f.nativeElement.textContent).toContain('12.800000');
    expect(f.nativeElement.querySelectorAll('[role="tab"]').length).toBe(1);
    expect(api.list).not.toHaveBeenCalled();
    f.componentRef.setInput('config', { enabled: false });
    f.detectChanges();
    expect(f.nativeElement.querySelector('[role="tab"]')).toBeNull();
    f.destroy();
  });
  it('renders custom SDK components together with configured buttons and rows', () => {
    setup();
    const f = TestBed.createComponent(FactBox),
      action = vi.fn();
    f.componentInstance.action.subscribe(action);
    f.componentRef.setInput('context', context);
    f.componentRef.setInput('sections', [
      {
        id: 'old',
        title: 'Existing',
        rows: [{ label: 'Status', value: 'Open' }],
        customComponent: PartnerPanel,
        customData: { caption: 'Custom' },
        buttons: [
          { label: 'Existing command', actionKey: 'cmd:old' },
          { label: 'Hidden', actionKey: 'hidden', hidden: true },
          { label: 'Disabled', actionKey: 'disabled', disabled: true },
        ],
      },
    ]);
    f.detectChanges();
    expect(f.nativeElement.textContent).toContain('Open');
    expect(f.nativeElement.querySelector('partner-panel')).not.toBeNull();
    const buttons = f.nativeElement.querySelectorAll('button');
    expect(buttons.length).toBe(2);
    buttons[0].click();
    buttons[1].click();
    expect(action).toHaveBeenCalledExactlyOnceWith('cmd:old');
    f.destroy();
  });
  it('preserves a note draft when switching tabs, and lazy-loads only visited parts', () => {
    const { api } = setup(),
      f = TestBed.createComponent(FactBox);
    f.componentRef.setInput('config', {});
    f.componentRef.setInput('context', context);
    f.detectChanges();
    expect(api.list).not.toHaveBeenCalled();
    (f.nativeElement.querySelectorAll('[role="tab"]')[1] as HTMLButtonElement).click();
    f.detectChanges();
    const textarea = f.nativeElement.querySelector('textarea');
    textarea.value = 'Unsaved item A';
    textarea.dispatchEvent(new Event('input'));
    f.detectChanges();
    (f.nativeElement.querySelectorAll('[role="tab"]')[2] as HTMLButtonElement).click();
    f.detectChanges();
    expect(f.nativeElement.querySelector('app-attachments')).not.toBeNull();
    (f.nativeElement.querySelectorAll('[role="tab"]')[1] as HTMLButtonElement).click();
    f.detectChanges();
    expect(f.nativeElement.querySelector('textarea').value).toBe('Unsaved item A');
    f.destroy();
  });
  it('uses the existing scoped unsaved-change confirmation before closing a note editor', async () => {
    const { confirmation } = setup();
    confirmation.confirm.mockResolvedValue(false);
    const f = TestBed.createComponent(FactBox);
    f.componentRef.setInput('config', { defaultSectionId: 'notes' });
    f.componentRef.setInput('context', context);
    f.detectChanges();
    const textarea = f.nativeElement.querySelector('textarea');
    textarea.value = 'Keep this draft';
    textarea.dispatchEvent(new Event('input'));
    f.detectChanges();
    expect(await f.componentInstance.canLeave()).toBe(false);
    expect(confirmation.confirm).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Unsaved changes' }),
    );
    f.destroy();
  });
  it('applies page permissions even when a custom button has no permissionKey', () => {
    setup(false);
    const f = TestBed.createComponent(FactBox);
    f.componentRef.setInput('config', {
      buttons: [{ label: 'Restricted', actionKey: 'cmd:restricted' }],
    });
    f.detectChanges();
    expect(
      (f.nativeElement.querySelector('.factbox-actions button') as HTMLButtonElement).disabled,
    ).toBe(true);
    f.destroy();
  });
  it('keeps the same Notes editor and draft while a Card FactBox is hidden', () => {
    setup();
    const f = TestBed.createComponent(DocumentWindow);
    f.componentRef.setInput('factBoxConfig', { defaultSectionId: 'notes' });
    f.componentRef.setInput('factBoxDataSource', { endpoint: '/items' });
    f.componentRef.setInput('headerData', { systemId: 'item-a' });
    f.detectChanges();
    const notes = f.debugElement.query(By.directive(Notes)).componentInstance as Notes;
    notes.changeDraft({ target: { value: 'Retained card draft' } } as unknown as Event);
    f.componentInstance.factBoxOpen = false;
    f.changeDetectorRef.markForCheck();
    f.detectChanges();
    f.componentInstance.factBoxOpen = true;
    f.changeDetectorRef.markForCheck();
    f.detectChanges();
    expect(f.debugElement.query(By.directive(Notes)).componentInstance).toBe(notes);
    expect(notes.draft).toBe('Retained card draft');
    f.destroy();
  });
  it('keeps the List draft when the FactBox is hidden and reopened', () => {
    setup();
    const f = TestBed.createComponent(ListGrid);
    f.componentRef.setInput('config', {
      pageId: 'items',
      title: 'Items',
      dataSource: { endpoint: '/items' },
      factBox: { enabled: true, defaultSectionId: 'notes' },
    });
    const selected = { systemId: 'item-a', number: 'A' };
    f.componentRef.setInput('data', [selected]);
    f.componentInstance.selectRow(selected);
    f.detectChanges();
    const notes = f.debugElement.query(By.directive(Notes)).componentInstance as Notes;
    notes.changeDraft({ target: { value: 'Retained list draft' } } as unknown as Event);
    f.componentInstance.toggleFactbox();
    f.changeDetectorRef.markForCheck();
    f.detectChanges();
    f.componentInstance.toggleFactbox();
    f.changeDetectorRef.markForCheck();
    f.detectChanges();
    expect(f.debugElement.query(By.directive(Notes)).componentInstance).toBe(notes);
    expect(notes.draft).toBe('Retained list draft');
    f.destroy();
  });
  it('guards custom partner panels using the existing registration and isolates other hosts', async () => {
    const { confirmation } = setup();
    confirmation.confirm.mockResolvedValue(false);
    const f = TestBed.createComponent(FactBox);
    f.componentRef.setInput('config', {
      panels: [{ id: 'partner', title: 'Partner', component: PartnerEditor }],
    });
    f.detectChanges();
    const editor = f.debugElement.query(By.directive(PartnerEditor))
      .componentInstance as PartnerEditor;
    expect(await f.componentInstance.canLeave()).toBe(false);
    expect(editor.dirty).toBe(true);
    confirmation.confirm.mockResolvedValue(true);
    expect(await f.componentInstance.canLeave()).toBe(true);
    expect(editor.dirty).toBe(false);
    editor.saving = true;
    expect(await f.componentInstance.canLeave()).toBe(false);
    editor.saving = false;
    const unsaved = TestBed.inject(UnsavedChangesService),
      other = {};
    unsaved.register(other, { changed: () => true, saving: () => true }, {});
    expect(await f.componentInstance.canLeave()).toBe(true);
    unsaved.release(other);
    f.destroy();
    expect(await unsaved.canLeave()).toBe(true);
  });
  it('guards built-in Notes reused inside a custom partner component', async () => {
    const { confirmation } = setup();
    confirmation.confirm.mockResolvedValue(false);
    const f = TestBed.createComponent(FactBox);
    f.componentRef.setInput('context', context);
    f.componentRef.setInput('config', {
      panels: [{ id: 'wrapped', title: 'Custom notes', component: PartnerNotesWrapper }],
    });
    f.detectChanges();
    const notes = f.debugElement.query(By.directive(Notes)).componentInstance as Notes;
    notes.changeDraft({ target: { value: 'Wrapped draft' } } as unknown as Event);
    expect(await f.componentInstance.canLeave()).toBe(false);
    confirmation.confirm.mockResolvedValue(true);
    expect(await f.componentInstance.canLeave()).toBe(true);
    expect(notes.draft).toBe('');
    f.destroy();
  });
  it('guards partner components rendered inside Overview sections', async () => {
    const { confirmation } = setup();
    confirmation.confirm.mockResolvedValue(false);
    const f = TestBed.createComponent(FactBox);
    f.componentRef.setInput('sections', [
      { id: 'partner', title: 'Partner', customComponent: PartnerEditor },
    ]);
    f.detectChanges();
    expect(await f.componentInstance.canLeave()).toBe(false);
    f.destroy();
    expect(await TestBed.inject(UnsavedChangesService).canLeave()).toBe(true);
  });
  it('formats configured worksheet fields from the selected row and keeps API ownership aligned', () => {
    setup();
    const f = TestBed.createComponent(DocumentWindow);
    const a = {
      systemId: 'row-a',
      amount: '12.500000',
      blocked: false,
      unitId: 'pcs',
      __options_unitId: [{ value: 'pcs', label: 'PCS — Piece' }],
    };
    const b = {
      systemId: 'row-b',
      amount: '19.750000',
      blocked: true,
      unitId: 'box',
      __options_unitId: [{ value: 'box', label: 'BOX — Box' }],
    };
    f.componentRef.setInput('worksheet', true);
    f.componentRef.setInput('factBoxDataSource', { endpoint: '/worksheetLines' });
    f.componentRef.setInput('headerData', { amount: '999', blocked: false });
    f.componentRef.setInput('lineColumns', [
      { id: 'amount', field: 'amount', label: 'Amount', valueType: 'decimal' },
      { id: 'blocked', field: 'blocked', label: 'Blocked', valueType: 'boolean' },
      { id: 'unitId', field: 'unitId', label: 'Unit', options: [{ value: 'pcs', label: 'PCS' }] },
    ]);
    f.componentRef.setInput('lineRows', [a, b]);
    f.componentRef.setInput('factBoxConfig', {
      notes: false,
      attachments: false,
      sections: [
        {
          id: 'row',
          title: 'Row',
          fields: [
            { id: 'amount', field: 'amount', label: 'Amount' },
            { id: 'blocked', field: 'blocked', label: 'Blocked' },
            { id: 'unit', field: 'unitId', label: 'Unit' },
          ],
        },
      ],
    });
    f.detectChanges();
    f.componentInstance.handleLineSelectionChanged({
      activeRow: b,
      selectedRows: [b],
      selectedIndexes: [1],
    });
    f.changeDetectorRef.markForCheck();
    f.detectChanges();
    expect(f.componentInstance.resolvedFactBoxSections[0].rows?.map((row) => row.value)).toEqual([
      '19.750000',
      'Yes',
      'BOX — Box',
    ]);
    expect(f.componentInstance.factBoxContext.recordEndpoint).toBe('/worksheetLines/row-b');
    f.componentInstance.handleLineSelectionChanged({
      activeRow: a,
      selectedRows: [a],
      selectedIndexes: [0],
    });
    f.changeDetectorRef.markForCheck();
    f.detectChanges();
    expect(f.componentInstance.resolvedFactBoxSections[0].rows?.map((row) => row.value)).toEqual([
      '12.500000',
      'No',
      'PCS — Piece',
    ]);
    expect(f.componentInstance.factBoxContext.recordEndpoint).toBe('/worksheetLines/row-a');
    f.destroy();
  });
  it('supports ordered custom panels, false flags and keyboard navigation', () => {
    setup();
    const f = TestBed.createComponent(FactBox);
    f.componentRef.setInput('config', {
      notes: false,
      panels: [
        {
          id: 'custom',
          title: 'Stock',
          component: PartnerPanel,
          data: { caption: 'Availability' },
        },
        { id: 'notes', kind: 'notes', title: 'Notes' },
        { id: 'overview', kind: 'overview', title: 'Overview' },
      ],
    });
    f.detectChanges();
    expect(
      [...f.nativeElement.querySelectorAll('[role="tab"]')].map((x: any) => x.textContent.trim()),
    ).toEqual(['Stock', 'Overview']);
    expect(f.nativeElement.textContent).toContain('Availability');
    const first = f.nativeElement.querySelector('[role="tab"]');
    first.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }),
    );
    f.detectChanges();
    expect(f.nativeElement.querySelector('[aria-selected="true"]').textContent.trim()).toBe(
      'Overview',
    );
    f.destroy();
  });
});
describe('Real Notes and Attachments lifecycle', () => {
  it('saves/edits through the existing API with row versions and keeps drafts per record', async () => {
    const { api } = setup(),
      f = TestBed.createComponent(Notes);
    f.componentRef.setInput('context', context);
    f.detectChanges();
    const notes = f.componentInstance;
    notes.changeDraft({ target: { value: 'Item A draft' } } as unknown as Event);
    f.componentRef.setInput('context', { ...context, recordEndpoint: '/items/item-b' });
    f.detectChanges();
    expect(notes.draft).toBe('');
    f.componentRef.setInput('context', context);
    f.detectChanges();
    expect(notes.draft).toBe('Item A draft');
    notes.save();
    await Promise.resolve();
    f.detectChanges();
    expect(api.saveNote).toHaveBeenCalledWith('/items/item-a/notes', 'Item A draft', undefined);
    notes.edit(page.data[0]);
    notes.changeDraft({ target: { value: 'Edited' } } as unknown as Event);
    notes.save();
    await Promise.resolve();
    expect(api.saveNote).toHaveBeenLastCalledWith('/items/item-a/notes', 'Edited', page.data[0]);
    f.destroy();
  });
  it('keeps the draft when editing another note is cancelled', async () => {
    const { confirmation } = setup();
    confirmation.confirm.mockResolvedValue(false);
    const f = TestBed.createComponent(Notes);
    f.componentRef.setInput('context', context);
    f.detectChanges();
    const notes = f.componentInstance;
    notes.changeDraft({ target: { value: 'Keep my draft' } } as unknown as Event);
    await notes.edit(page.data[0]);
    expect(notes.draft).toBe('Keep my draft');
    expect(notes.editing).toBeUndefined();
    f.destroy();
  });
  it('does not show mutation controls without backend capability and reports load errors', () => {
    const { api } = setup();
    api.list.mockReturnValue(
      of({ ...page, capabilities: { read: true, create: false, modify: false, delete: false } }),
    );
    const f = TestBed.createComponent(Notes);
    f.componentRef.setInput('context', context);
    f.detectChanges();
    expect(f.nativeElement.querySelector('textarea')).toBeNull();
    expect(f.nativeElement.textContent).toContain('Saved note');
    api.list.mockReturnValue(
      throwError(() => ({ error: { error: { message: 'Access denied' } } })) as any,
    );
    f.componentInstance.load();
    f.detectChanges();
    expect(f.nativeElement.querySelector('[role="alert"]').textContent).toContain('Access denied');
    expect(f.componentInstance.result).toBeUndefined();
    expect(f.nativeElement.querySelector('textarea')).toBeNull();
    f.destroy();
  });
  it('never applies an obsolete save result to another record', async () => {
    const { api } = setup(),
      save = new Subject<unknown>();
    api.saveNote.mockReturnValue(save as any);
    const f = TestBed.createComponent(Notes);
    f.componentRef.setInput('context', context);
    f.detectChanges();
    const notes = f.componentInstance;
    notes.changeDraft({ target: { value: 'Saving A' } } as unknown as Event);
    notes.save();
    f.componentRef.setInput('context', { ...context, recordEndpoint: '/items/item-b' });
    f.detectChanges();
    notes.changeDraft({ target: { value: 'Draft B' } } as unknown as Event);
    const calls = api.list.mock.calls.length;
    save.next({});
    save.complete();
    await Promise.resolve();
    expect(notes.draft).toBe('Draft B');
    expect(api.list.mock.calls.length).toBe(calls);
    f.destroy();
  });
  it('preserves a newer draft when an earlier save returns after A to B to A', async () => {
    const { api } = setup(),
      save = new Subject<unknown>();
    api.saveNote.mockReturnValue(save as any);
    const f = TestBed.createComponent(Notes);
    f.componentRef.setInput('context', context);
    f.detectChanges();
    const notes = f.componentInstance;
    notes.changeDraft({ target: { value: 'Saving A' } } as unknown as Event);
    notes.save();
    f.componentRef.setInput('context', { ...context, recordEndpoint: '/items/item-b' });
    f.detectChanges();
    f.componentRef.setInput('context', context);
    f.detectChanges();
    notes.changeDraft({ target: { value: 'New A draft' } } as unknown as Event);
    const calls = api.list.mock.calls.length;
    save.next({});
    save.complete();
    await Promise.resolve();
    expect(notes.draft).toBe('New A draft');
    expect(api.list.mock.calls.length).toBe(calls);
    f.destroy();
  });
  it('blocks closing the FactBox while an attachment upload is pending', async () => {
    const { api } = setup(),
      upload = new Subject<unknown>();
    api.upload.mockReturnValue(upload as any);
    const f = TestBed.createComponent(FactBox);
    f.componentRef.setInput('config', { defaultSectionId: 'attachments' });
    f.componentRef.setInput('context', context);
    f.detectChanges();
    const files = f.debugElement.query(By.directive(Attachments)).componentInstance as Attachments;
    files.upload({
      target: { files: [new File(['data'], 'spec.txt')], value: '' },
    } as unknown as Event);
    expect(await f.componentInstance.canLeave()).toBe(false);
    upload.next({});
    upload.complete();
    await Promise.resolve();
    expect(await f.componentInstance.canLeave()).toBe(true);
    f.destroy();
  });
  it('rechecks record context after a delete confirmation before sending a write', async () => {
    const { api, confirmation } = setup();
    let decide!: (v: boolean) => void;
    confirmation.confirm.mockReturnValue(new Promise((resolve) => (decide = resolve)));
    const f = TestBed.createComponent(Notes);
    f.componentRef.setInput('context', context);
    f.detectChanges();
    const pending = f.componentInstance.remove(page.data[0]);
    f.componentRef.setInput('context', { ...context, recordEndpoint: '/items/item-b' });
    f.detectChanges();
    decide(true);
    await pending;
    expect(api.remove).not.toHaveBeenCalled();
    f.destroy();
  });
  it('uploads actual selected files and deletes using the loaded attachment version', async () => {
    const { api } = setup(),
      f = TestBed.createComponent(Attachments);
    f.componentRef.setInput('context', context);
    f.detectChanges();
    const file = new File(['file'], 'spec.txt', { type: 'text/plain' });
    f.componentInstance.upload({
      target: { files: [file], value: 'spec.txt' },
    } as unknown as Event);
    await Promise.resolve();
    expect(api.upload).toHaveBeenCalledWith('/items/item-a/attachments', file);
    await f.componentInstance.remove(page.data[0]);
    expect(api.remove).toHaveBeenCalledWith('/items/item-a/attachments', page.data[0]);
    f.destroy();
  });
});

describe('Collaboration uses common persistence', () => {
  it('uses common queued writes and preserves the versioned empty PATCH contract', async () => {
    const post = vi.fn(() => of({ data: { systemId: 'note-1', systemRowVersion: 1 } }));
    const patch = vi.fn(() => of(null));
    const remove = vi.fn(() => of(null));
    TestBed.configureTestingModule({
      providers: [
        { provide: SessionService, useValue: { Company: 'A', UserId: 'U', AccessToken: 'test' } },
        { provide: RestService, useValue: {} },
        { provide: DATA_REST_SERVICE, useValue: { post, patch, delete: remove } },
      ],
    });
    const api = TestBed.inject(RecordCollaborationService),
      source = TestBed.inject(DataSourceService);
    const create = vi.spyOn(source, 'create'),
      update = vi.spyOn(source, 'update'),
      del = vi.spyOn(source, 'delete');
    const entry = { ...page.data[0], systemRowVersion: 1 };
    await firstValueFrom(api.saveNote('/items/A/notes', 'New'));
    await firstValueFrom(api.saveNote('/items/A/notes', 'Changed', entry));
    await firstValueFrom(api.remove('/items/A/notes', entry));
    expect(create).toHaveBeenCalledOnce();
    expect(update).toHaveBeenCalledOnce();
    expect(del).toHaveBeenCalledOnce();
    expect(patch).toHaveBeenCalledWith('/items/A/notes/note-1', { body: 'Changed' }, '"1"');
    expect(remove).toHaveBeenCalledWith('/items/A/notes/note-1', '"1"');
  });
});
