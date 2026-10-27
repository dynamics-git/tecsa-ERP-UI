import { Subscription, timer, switchMap } from 'rxjs';
import { LookupSelect } from '../lookup-select/lookup-select';
import { Component, HostListener, OnDestroy, inject, ViewChild } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RecordPanel } from './record-panel';
import { CollaborationEntry } from '../../../platform/data/record-collaboration.service';
import { ConfirmationService } from '../confirmation.service';
import { UnsavedChangesService } from '../../../platform/pages/unsaved-changes.service';

@Component({
  selector: 'app-notes',
  standalone: true,
  imports: [DatePipe,LookupSelect],
  templateUrl: './notes.html',
  styleUrl: './record-panel.scss',
})
export class Notes extends RecordPanel implements OnDestroy {
  readonly kind = 'notes' as const;
  private readonly confirmation = inject(ConfirmationService);
  private readonly unsaved = inject(UnsavedChangesService);
  private readonly drafts = new Map<string, { body: string; editing?: CollaborationEntry; mentions?:Array<{systemId:string;name:string}> }>();
  @ViewChild(LookupSelect) mentionControl?:LookupSelect;
  private typingMention=false;
  private mentionRange?: {start:number;end:number};
  private mentionEditor?: HTMLTextAreaElement;
  startMention(editor: HTMLTextAreaElement): void {
    if(this.busy)return;
    editor.focus();
    const start=editor.selectionStart, end=editor.selectionEnd;
    const prefix=this.draft.slice(0,start);
    const token=(prefix && !/\s$/u.test(prefix)?' ':'')+'@';
    editor.value=prefix+token+this.draft.slice(end);
    editor.setSelectionRange(start+token.length,start+token.length);
    this.changeDraft({target:editor} as unknown as Event);
  }
  openMentionChoices():void{this.searchMentions(this.typingMention?this.mentionQuery:'');}
  mentionKey(event:KeyboardEvent):void{if(this.typingMention&&this.mentionControl?.expanded)this.mentionControl.key(event);}
  mentionOptions:Array<{value:string;label:string}>=[];
  mentionLoading=false;mentionHasMore=false;mentionError='';mentionQuery='';private mentionSkip=0;private mentionRequest?:Subscription;
  get mentions():Array<{systemId:string;name:string}>{return this.drafts.get(this.currentKey)?.mentions ?? this.editing?.mentions ?? [];}
  searchMentions(query='',more=false):void{
    if(more && (this.mentionLoading || !this.mentionHasMore))return;
    if(!more){this.mentionSkip=0;this.mentionOptions=[];}this.mentionQuery=query;this.mentionLoading=true;this.mentionError='';this.mentionRequest?.unsubscribe();
    const current=this.captureContext();
    this.mentionRequest=(query?timer(250).pipe(switchMap(()=>this.api.mentionUsers(this.requestPath,query,this.mentionSkip))):this.api.mentionUsers(this.requestPath,query,this.mentionSkip)).subscribe({
      next:response=>{if(!current())return;const page=response as {data:Array<{systemId:string;name:string}>;meta:{hasMore:boolean;nextSkip:number}};this.mentionOptions=[...this.mentionOptions,...page.data.map(user=>({value:user.systemId,label:user.name}))];this.mentionHasMore=page.meta.hasMore;this.mentionSkip=page.meta.nextSkip;this.mentionLoading=false;this.cd.markForCheck();},
      error:()=>{if(!current())return;this.mentionLoading=false;this.mentionError='Unable to load eligible users.';this.cd.markForCheck();},
    });
  }
  addMention(id:unknown):void{
    const option=this.mentionOptions.find(option=>option.value===id);if(!option || this.mentions.some(user=>user.systemId===id))return;
    if(this.mentions.length>=20){this.mentionError='Mention at most 20 users in one note.';return;}
    const range=this.mentionRange ?? {start:this.draft.length,end:this.draft.length};
    const insertion=(!this.mentionRange && this.draft && !/\s$/u.test(this.draft)?' ':'')+'@'+option.label+' ';
    const body=this.draft.slice(0,range.start)+insertion+this.draft.slice(range.end);
    if(this.mentionEditor){this.mentionEditor.value=body;this.mentionEditor.setSelectionRange?.(range.start+insertion.length,range.start+insertion.length);}
    this.mentionRange=undefined;
    this.drafts.set(this.currentKey,{body,editing:this.editing,mentions:[...this.mentions,{systemId:option.value,name:option.label}]});this.typingMention=false;this.mentionQuery='';
  }
  removeMention(id:string):void{this.drafts.set(this.currentKey,{body:this.draft,editing:this.editing,mentions:this.mentions.filter(user=>user.systemId!==id)});}
  constructor() {
    super();
    this.registerEditor();
  }
  private registerEditor(): void {
    this.unsaved.register(
      this,
      {
        changed: () => this.hasDraft,
        saving: () => this.busy,
        discard: () => this.discardDrafts(),
      },
      this.context.unsavedScope,
    );
  }
  override ngOnChanges(): void {
    const oldKey=this.currentKey;super.ngOnChanges();
    if(oldKey!==this.currentKey){this.mentionRange=undefined;this.mentionEditor=undefined;this.typingMention=false;this.mentionQuery='';this.mentionControl?.close();this.mentionRequest?.unsubscribe();this.mentionOptions=[];this.mentionLoading=false;this.mentionError='';}
    this.registerEditor();
  }
  get hasDraft(): boolean {
    return [...this.drafts.values()].some((draft) =>
      draft.editing ? draft.body !== draft.editing.body || JSON.stringify(draft.mentions??[])!==JSON.stringify(draft.editing.mentions??[]) : !!draft.body.trim(),
    );
  }
  @HostListener('window:beforeunload', ['$event'])
  beforeUnload(event: BeforeUnloadEvent): void {
    if (this.hasDraft || this.busy) {
      event.preventDefault();
      event.returnValue = '';
    }
  }
  get draft(): string {
    return this.drafts.get(this.currentKey)?.body ?? '';
  }
  get editing(): CollaborationEntry | undefined {
    return this.drafts.get(this.currentKey)?.editing;
  }
  changeDraft(event: Event): void {
    this.drafts.set(this.currentKey, {
      body: (event.target as HTMLTextAreaElement).value,
      editing: this.editing,
      mentions: this.mentions,
    });
    const editor=event.target as HTMLTextAreaElement;
    const caret=editor.selectionStart ?? this.draft.length;
    const match=this.draft.slice(0,caret).match(/(?:^|\s)@([^\s@]*)$/u);
    this.mentionEditor=editor;
    this.mentionRange=match ? {start:caret-match[1].length-1,end:caret} : undefined;
    if(match&&this.mentionControl){
      this.typingMention=true;this.mentionQuery=match[1];
      if(!this.mentionControl.expanded)this.mentionControl.open();else this.searchMentions(match[1]);
      this.mentionControl.query=match[1];
    }else if(this.typingMention){this.typingMention=false;this.mentionControl?.close();}
  }
  async edit(entry: CollaborationEntry): Promise<void> {
    if (this.busy || !this.result?.capabilities.modify) return;
    const isCurrent = this.captureContext();
    const current = this.drafts.get(this.currentKey);
    const changed =
      current && (current.editing ? current.body !== current.editing.body : !!current.body.trim());
    if (
      changed &&
      !(await this.confirmation.confirm({
        title: 'Unsaved changes',
        message: 'Discard this draft and edit another note?',
      }))
    )
      return;
    if (isCurrent()) this.drafts.set(this.currentKey, { body: entry.body ?? '', editing: entry, mentions:entry.mentions??[] });
  }
  discardDrafts(): void {
    if (!this.busy) this.drafts.clear();
  }
  cancel(): void {
    if (!this.busy) this.drafts.delete(this.currentKey);
  }
  save(): void {
    const editing = this.editing;
    if (
      !this.draft.trim() ||
      !(editing ? this.result?.capabilities.modify : this.result?.capabilities.create)
    )
      return;
    void this.mutate(
      () => this.mentions.length || editing?.mentions?.length ? this.api.saveNote(this.requestPath, this.draft.trim(), editing,this.mentions.map(user=>user.systemId)) : this.api.saveNote(this.requestPath,this.draft.trim(),editing),
      () => this.drafts.delete(this.currentKey),
    );
  }
  async remove(entry: CollaborationEntry): Promise<void> {
    if (!this.result?.capabilities.delete || this.busy) return;
    const isCurrent = this.captureContext();
    if (
      (await this.confirmation.confirm({ title: 'Delete note', message: 'Delete this note?' })) &&
      isCurrent()
    )
      await this.mutate(() => this.api.remove(this.requestPath, entry));
  }
  override ngOnDestroy(): void {
    this.mentionRequest?.unsubscribe();
    this.unsaved.release(this);
    super.ngOnDestroy();
  }
}
