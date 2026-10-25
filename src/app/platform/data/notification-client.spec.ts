import { TestBed } from '@angular/core/testing';
import { describe, it, expect, vi } from 'vitest';
import { of, Subject } from 'rxjs';
import {
  NotificationClient,
  NOTIFICATION_TARGET_HANDLERS,
  InboxEntry,
} from './notification-client.service';
import { RestService } from '../../core/services/rest.service';
import { SessionService } from '../../core/services/session.service';
import { WorkspaceContext } from '../../core/services/workspace-context';
import { RunModalService } from '../run-modal/run-modal.service';
import { NotificationInbox } from '../../shared/ui/notification-inbox/notification-inbox';
import {
  notificationRulesHeaderConfig,
  notificationRulesListConfig,
} from '../../features/administration/notification-rules/notification-rules.config';
describe('Notification client shared contract', () => {
  function setup() {
    const session = { Company: 'company-a', UserId: 'u', AccessToken: 'token' };
    const get = vi.fn((_url: string) => of({ data: [], meta: { hasMore: false } }));
    const patch = vi.fn((_url: string, _body: unknown, _version?: string) =>
      of({ data: { readAt: '2026-10-26', systemRowVersion: 5 } }),
    );
    const open = vi.fn(async () => true);
    TestBed.configureTestingModule({
      providers: [
        { provide: SessionService, useValue: session },
        { provide: WorkspaceContext, useValue: { slug: 'fixture' } },
        { provide: RestService, useValue: { get, patch } },
        { provide: RunModalService, useValue: { open } },
        {
          provide: NOTIFICATION_TARGET_HANDLERS,
          multi: true,
          useValue: (target: any, record: any) =>
            target.resource === 'partnerTasks'
              ? { pageId: 'partner-tasks', headerData: record }
              : undefined,
        },
      ],
    });
    return { api: TestBed.inject(NotificationClient), session, get, patch, open };
  }
  const entry: InboxEntry = {
    systemId: 'n',
    systemRowVersion: 4,
    title: 'Title',
    message: 'Message',
    readAt: null,
    systemCreatedAt: '2026-10-26',
    eventKey: 'partner.task',
  };
  it('uses the current company and a bounded continuation without an exact-count request', async () => {
    const { api, get } = setup();
    await api.list('next', true);
    expect(get.mock.calls[0][0]).toBe('/companies/company-a/notifications?unread=1&cursor=next');
  });
  it('marks only a versioned owned notification and opens a partner-registered target', async () => {
    const { api, get, patch, open } = setup();
    const copy = { ...entry };
    await api.markRead(copy);
    expect(patch.mock.calls[0][2]).toBe('"4"');
    expect(copy.systemRowVersion).toBe(5);
    get.mockReturnValue(
      of({
        data: { systemId: 'record' },
        target: { resource: 'partnerTasks', parents: {} },
      }) as any,
    );
    await api.open(copy);
    expect(open).toHaveBeenCalledWith(
      expect.objectContaining({
        pageId: 'partner-tasks',
        context: { headerData: { systemId: 'record' } },
      }),
    );
  });
  it('rejects an old-company response and never treats it as current inbox data', async () => {
    const { api, get, session } = setup();
    const response = new Subject<unknown>();
    get.mockReturnValue(response as any);
    const request = api.list();
    session.Company = 'company-b';
    response.next({ data: [entry], meta: { hasMore: false } });
    await expect(request).rejects.toThrow('company or session changed');
  });
  it('uses existing list/card configuration and saves a rule as one coherent aggregate', () => {
    expect(notificationRulesListConfig.dataSource.endpoint).toBe('/notificationRules');
    expect(notificationRulesListConfig.autoSave).toBe(false);
    expect(
      notificationRulesHeaderConfig.toolbarButtons.some(
        (command) => command.actionKey === 'cmd:save',
      ),
    ).toBe(true);
    const fields = notificationRulesHeaderConfig.sections.flatMap((section) => section.fields);
    expect(fields.find((field) => field.key === 'eventKey')?.lookup?.endpoint).toBe(
      '/notificationEvents',
    );
    expect(
      fields.find((field) => field.key === 'channel')?.options?.map((option) => option.value),
    ).toEqual(['in_app']);
  });
  it('renders asynchronous inbox results and does not show them after a scope switch', async () => {
    const { api, session } = setup();
    vi.spyOn(api, 'list').mockResolvedValue({ data: [{ ...entry }], meta: { hasMore: false } });
    const f = TestBed.createComponent(NotificationInbox);
    f.detectChanges();
    await f.whenStable();
    f.detectChanges();
    expect(f.nativeElement.textContent).toContain('Title');
    session.Company = 'company-b';
    f.changeDetectorRef.markForCheck();
    f.detectChanges();
    expect(f.nativeElement.textContent).not.toContain('Title');
    f.destroy();
  });
});
