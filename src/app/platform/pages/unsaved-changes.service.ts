import { Injectable } from '@angular/core';
import { ConfirmationService } from '../../shared/ui/confirmation.service';
export interface EditSession {
  changed(): boolean;
  saving(): boolean;
  discard?(): void;
}
/** Shared edit registration for documents and trusted SDK parts. A scope isolates one host. */
@Injectable({ providedIn: 'root' })
export class UnsavedChangesService {
  private readonly editors = new Map<object, { session: EditSession; scope?: object }>();
  private decision?: Promise<boolean>;
  constructor(private readonly confirmation: ConfirmationService) {}
  register(owner: object, session: EditSession, scope?: object): void {
    this.editors.set(owner, { session, scope });
  }
  release(owner: object): void {
    this.editors.delete(owner);
  }
  private sessions(owners?: readonly object[], scope?: object): EditSession[] {
    return [...this.editors.entries()]
      .filter(
        ([owner, registration]) =>
          (owners === undefined && scope === undefined) ||
          owners?.includes(owner) ||
          (scope !== undefined && registration.scope === scope),
      )
      .map(([, registration]) => registration.session);
  }
  async canLeave(owners?: readonly object[], scope?: object): Promise<boolean> {
    const editors = this.sessions(owners, scope);
    if (editors.some((editor) => editor.saving())) return false;
    if (!editors.some((editor) => editor.changed())) return true;
    if (!this.decision)
      this.decision = this.confirmation
        .confirm({
          title: 'Unsaved changes',
          message: 'Discard unsaved changes and leave this page?',
        })
        .finally(() => (this.decision = undefined));
    return this.decision;
  }
  discard(owners?: readonly object[], scope?: object): void {
    for (const editor of this.sessions(owners, scope))
      if (editor.changed() && !editor.saving()) editor.discard?.();
  }
}
