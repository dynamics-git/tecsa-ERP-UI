import { Inject, Injectable, Optional } from '@angular/core';
import { DataSourceService } from '../data/data-source.service';
import { RuntimeValueMapperService } from '../data/runtime-value-mapper.service';
import {
  RUN_MODAL_CONFIG_RESOLVER,
  PageModule,
  RunModalConfigResolver,
  RunModalContext,
} from './run-modal-config.token';

// The registry validates that the resolved module actually declares the requested page.
// Missing/failed registrations must not mutate any RunModal stack state.
export interface RunModalPageDefinition {
  pageId: string;
  module: PageModule;
}

@Injectable({ providedIn: 'root' })
export class RunModalPageDefinitionResolverService {
  constructor(
    @Inject(RUN_MODAL_CONFIG_RESOLVER)
    private readonly configResolver: RunModalConfigResolver,
    private readonly valueMapper: RuntimeValueMapperService,
    @Optional() private readonly data?: DataSourceService,
  ) {}

  async resolve(pageId: string, context?: RunModalContext): Promise<RunModalPageDefinition | undefined> {
    const normalized = pageId.trim().toLowerCase();
    if (!normalized) {
      return undefined;
    }

    let module = await this.loadPageModule(normalized, context);
    if (!module) {
      return undefined;
    }

    if (!this.moduleDeclaresPageId(module, normalized)) {
      return undefined;
    }
    try { if (this.data) module = await this.data.preparePageModule(module); }
    catch { return undefined; }

    return {
      pageId: normalized,
      module,
    };
  }

  private async loadPageModule(
    pageId: string,
    context?: RunModalContext,
  ): Promise<PageModule | undefined> {
    const normalized = pageId.trim().toLowerCase();
    if (!normalized.length) {
      return undefined;
    }

    try {
      const resolved = context ? await this.configResolver(normalized, context) : await this.configResolver(normalized);
      if (resolved && this.moduleDeclaresPageId(resolved, normalized)) {
        return resolved;
      }
    } catch {
      return undefined;
    }

    return undefined;
  }

  private moduleDeclaresPageId(module: PageModule, normalizedPageId: string): boolean {
    const bucket = this.valueMapper.isRecord(module) ? module : undefined;
    if (!bucket) {
      return false;
    }

    for (const exportedValue of Object.values(bucket)) {
      const record = this.valueMapper.isRecord(exportedValue) ? exportedValue : undefined;
      if (!record) {
        continue;
      }

      const declaredPageId = this.valueMapper.toText(record['pageId']).trim().toLowerCase();
      if (declaredPageId === normalizedPageId) {
        return true;
      }
    }

    return false;
  }
}
