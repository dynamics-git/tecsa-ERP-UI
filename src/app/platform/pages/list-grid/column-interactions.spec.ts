import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SessionService } from '../../../core/services/session.service';
import { ColumnReorder } from '../../../shared/directives/column-reorder.directive';
import { ListPersonalizationService } from '../list-personalization.service';
import { ListGrid } from './list-grid';

const bounds = (left = 100, width = 100) =>
  ({
    left,
    right: left + width,
    top: 0,
    bottom: 300,
    width,
    height: 300,
    x: left,
    y: 0,
    toJSON: () => ({}),
  }) as DOMRect;

function send(target: EventTarget, type: string, x = 120, pointerId = 1) {
  const event = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    clientX: x,
    clientY: 20,
    detail: 1,
  });
  Object.defineProperties(event, {
    dataTransfer: { value: { effectAllowed: '', dropEffect: '', setData: vi.fn() } },
    pointerId: { value: pointerId },
  });
  target.dispatchEvent(event);
  return event;
}

function create(columnsEnabled = true) {
  TestBed.configureTestingModule({ imports: [ListGrid], providers: [provideRouter([])] });
  const session = TestBed.inject(SessionService);
  session.SuperAdmin = true;
  session.User = { systemId: 'column-user' };
  session.Company = 'column-company';
  const fixture = TestBed.createComponent(ListGrid);
  fixture.componentRef.setInput('config', {
    pageId: 'column-interactions',
    title: 'Fixtures',
    factBox: { enabled: false },
    tools: { columns: columnsEnabled },
    dataSource: { endpoint: '/fixtures', keyField: 'id' },
    dataSurface: {
      columns: [
        { field: 'code', label: 'Code', width: '120px' },
        { field: 'name', label: 'Name', width: '180px' },
        { field: 'status', label: 'Status', width: '140px', sortable: false },
      ],
    },
  });
  fixture.componentRef.setInput('data', [
    { id: 'record-1', code: 'A', name: 'First', status: 'Open' },
  ]);
  fixture.detectChanges();
  const scroll = fixture.nativeElement.querySelector('.grid-scroll') as HTMLElement;
  vi.spyOn(scroll, 'getBoundingClientRect').mockReturnValue(bounds(0, 1000));
  const header = (key: string) => {
    const element = fixture.nativeElement.querySelector(
      `th[data-column-key="${key}"]`,
    ) as HTMLElement;
    vi.spyOn(element, 'getBoundingClientRect').mockReturnValue(bounds());
    return element;
  };
  const keys = () => fixture.componentInstance.columns.map((column) => column.field);
  return { fixture, grid: fixture.componentInstance, header, keys, scroll };
}

afterEach(() => {
  TestBed.resetTestingModule();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe('Column directives connected to the shared list grid', () => {
  it('moves the whole column, preserves selection and restores the saved order', () => {
    const { fixture, grid, header, keys } = create();
    const command = vi.fn();
    grid.command.subscribe(command);
    grid.selectedNos = new Set(['record-1']);
    const source = header('name'),
      target = header('code');
    const start = send(source, 'dragstart');
    expect((start as unknown as DragEvent).dataTransfer!.setData).toHaveBeenCalledExactlyOnceWith(
      'application/x-column-key', 'name',
    );
    send(target, 'dragover');
    expect(source.style.opacity).toBe('0.6');
    expect(target.style.boxShadow).toContain('3px');
    send(target, 'drop');
    fixture.detectChanges();
    expect(keys()).toEqual(['name', 'code', 'status']);
    const cells = [...fixture.nativeElement.querySelectorAll('tr[data-record-row] td')].slice(
      2,
    ) as HTMLElement[];
    expect(cells.map((cell) => cell.textContent!.trim())).toEqual(['First', 'A', 'Open']);
    expect(grid.selectedNos).toEqual(new Set(['record-1']));
    expect(command).not.toHaveBeenCalled();
    expect(source.style.opacity).toBe('');
    expect(target.style.boxShadow).toBe('');
    fixture.destroy();
    TestBed.resetTestingModule();
    const reopened = create();
    expect(reopened.keys()).toEqual(['name', 'code', 'status']);
    reopened.fixture.destroy();
  });

  it('drops after an unsortable column and keeps fixed selection headers out of dragging', () => {
    const { fixture, header, keys } = create();
    const fixed = [...fixture.nativeElement.querySelectorAll('thead th')].slice(
      0,
      2,
    ) as HTMLElement[];
    expect(fixed.every((element) => !element.draggable)).toBe(true);
    const target = header('status');
    expect((target.querySelector('button') as HTMLButtonElement).disabled).toBe(true);
    send(header('code'), 'dragstart');
    send(target, 'drop', 180);
    fixture.detectChanges();
    expect(keys()).toEqual(['name', 'status', 'code']);
    fixture.destroy();
  });

  it('does not save a cancelled or no-op move, and ignores external drags', () => {
    const { fixture, header, keys } = create();
    const write = vi.spyOn(TestBed.inject(ListPersonalizationService), 'write');
    send(header('code'), 'dragstart');
    send(header('name'), 'dragover');
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    send(header('name'), 'drop');
    send(header('code'), 'dragstart');
    send(header('code'), 'drop');
    const external = send(header('name'), 'dragover');
    send(header('name'), 'drop');
    expect(external.defaultPrevented).toBe(false);
    expect(keys()).toEqual(['code', 'name', 'status']);
    expect(write).not.toHaveBeenCalled();
    fixture.destroy();
  });

  it('keeps sort clicks separate from dragging, including keyboard activation', () => {
    const { fixture, grid, header } = create();
    const command = vi.fn();
    grid.command.subscribe(command);
    const source = header('code');
    send(source, 'dragstart');
    send(header('name'), 'drop', 180);
    const button = source.querySelector('button')!;
    send(button, 'click');
    expect(command).not.toHaveBeenCalled();
    send(button, 'pointerdown');
    send(button, 'click');
    expect(command).toHaveBeenCalledExactlyOnceWith({
      actionKey: 'sortChanged',
      payload: { sort: 'code asc' },
    });
    send(source, 'dragstart');
    window.dispatchEvent(new Event('dragend'));
    button.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 0 }));
    expect(command).toHaveBeenCalledTimes(2);
    fixture.destroy();
  });

  it('moves within a frozen area without changing which columns are frozen', () => {
    const { fixture, grid, header, keys } = create();
    grid.freezeThrough(grid.columns[1]);
    fixture.changeDetectorRef.markForCheck();
    fixture.detectChanges();
    send(header('code'), 'dragstart');
    send(header('status'), 'drop', 180);
    expect(keys()).toEqual(['code', 'name', 'status']);
    send(header('name'), 'dragstart');
    send(header('code'), 'drop');
    fixture.detectChanges();
    expect(keys()).toEqual(['name', 'code', 'status']);
    expect(grid.frozenThrough).toBe('code');
    expect(grid.columns.map((column) => grid.isFrozen(column))).toEqual([true, true, false]);
    fixture.destroy();
  });

  it('resizes through the directive, bounds widths and persists only at the end', () => {
    const { fixture, grid, header } = create();
    const write = vi.spyOn(TestBed.inject(ListPersonalizationService), 'write');
    const handle = header('name').querySelector('.column-resizer') as HTMLElement;
    send(handle, 'pointerdown', 200);
    expect(send(handle, 'dragstart').defaultPrevented).toBe(true);
    send(window, 'pointermove', 250, 2);
    expect(grid.columnWidthNumber(grid.columns[1])).toBe(180);
    send(window, 'pointermove', 250);
    expect(grid.columnWidthNumber(grid.columns[1])).toBe(230);
    expect(write).not.toHaveBeenCalled();
    send(window, 'pointerup', 250);
    expect(write).toHaveBeenCalledOnce();
    fixture.detectChanges();
    handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(grid.columnWidthNumber(grid.columns[1])).toBe(246);
    fixture.detectChanges();
    send(handle, 'pointerdown', 200);
    send(window, 'pointermove', 2000);
    send(window, 'pointercancel', 2000);
    expect(grid.columnWidthNumber(grid.columns[1])).toBe(800);
    fixture.detectChanges();
    expect(handle.getAttribute('aria-valuenow')).toBe('800');
    const fit = vi.spyOn(grid, 'autoFitColumn').mockImplementation(() => {});
    send(handle, 'dblclick');
    expect(fit).toHaveBeenCalledOnce();
    fixture.destroy();
  });

  it('does not allow dragging when column controls are disabled', () => {
    const { fixture, header, keys } = create(false);
    expect(header('code').draggable).toBe(false);
    expect(send(header('code'), 'dragstart').defaultPrevented).toBe(true);
    send(header('name'), 'drop');
    expect(keys()).toEqual(['code', 'name', 'status']);
    fixture.destroy();
  });

  it('auto-scrolls horizontally at the edge and cancels its frame on teardown', () => {
    const { fixture, header, scroll } = create();
    const directive = fixture.debugElement.query(By.directive(ColumnReorder)).injector.get(ColumnReorder);
    send(header('code'), 'dragstart');
    const callbacks = new Map<number, FrameRequestCallback>();
    let next = 0;
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn((callback: FrameRequestCallback) => {
        callbacks.set(++next, callback);
        return next;
      }),
    );
    const cancel = vi.fn();
    vi.stubGlobal('cancelAnimationFrame', cancel);
    vi.mocked(scroll.getBoundingClientRect).mockReturnValue(bounds(0, 300));
    Object.defineProperties(scroll, { scrollWidth: { value: 900 }, clientWidth: { value: 300 } });
    const original = Object.getOwnPropertyDescriptor(document, 'elementFromPoint');
    Object.defineProperty(document, 'elementFromPoint', {
      configurable: true,
      value: () => header('name'),
    });
    try {
      directive.track(new MouseEvent('dragover', { clientX: 295, clientY: 20 }) as DragEvent);
      callbacks.get(1)!(0);
      expect(scroll.scrollLeft).toBe(16);
      expect(header('name').style.boxShadow).toContain('-3px');
      fixture.destroy();
      expect(cancel).toHaveBeenCalledWith(2);
      callbacks.get(2)!(0);
      expect(requestAnimationFrame).toHaveBeenCalledTimes(2);
    } finally {
      if (original) Object.defineProperty(document, 'elementFromPoint', original);
      else Reflect.deleteProperty(document, 'elementFromPoint');
    }
  });
});
