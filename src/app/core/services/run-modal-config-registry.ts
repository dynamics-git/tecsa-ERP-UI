import { PageType, RunModalConfigModule } from '../../platform/public-api';
import { runModalPageModules } from '../../features/run-modal-page-modules';

type PageOpenTarget = 'list' | 'entry';
type PageTypeName = PageType;

type RegisteredPageConfig = {
  moduleRef: RunModalConfigModule;
  pageType?: PageTypeName;
};

const registeredPages = buildPageRegistry(runModalPageModules);

export function buildPageRegistry(modules: RunModalConfigModule[]): Map<string, RegisteredPageConfig> {
  const registry = new Map<string, RegisteredPageConfig>();

  for (const moduleRef of modules) {
    let declaredPages = 0;
    for (const exportedValue of Object.values(moduleRef)) {
      if (!isRecord(exportedValue)) {
        continue;
      }

      const pageId = toText(exportedValue['pageId']).trim().toLowerCase();
      if (!pageId) {
        continue;
      }

      const pageType = normalizePageType(exportedValue['pageType']);
      if (!pageType) throw new Error(`Invalid pageType for ${pageId}`);
      if (++declaredPages > 1) throw new Error('Each config module must declare exactly one page');
      if (registry.has(pageId)) throw new Error(`Duplicate pageId: ${pageId}`);
      registry.set(pageId, { moduleRef, pageType });
    }
    if (!declaredPages) throw new Error('Each config module must declare exactly one page');
  }

  for (const [pageId, entry] of registry) {
    const components = Object.entries(entry.moduleRef).filter(
      ([name, value]) => name.endsWith('Page') && typeof value === 'function',
    );
    if (components.length !== 1) throw new Error('Page ' + pageId + ' must declare exactly one feature component.');
  }
  return registry;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function toText(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function normalizePageId(pageId: string): string {
  return pageId.trim().toLowerCase();
}

function normalizePageType(value: unknown): PageTypeName | undefined {
  const pageType = toText(value).trim().toLowerCase();
  if (
    pageType === 'list' ||
    pageType === 'card' ||
    pageType === 'document' ||
    pageType === 'worksheet' ||
    pageType === 'setup'
  ) {
    return pageType;
  }

  return undefined;
}

export function resolveRunModalConfigModule(pageId: string): RunModalConfigModule | undefined {
  return registeredPages.get(normalizePageId(pageId))?.moduleRef as RunModalConfigModule | undefined;
}

export async function loadRunModalConfigModule(pageId: string): Promise<RunModalConfigModule | undefined> {
  return resolveRunModalConfigModule(pageId);
}

export function resolvePageType(pageId: string): PageTypeName | undefined {
  return registeredPages.get(normalizePageId(pageId))?.pageType;
}

export function shouldOpenFromMenuAsRunModal(pageId: string): boolean {
  const pageType = resolvePageType(pageId);
  return pageType === 'setup' || pageType === 'worksheet';
}

export function resolveRunModalOpenTarget(pageId: string): PageOpenTarget {
  const pageType = resolvePageType(pageId);
  if (pageType === 'setup' || pageType === 'worksheet') {
    return 'entry';
  }

  return 'list';
}

export function getRegisteredRunModalPageIds(): string[] {
  return [...registeredPages.keys()].sort();
}

export function isPageIdRegistered(pageId: string): boolean {
  return registeredPages.has(normalizePageId(pageId));
}
