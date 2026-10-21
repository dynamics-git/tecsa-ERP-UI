import { Injectable } from '@angular/core';
import { ConfirmationService } from '../../shared/ui/confirmation.service';
export interface EditSession { changed():boolean; saving():boolean; }
/** Every shared document registers once; feature wrappers need no navigation code. */
@Injectable({providedIn:'root'})
export class UnsavedChangesService {
 private readonly editors = new Map<object,EditSession>();
 private decision?:Promise<boolean>;
 constructor(private readonly confirmation:ConfirmationService) {}
 register(owner:object,session:EditSession):void {this.editors.set(owner,session);}
 release(owner:object):void {this.editors.delete(owner);}
 async canLeave():Promise<boolean> {
  if ([...this.editors.values()].some(editor=>editor.saving())) return false;
  if (![...this.editors.values()].some(editor=>editor.changed())) return true;
  if (!this.decision) this.decision=this.confirmation.confirm({title:'Unsaved changes',message:'Discard unsaved changes and leave this page?'}).finally(()=>this.decision=undefined);
  return this.decision;
 }
}
