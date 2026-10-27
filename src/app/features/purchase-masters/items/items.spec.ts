import { By } from '@angular/platform-browser';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { firstValueFrom, of } from 'rxjs';
import { ItemsPage, itemsListConfig } from './items';
import { itemsHeaderConfig } from './items.config';
import { DATA_REST_SERVICE, ListPage, RunModalStackService } from '../../../platform/public-api';
import { providePlatformGovernance } from '../../../core/providers/platform-governance.provider';
import { SessionService } from '../../../core/services/session.service';
import { headerDataSourceDefaults, listColumns } from '../../../platform/public-api';

describe('Items list and configured card use one shared controller', () => {
  it('derives write fields from the card and keeps the business number out of updates', () => {
    const source = headerDataSourceDefaults(itemsListConfig.dataSource, itemsHeaderConfig);
    expect(source.createFields).toContain('number');
    expect(source.updateFields).not.toContain('number');
    expect(source.updateFields).toContain('description');
    expect(source.updateFields).toContain('baseUnitOfMeasureId');
    expect(source.requiredCreateFields).toEqual(['description', 'baseUnitOfMeasureId']);
    expect(source.keyField).toBe('systemId');
    expect(source.supportsDelete).not.toBe(false);
    expect(itemsListConfig.dataSource.createFields).toBeUndefined();
    expect(itemsListConfig.dataSource.updateFields).toBeUndefined();
  });

  it('keeps other declared fields available as hidden columns without feature-level flag blocks', () => {
    const columns = itemsListConfig.dataSurface!.columns;
    expect(columns.find((column) => column.field === 'standardCost')).toMatchObject({ hidden: true, type: 'decimal' });
    expect(columns.find((column) => column.field === 'blocked')?.type).toBe('boolean');
    expect(columns.find((column) => column.field === 'systemModifiedAt')).toMatchObject({
      label: 'Modified at',
      type: 'datetime',
    });
    for (const column of columns) {
      expect(column.sortable).not.toBe(false);
      expect(column.filterable).not.toBe(false);
      expect(column.searchable).not.toBe(false);
    }
  });

  it('uses declared UI field types, enum options and systemId lookups for list filters', () => {
    const columns = listColumns(itemsHeaderConfig, ['number', 'itemType', 'baseUnitOfMeasureId']);
    expect(columns[0]).toMatchObject({ field: 'number', label: 'No.', type: 'code', isPrimary: true });
    expect(columns[1].filter?.options).toEqual(
      itemsHeaderConfig.sections[0].fields.find((field) => field.key === 'itemType')?.options,
    );
    expect(columns[2].filter).toMatchObject({ apiUrl: '/unitsOfMeasure', valueField: 'systemId', labelField: 'code' });
    expect(() => listColumns(itemsHeaderConfig, ['undeclaredField'])).toThrow('Declare the list field');
  });

  const item = {
    systemId: '11111111-1111-4111-8111-111111111111',
    number: 'ITEM-001',
    description: 'Office paper',
    systemRowVersion: 1,
  };
  let get: ReturnType<typeof vi.fn>;
  let write: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    get = vi.fn((url: string) =>
      of(
        url.split('?')[0] === '/items/' + item.systemId
          ? { data: { ...item } }
          : { data: [{ ...item }], meta: { total: 1 } },
      ),
    );
    write = vi.fn(() => of({}));
    TestBed.configureTestingModule({
      imports: [ItemsPage],
      providers: [
        provideRouter([]),
        ...providePlatformGovernance(),
        { provide: DATA_REST_SERVICE, useValue: { get, post: write, patch: write, put: write, delete: write } },
      ],
    });
    TestBed.inject(SessionService).SuperAdmin = true;
  });

  it('renders ListPage directly with the list declaration from the component TS', async () => {
    const fixture = TestBed.createComponent(ItemsPage);
    fixture.detectChanges();
    await fixture.whenStable();
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(fixture.debugElement.query(By.directive(ListPage)).componentInstance.loading).toBe(false);
    });
    expect(fixture.debugElement.query(By.directive(ListPage)).componentInstance).toBeInstanceOf(ListPage);
    expect(fixture.componentInstance.listConfig.pageId).toBe(itemsListConfig.pageId);
    expect(fixture.componentInstance.headerConfig).toBe(itemsHeaderConfig);
    expect(fixture.nativeElement.querySelector('app-list-page')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('app-document-page')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('ITEM-001');
    expect(get).toHaveBeenCalled();
    expect(write).not.toHaveBeenCalled();
    fixture.destroy();
  });

  it('opens the configured card from the actual list button without creating a second save path', async () => {
    const fixture = TestBed.createComponent(ItemsPage);
    fixture.detectChanges();
    await fixture.whenStable();
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(fixture.debugElement.query(By.directive(ListPage)).componentInstance.loading).toBe(false);
    });
    const primary = Array.from(fixture.nativeElement.querySelectorAll('button')).find(
      (button) => (button as HTMLButtonElement).textContent?.trim() === 'ITEM-001',
    ) as HTMLButtonElement;
    expect(primary).toBeDefined();
    primary.click();
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('app-document-window')).not.toBeNull();
    });
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-dynamic-form')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('app-document-lines')).toBeNull();
    expect(fixture.nativeElement.querySelectorAll('app-document-window app-fact-box')).toHaveLength(1);
    expect(fixture.nativeElement.querySelectorAll('app-fact-box')).toHaveLength(2);
    expect(await firstValueFrom(TestBed.inject(RunModalStackService).stack$)).toHaveLength(1);
    expect(write).not.toHaveBeenCalled();
    fixture.destroy();
  });
  it('applies server query capabilities without per-column feature flags', () => {
    TestBed.inject(SessionService).Permissions = [
      {
        pageId: 'items',
        canRead: true,
        canCreate: true,
        canUpdate: true,
        canDelete: true,
        query: { fields: ['systemId', 'number', 'description'], search: ['description'] },
      },
    ];
    const fixture = TestBed.createComponent(ItemsPage);
    fixture.detectChanges();
    const runtime = fixture.debugElement.query(By.directive(ListPage)).componentInstance as ListPage;
    const columns = runtime.listConfig.dataSurface!.columns;
    expect(columns.find((column) => column.field === 'number')).toMatchObject({ sortable: true, searchable: false });
    expect(columns.find((column) => column.field === 'description')).toMatchObject({
      filterable: true,
      searchable: true,
    });
    expect(columns.find((column) => column.field === 'unitCost')).toMatchObject({ sortable: false, filterable: false });
    fixture.destroy();
  });
});
