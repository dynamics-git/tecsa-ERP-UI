import { Type } from '@angular/core';
import { Routes } from '@angular/router';
import { PageType, PageModule } from '../../platform/public-api';
import { featurePageModules } from '../../features/feature-pages.generated';
import { PageObjectDefinition, pageObjectDefinition } from '../../platform/models/object-definition.model';

type PageOpenTarget = 'list' | 'entry';
type PageTypeName = PageType;

type RegisteredPageConfig = {
  moduleRef: PageModule;
  pageType?: PageTypeName;
  object?: PageObjectDefinition;
};

const registeredPages = buildPageRegistry(featurePageModules);

export function buildPageRegistry(modules: PageModule[]): Map<string, RegisteredPageConfig> {
  const registry = new Map<string, RegisteredPageConfig>();
  const objectIds = new Set<number>();
  const objectNames = new Set<string>();

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
      const object = exportedValue['object'] === undefined ? undefined : pageObjectDefinition(exportedValue['object']);
      if (object) {
        const name = object.objectName.toLowerCase();
        if (objectIds.has(object.objectId) || objectNames.has(name)) throw new Error(`Duplicate Page Object: ${object.objectId}`);
        objectIds.add(object.objectId);
        objectNames.add(name);
      }
      registry.set(pageId, { moduleRef, pageType, object });
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

export function resolvePageModule(pageId: string): PageModule | undefined {
  return registeredPages.get(normalizePageId(pageId))?.moduleRef as PageModule | undefined;
}

/** Resolves through the same registry as menus, routes and RunModal. */
export function resolvePageObject(objectId: number): {pageId: string; moduleRef: PageModule; object: PageObjectDefinition} | undefined {
  for (const [pageId, entry] of registeredPages) {
    if (entry.object?.objectId === objectId) return {pageId, moduleRef: entry.moduleRef, object: entry.object};
  }
  return undefined;
}

export async function loadPageModule(pageId: string): Promise<PageModule | undefined> {
  return resolvePageModule(pageId);
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

export function getRegisteredPageIds(): string[] {
  return [...registeredPages.keys()].sort();
}

export function isPageIdRegistered(pageId: string): boolean {
  return registeredPages.has(normalizePageId(pageId));
}

/** Menus and direct URLs use the same discovered page declaration as RunModal. */
export function getFeaturePageRoutes(): Routes {
  return [...registeredPages.entries()].flatMap(([pageId, {moduleRef}]) => {
    const config = Object.values(moduleRef).find(value => isRecord(value) && value['pageId'] === pageId) as {menu?: {route?: string}} | undefined;
    const route = config?.menu?.route;
    if (!route) return [];
    const component = Object.entries(moduleRef).find(([name, value]) => name.endsWith('Page') && typeof value === 'function')![1] as Type<unknown>;
    return [{path: route.replace(/^\//, ''), component, data: {pageId}}];
  });
}
