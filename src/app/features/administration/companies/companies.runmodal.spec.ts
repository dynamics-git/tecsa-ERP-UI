import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, expect, it, vi } from 'vitest';
import { of, Subject } from 'rxjs';
import { providePlatformGovernance } from '../../../core/providers/platform-governance.provider';
import { SessionService } from '../../../core/services/session.service';
import { shouldOpenFromMenuAsRunModal } from '../../../core/services/page-registry';
import { DATA_REST_SERVICE, RunModalService, RunModalHost } from '../../../platform/public-api';

afterEach(() => TestBed.resetTestingModule());

it('uses the shared stacked copy form and blocks dismissal only while the submitted copy is pending', async () => {
  const pending = new Subject<unknown>();
  const rest = {
    get: vi.fn(() => of({data:[{systemId:'source',systemRowVersion:1,code:'SOURCE',name:'Source'}]})),
    post: vi.fn(() => pending), patch: vi.fn(), delete: vi.fn(),
  };
  TestBed.configureTestingModule({imports:[RunModalHost],providers:[provideRouter([]),...providePlatformGovernance(),{provide:DATA_REST_SERVICE,useValue:rest}]});
  const session=TestBed.inject(SessionService);session.SuperAdmin=true;session.Company='working';
  const fixture=TestBed.createComponent(RunModalHost);fixture.detectChanges();
  await TestBed.inject(RunModalService).open({pageId:'companies',target:'entry'});
  async function settle(){fixture.detectChanges();await fixture.whenStable();fixture.detectChanges();}
  await settle();
  await vi.waitFor(()=>{fixture.detectChanges();expect(fixture.nativeElement.querySelector('input[aria-label="Code"]')?.value).toBe('SOURCE');});
  const button=(label:string)=>Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>).find(item=>item.textContent?.trim()===label)!;
  const row=fixture.nativeElement.querySelector('tbody tr') as HTMLElement;row.click();await settle();
  button('Copy company').click();await settle();
  const form=fixture.nativeElement.querySelector('app-confirmation-dialog');
  expect(form.textContent).toContain('Copy from: SOURCE — Source');
  expect(form.querySelector('.header-form.stacked')).toBeTruthy();
  expect(form.querySelectorAll('label')).toHaveLength(3);
  expect(fixture.nativeElement.textContent).not.toContain('Processing company operation');
  expect(fixture.nativeElement.textContent).not.toContain('Copying company…');
  expect(rest.post).not.toHaveBeenCalled();
  const inputs=form.querySelectorAll('input') as NodeListOf<HTMLInputElement>;
  for(const [index,value] of ['COPY','Copied company'].entries()){inputs[index].value=value;inputs[index].dispatchEvent(new Event('change',{bubbles:true}));}
  button('Create copy').click();await settle();
  await vi.waitFor(()=>{fixture.detectChanges();expect(rest.post).toHaveBeenCalledWith('/companies/source/copy',expect.objectContaining({code:'COPY',name:'Copied company'}));});
  const progress=fixture.nativeElement.querySelector('app-confirmation-dialog');
  expect(progress.textContent).toContain('Copying company…');
  expect(progress.querySelector('app-loading-indicator')).toBeTruthy();
  expect(progress.querySelectorAll('button')).toHaveLength(0);
  progress.querySelector('[role="dialog"]').dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
  const backdrops=fixture.nativeElement.querySelectorAll('.popup-backdrop');backdrops[backdrops.length-1].click();await settle();
  expect(fixture.nativeElement.textContent).toContain('Copying company…');
  const close=fixture.nativeElement.querySelector('app-companies button[title="Close"]') as HTMLButtonElement;
  close?.click();await settle();expect(fixture.nativeElement.querySelector('app-companies')).toBeTruthy();
  pending.next({data:{systemId:'copy',systemRowVersion:1,code:'COPY',name:'Copied company',copyWarnings:[{code:'AttachmentFileMissing',fileName:'missing.pdf'}]}});pending.complete();await settle();
  await vi.waitFor(()=>{fixture.detectChanges();expect(fixture.nativeElement.textContent).toContain('Company copied.');});
  expect(fixture.nativeElement.textContent).toContain('1 attachment(s) skipped because their source files are missing.');
  expect(fixture.nativeElement.textContent).not.toContain('Copying company…');
  fixture.destroy();
});

it.each([false, true])('updates an open worksheet from denied to allowed server access and uses shared deletion (SUPER=%s)', async superAdmin => {
  const rows = [
    { systemId: 'working', code: 'CURRENT', name: 'Current', systemRowVersion: 1 },
    { systemId: 'other', code: 'TEST', name: 'Test', systemRowVersion: 1 },
  ];
  const pendingDelete = new Subject<unknown>();
  const rest = {
    get: vi.fn(() => of({ data: rows })),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(() => pendingDelete),
  };
  TestBed.configureTestingModule({
    imports: [RunModalHost],
    providers: [
      provideRouter([]),
      ...providePlatformGovernance(),
      { provide: DATA_REST_SERVICE, useValue: rest },
    ],
  });
  const session = TestBed.inject(SessionService);
  session.SuperAdmin = superAdmin;
  session.Company = 'working';
  const grant = {apiPath:'/companies',pageId:'companies',canRead:true,canCreate:true,canUpdate:true,canExecute:true,canDelete:false};
  session.Permissions = [grant];
  const fixture = TestBed.createComponent(RunModalHost);
  fixture.detectChanges();
  expect(shouldOpenFromMenuAsRunModal('companies')).toBe(true);
  expect(await TestBed.inject(RunModalService).open({ pageId: 'companies', target: 'entry' })).toBe(
    true,
  );
  async function settle() {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }
  await settle();
  await vi.waitFor(() => {
    fixture.detectChanges();
    expect(
      Array.from(
        fixture.nativeElement.querySelectorAll(
          'input[aria-label="Code"]',
        ) as NodeListOf<HTMLInputElement>,
      ).some((input) => input.value === 'TEST'),
    ).toBe(true);
  });
  function button(label: string): HTMLButtonElement {
    const found = Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
    ).find((item) => item.textContent?.trim() === label);
    expect(found, `visible button ${label}`).toBeTruthy();
    return found!;
  }
  expect(button('Delete').disabled).toBe(true);
  expect(button('Delete').title).toBe('This operation is not available for your access.');
  button('Delete').click(); await settle();
  expect(fixture.nativeElement.textContent).not.toContain('Delete Confirmation');
  expect(rest.delete).not.toHaveBeenCalled();
  // Apply the current server context, not a page override or a SUPER bypass.
  session.Permissions = [{...grant,canDelete:true}];
  await vi.waitFor(()=>{fixture.detectChanges();expect(button('Delete').disabled).toBe(false);});
  const otherRow = Array.from(
    fixture.nativeElement.querySelectorAll('tbody tr') as NodeListOf<HTMLElement>,
  ).find(
    (row) =>
      row.textContent?.includes('TEST') ||
      row.querySelector<HTMLInputElement>('input[aria-label="Code"]')?.value === 'TEST',
  )!;
  expect(otherRow).toBeTruthy();
  otherRow.click();
  await settle();
  button('Delete').click();
  await settle();
  expect(fixture.nativeElement.textContent).toContain('Delete Confirmation');
  expect(rest.delete).not.toHaveBeenCalled();
  button('Cancel').click();
  await settle();
  expect(rest.delete).not.toHaveBeenCalled();
  await vi.waitFor(() => {
    fixture.detectChanges();
    expect(button('Delete').disabled).toBe(false);
  });
  button('Delete').click();
  await settle();
  button('OK').click();
  await settle();
  await vi.waitFor(() => {
    fixture.detectChanges();
    expect(rest.delete).toHaveBeenCalledWith('/companies/other', '"1"');
  });
  expect(fixture.nativeElement.textContent).toContain('Deleting lines');
  expect(button('Delete').disabled).toBe(true);
  pendingDelete.next(null);
  pendingDelete.complete();
  await settle();
  await vi.waitFor(() => {
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('Deleting lines');
  });
  fixture.destroy();
});
