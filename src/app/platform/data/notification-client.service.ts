import { inject, Injectable, InjectionToken } from '@angular/core';
import { firstValueFrom, timeout } from 'rxjs';
import { RestService } from '../../core/services/rest.service';
import { SessionService } from '../../core/services/session.service';
import { WorkspaceContext } from '../../core/services/workspace-context';
import { RunModalService } from '../run-modal/run-modal.service';
import { RUNTIME_TIMEOUT_POLICY } from './runtime-timeout-policy.token';
export interface InboxEntry {
  systemId: string;
  systemRowVersion: number;
  title: string;
  message: string;
  readAt: string | null;
  systemCreatedAt: string;
  eventKey: string;
}
export interface NotificationTarget {
  resource: string;
  parents: Record<string, unknown>;
}
export type NotificationTargetResolver = (
  target: NotificationTarget,
  record: Record<string, unknown>,
) => { pageId: string; headerData: Record<string, unknown> } | undefined;
export const NOTIFICATION_TARGET_HANDLERS = new InjectionToken<NotificationTargetResolver[]>(
  'Notification target handlers',
);
export const NOTIFICATION_TARGET_RESOLVER = new InjectionToken<NotificationTargetResolver>(
  'Notification target resolver',
  { providedIn: 'root', factory: () => () => undefined },
);
@Injectable({ providedIn: 'root' })
export class NotificationClient {
  private readonly rest = inject(RestService);
  private readonly session = inject(SessionService);
  private readonly workspace = inject(WorkspaceContext);
  private readonly modal = inject(RunModalService);
  private readonly resolve = inject(NOTIFICATION_TARGET_RESOLVER);
  private readonly handlers = inject(NOTIFICATION_TARGET_HANDLERS, { optional: true }) ?? [];
  private readonly policy = inject(RUNTIME_TIMEOUT_POLICY);
  scope(): string {
    return JSON.stringify([
      this.workspace.slug,
      this.session.Company,
      this.session.UserId,
      this.session.AccessToken,
    ]);
  }
  private path(): string {
    if (!this.session.Company) throw new Error('Select a company.');
    return '/companies/' + encodeURIComponent(this.session.Company) + '/notifications';
  }
  private async read<T>(request: import('rxjs').Observable<unknown>): Promise<T> {
    const scope = this.scope();
    const response = await firstValueFrom(request.pipe(timeout(this.policy.requestTimeoutMs)));
    if (scope !== this.scope()) throw new Error('Your company or session changed.');
    return response as T;
  }
  list(
    cursor?: string,
    unread = false,
  ): Promise<{ data: InboxEntry[]; meta: { hasMore: boolean; nextCursor?: string } }> {
    return this.read(
      this.rest.get(
        this.path() +
          '?unread=' +
          (unread ? '1' : '0') +
          (cursor ? '&cursor=' + encodeURIComponent(cursor) : ''),
        { suppressGlobalErrorDialog: true },
      ),
    );
  }
  async markRead(entry: InboxEntry): Promise<void> {
    const result = await this.read<{ data: { readAt: string; systemRowVersion: number } }>(
      this.rest.patch(
        this.path() + '/' + entry.systemId + '/read',
        {},
        '"' + entry.systemRowVersion + '"',
        { suppressGlobalErrorDialog: true },
      ),
    );
    entry.readAt = result.data.readAt;
    entry.systemRowVersion = result.data.systemRowVersion;
  }
  async open(entry: InboxEntry): Promise<void> {
    const result = await this.read<{ data: Record<string, unknown>; target: NotificationTarget }>(
      this.rest.get(this.path() + '/' + entry.systemId + '/target', {
        suppressGlobalErrorDialog: true,
      }),
    );
    const target =
      this.handlers.map((handler) => handler(result.target, result.data)).find(Boolean) ??
      this.resolve(result.target, result.data);
    if (!target)
      throw new Error('No registered page is configured to open this notification target.');
    if (
      !(await this.modal.open({
        pageId: target.pageId,
        target: 'entry',
        context: { headerData: target.headerData },
        allowNested: true,
      }))
    )
      throw new Error(this.modal.getLastOpenFailureReason());
  }
}
