import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';
import { providePlatformGovernance } from '../../../core/providers/platform-governance.provider';
import { SessionService } from '../../../core/services/session.service';
import {
  DATA_REST_SERVICE,
  ListPage,
  PageCommandEvent,
  RunModalLoadingService,
} from '../../../platform/public-api';
import {
  companiesHeaderConfig,
  companiesLineConfig,
  companiesListConfig,
} from './companies.config';

afterEach(() => TestBed.resetTestingModule());
describe('Companies worksheet shared UI integration', () => {
  it('creates on valid first input, autosaves individual fields, reopens persisted values and provides selected rows to business commands', async () => {
    const rows: Record<string, unknown>[] = [
      { systemId: 'existing', systemRowVersion: 1, code: 'OLD', name: 'Existing', isActive: true },
    ];
    const get = vi.fn((endpoint: string) =>
      of(
        endpoint.split('?')[0] === '/companies'
          ? { data: structuredClone(rows), meta: { total: rows.length } }
          : {
              data: structuredClone(
                rows.find((row) => endpoint.startsWith('/companies/' + row['systemId'])),
              ),
            },
      ),
    );
    const post = vi.fn((_endpoint: string, payload: Record<string, unknown>) => {
      const row = { ...payload, systemId: 'created', systemRowVersion: 1 };
      rows.push(row);
      return of({ data: structuredClone(row) });
    });
    const patch = vi.fn((endpoint: string, payload: Record<string, unknown>) => {
      const row = rows.find((row) => endpoint === '/companies/' + row['systemId'])!;
      Object.assign(row, payload, { systemRowVersion: Number(row['systemRowVersion']) + 1 });
      return of({ data: structuredClone(row) });
    });
    TestBed.configureTestingModule({
      imports: [ListPage],
      providers: [
        provideRouter([]),
        ...providePlatformGovernance(),
        { provide: DATA_REST_SERVICE, useValue: { get, post, patch, delete: vi.fn() } },
      ],
    });
    TestBed.inject(SessionService).SuperAdmin = true;
    TestBed.inject(SessionService).Company = 'working-company';
    async function mount(modal = false) {
      const f = TestBed.createComponent(ListPage);
      f.componentRef.setInput('documentOnly', modal);
      f.componentRef.setInput('listConfig', companiesListConfig);
      f.componentRef.setInput('headerConfig', companiesHeaderConfig);
      f.componentRef.setInput('lineConfig', companiesLineConfig);
      f.detectChanges();
      await f.whenStable();
      await vi.waitFor(() =>
        expect(TestBed.inject(RunModalLoadingService).isAnyLoading()).toBe(false),
      );
      f.detectChanges();
      return f;
    }
    const f = await mount();
    expect(post).not.toHaveBeenCalled();
    const row = f.nativeElement.querySelectorAll('tbody tr')[1] as HTMLElement;
    function edit(element: HTMLElement, label: string, value: string) {
      const input = element.querySelector<HTMLInputElement>(`input[aria-label="${label}"]`)!;
      input.value = value;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }
    edit(row, 'Code', 'NEW');
    await f.whenStable();
    expect(post).not.toHaveBeenCalled();
    edit(row, 'Name', 'New company');
    await f.whenStable();
    await vi.waitFor(() => expect(post).toHaveBeenCalledOnce());
    f.detectChanges();
    expect(post.mock.calls[0][1]).toMatchObject({ code: 'NEW', name: 'New company' });
    edit(row, 'Display name', 'New display');
    await f.whenStable();
    await vi.waitFor(() => expect(patch).toHaveBeenCalled());
    expect(patch.mock.calls.at(-1)?.[1]).toEqual({ displayName: 'New display' });
    await f.whenStable();
    f.destroy();
    const reopened = await mount();
    const savedRow = Array.from(
      reopened.nativeElement.querySelectorAll('tbody tr') as NodeListOf<HTMLElement>,
    ).find(
      (tr) => tr.querySelector<HTMLInputElement>('input[aria-label="Code"]')?.value === 'NEW',
    )!;
    expect(savedRow.querySelector<HTMLInputElement>('input[aria-label="Name"]')!.value).toBe(
      'New company',
    );
    expect(
      savedRow.querySelector<HTMLInputElement>('input[aria-label="Display name"]')!.value,
    ).toBe('New display');
    let command: PageCommandEvent | undefined;
    reopened.componentInstance.businessCommand.subscribe((event) => (command = event));
    savedRow.click();
    reopened.componentInstance.handleInlineAction({ actionKey: 'cmd:copy-company' });
    expect(command?.context.selectedRow).toMatchObject({ systemId: 'created', code: 'NEW' });
    const check = savedRow.querySelector<HTMLInputElement>('.row-check-col input')!;
    check.checked = true;
    check.dispatchEvent(new Event('change', { bubbles: true }));
    reopened.componentInstance.handleInlineAction({ actionKey: 'cmd:copy-company' });
    expect(command?.context.checkedRowKeys).toEqual(['created']);
    // The shell owns standard actions; RunModal assembles its own header toolbar.
    // Both use Core New/Delete, with Copy as the only business command.
    expect(companiesListConfig.standardActions?.delete).not.toBe(false);
    expect(
      companiesLineConfig.toolbarButtons?.some((button) => button.actionKey === 'cmd:line-new'),
    ).toBe(false);
    reopened.destroy();
    const modal = await mount(true);
    const buttons = Array.from(
      modal.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
    );
    const named = (label: string) =>
      buttons.filter((button) => button.textContent?.trim() === label);
    expect(named('New company')).toHaveLength(0);
    expect(named('New')).toHaveLength(1);
    expect(named('Delete')).toHaveLength(1);
    expect(named('Delete company')).toHaveLength(0);
    expect(named('Copy company')).toHaveLength(1);
    const rowCount = modal.nativeElement.querySelectorAll('tbody tr').length;
    named('New')[0].click();
    modal.detectChanges();
    await modal.whenStable();
    modal.detectChanges();
    expect(modal.nativeElement.querySelectorAll('tbody tr').length).toBe(rowCount + 1);
    expect(post).toHaveBeenCalledOnce();
    modal.destroy();
  });
});
