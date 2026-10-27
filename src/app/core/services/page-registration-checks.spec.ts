import { EntityContractService } from '../../platform/data/entity-contract.service';
import { describe, expect, it } from 'vitest';
import { buildPageRegistry } from './run-modal-config-registry';
import { runModalPageModules } from '../../features/run-modal-page-modules';
import { HeaderConfig, LineConfig, ListPageConfig } from '../../platform/public-api';

describe('One shared ERP page declaration pattern', () => {
  it('rejects duplicate IDs instead of silently replacing a page', () => {
    const first = { firstListConfig: { pageId: 'items', pageType: 'card' } };
    const second = { secondListConfig: { pageId: ' ITEMS ', pageType: 'card' } };
    expect(() => buildPageRegistry([first, second])).toThrow('Duplicate pageId: items');
  });

  it('rejects missing or unknown page types', () => {
    for (const pageType of [undefined, 'cards', 'custom']) {
      expect(() => buildPageRegistry([{ exampleListConfig: { pageId: 'example', pageType } }])).toThrow(
        'Invalid pageType for example',
      );
    }
  });

  it('rejects multiple page definitions in one module because entry assembly uses one header and line config', () => {
    expect(() =>
      buildPageRegistry([
        {
          firstListConfig: { pageId: 'first', pageType: 'card' },
          secondListConfig: { pageId: 'second', pageType: 'card' },
        },
      ]),
    ).toThrow('Each config module must declare exactly one page');
  });

  it('checks every registered master, setup, document and related worksheet against the same contracts', () => {
    expect(buildPageRegistry(runModalPageModules).size).toBe(42);
    for (const module of runModalPageModules) {
      const declarations = Object.entries(module).filter(
        ([, value]) => value && typeof value === 'object' && 'pageId' in value,
      );
      expect(declarations).toHaveLength(1);
      const [name, value] = declarations[0];
      const page = value as ListPageConfig;
      expect(name, page.pageId).toMatch(/ListConfig$/);
      const headers = Object.entries(module).filter(([key]) => key.endsWith('HeaderConfig'));
      const lines = Object.entries(module).filter(([key]) => key.endsWith('LineConfig'));
      expect(headers, page.pageId).toHaveLength(1);
      const header = headers[0][1] as HeaderConfig;
      expect(page.dataSource?.endpoint, page.pageId).toBeTruthy();
      if (page.pageType === 'card') {
        expect(header.sections.length, page.pageId).toBeGreaterThan(0);
        expect(lines, page.pageId).toHaveLength(0);
        expect(page.dataSurface?.columns.length, page.pageId).toBeGreaterThan(0);
      } else if (page.pageType === 'document') {
        expect(header.sections.length, page.pageId).toBeGreaterThan(0);
        expect(lines, page.pageId).toHaveLength(1);
      } else if (page.pageType === 'worksheet') {
        expect(header.sections, page.pageId).toEqual([]);
        expect(lines, page.pageId).toHaveLength(1);
        expect((lines[0][1] as LineConfig).columns.length, page.pageId).toBeGreaterThan(0);
        expect(page.dataSource?.navigation, page.pageId).toBeDefined();
        expect(page.menu, page.pageId).toBeUndefined();
      } else if (page.pageType === 'setup') {
        expect(page.dataSource?.singleton, page.pageId).toBe(true);
        expect(header.sections.length, page.pageId).toBeGreaterThan(0);
        expect(lines, page.pageId).toHaveLength(0);
      }
    }
  });
  it('preserves discoverable page, permission mapping, field and action identities across shared defaults', () => {
    const contracts = new EntityContractService();
    for (const module of runModalPageModules) {
      const page = Object.values(module).find(value => value && typeof value === 'object' && 'pageId' in value) as ListPageConfig;
      const header = Object.entries(module).find(([key]) => key.endsWith('HeaderConfig'))![1] as HeaderConfig;
      const line = Object.entries(module).find(([key]) => key.endsWith('LineConfig'))?.[1] as LineConfig | undefined;
      const keys = header.sections.flatMap(section => section.fields.map(field => field.key));
      expect(keys.every(key => typeof key === 'string' && key.trim().length > 0)).toBe(true);
      expect(new Set(keys).size).toBe(keys.length);
      expect(header.sections.flatMap(section => section.fields.map(field => contracts.resolveField(page.dataSource!, field).key))).toEqual(keys);
      for (const column of line?.columns ?? []) expect(column.field ?? column.id).toBeTruthy();
      for (const column of page.dataSurface?.columns ?? []) expect(column.field ?? column.id).toBeTruthy();
      for (const action of [...(page.commands ?? []), ...(header.toolbarButtons ?? []), ...(line?.toolbarButtons ?? [])]) expect(action.actionKey).toBeTruthy();
      if (page.permissionPageId !== undefined) expect(page.permissionPageId.trim()).not.toBe('');
      expect(contracts.resolveSource(page.dataSource!)).toEqual(page.dataSource);
    }
  });
  it('requires a real component for a valid page instead of a config-only registration', () => {
    expect(() => buildPageRegistry([{ exampleListConfig: { pageId: 'example', pageType: 'worksheet' } }])).toThrow(
      'Page example must declare exactly one feature component.',
    );
    for (const module of runModalPageModules) {
      expect(
        Object.entries(module).filter(([key, value]) => key.endsWith('Page') && typeof value === 'function'),
      ).toHaveLength(1);
    }
  });
});
