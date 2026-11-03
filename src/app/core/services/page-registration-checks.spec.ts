import { EntityContractService } from '../../platform/data/entity-contract.service';
import { describe, expect, it } from 'vitest';
import { buildPageRegistry, getFeaturePageRoutes, resolvePageModule } from './page-registry';
import { featurePageModules } from '../../features/feature-pages.generated';
import { HeaderConfig, LineConfig, ListPageConfig } from '../../platform/public-api';

describe('One shared ERP page declaration pattern', () => {
  it('resolves every discovered page by ID and derives routes from its own menu config', () => {
    const routes = getFeaturePageRoutes();
    for (const module of featurePageModules) {
      const page = Object.values(module).find(value => value && typeof value === 'object' && 'pageId' in value) as ListPageConfig;
      expect(resolvePageModule(page.pageId!), page.pageId).toBe(module);
      if (page.menu?.route) {
        const route = routes.find(route => route.path === page.menu!.route!.replace(/^\//, ''));
        expect(route?.data?.['pageId'], page.pageId).toBe(page.pageId);
        expect(Object.values(module), page.pageId).toContain(route?.component);
      }
    }
  });
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
    expect(buildPageRegistry(featurePageModules).size).toBe(featurePageModules.length);
    for (const module of featurePageModules) {
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
        expect(lines.length, page.pageId).toBeLessThanOrEqual(1);
        if (lines.length) expect((lines[0][1] as LineConfig).columns.length, page.pageId).toBeGreaterThan(0);
        expect(page.dataSurface?.columns.length, page.pageId).toBeGreaterThan(0);
      } else if (page.pageType === 'document') {
        expect(header.sections.length, page.pageId).toBeGreaterThan(0);
        expect(lines, page.pageId).toHaveLength(1);
      } else if (page.pageType === 'worksheet') {
        expect(header.sections, page.pageId).toEqual([]);
        expect(lines, page.pageId).toHaveLength(1);
        expect((lines[0][1] as LineConfig).columns.length, page.pageId).toBeGreaterThan(0);
        expect(!!page.dataSource?.navigation || !!(page.dataSource?.headerPKProp && page.dataSource?.lineFKProp), page.pageId).toBe(true);
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
    for (const module of featurePageModules) {
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
  it('uses one lookup declaration and shared autosave defaults throughout discovered configs', () => {
    for (const module of featurePageModules) {
      const page = Object.values(module).find(value => value && typeof value === 'object' && 'pageId' in value) as ListPageConfig;
      const header = Object.entries(module).find(([name]) => name.endsWith('HeaderConfig'))?.[1] as HeaderConfig;
      const line = Object.entries(module).find(([name]) => name.endsWith('LineConfig'))?.[1] as LineConfig | undefined;
      const fields = [...header.sections.flatMap(section => section.fields), ...(line?.columns ?? [])];
      for (const field of fields) {
        if (!field.lookup) continue;
        for (const duplicate of ['api', 'optionsEndpoints', 'valueField', 'labelField', 'bindValue', 'bindLabel'] as const)
          expect((field as unknown as Record<string, unknown>)[duplicate], page.pageId + ': ' + ('key' in field ? field.key : field.id) + '.' + duplicate).toBeUndefined();
        expect(field.lookup.endpoint, page.pageId).toBeTruthy();
        expect(field.lookup.displayField, page.pageId).toBeTruthy();
      }
      const commands = [...(page.commands ?? []), ...header.toolbarButtons, ...(line?.toolbarButtons ?? [])];
      const manual = commands.some(command => /^(?:cmd:)?(?:save|apply)$/i.test(command.actionKey));
      if (!manual) expect(page.autoSave, page.pageId).not.toBe(true);
    }
  });

  it('requires a real component for a valid page instead of a config-only registration', () => {
    expect(() => buildPageRegistry([{ exampleListConfig: { pageId: 'example', pageType: 'worksheet' } }])).toThrow(
      'Page example must declare exactly one feature component.',
    );
    for (const module of featurePageModules) {
      expect(
        Object.entries(module).filter(([key, value]) => key.endsWith('Page') && typeof value === 'function'),
      ).toHaveLength(1);
    }
  });
});
