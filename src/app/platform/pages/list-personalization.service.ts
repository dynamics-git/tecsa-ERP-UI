import { Injectable, inject } from '@angular/core';
import { SessionService } from '../../core/services/session.service';
import { WorkspaceContext } from '../../core/services/workspace-context';

/** User/company/workspace-local preferences; never stores ERP records or grants permissions. */
@Injectable({ providedIn: 'root' })
export class ListPersonalizationService {
  private readonly session = inject(SessionService);
  private readonly workspace = inject(WorkspaceContext);

  read<T>(page: string, purpose: string, fallback: T): T {
    try {
      const raw = localStorage.getItem(this.key(page, purpose));
      return raw ? JSON.parse(raw) as T : fallback;
    } catch { return fallback; }
  }

  write(page: string, purpose: string, value: unknown): boolean {
    try { localStorage.setItem(this.key(page, purpose), JSON.stringify(value)); return true; }
    catch { return false; }
  }

  private key(page: string, purpose: string): string {
    return this.workspace.storageKey(`list:v1:${encodeURIComponent(this.session.UserId || this.session.Email || 'anonymous')}:${encodeURIComponent(this.session.Company)}:${encodeURIComponent(page)}:${purpose}`);
  }
}
