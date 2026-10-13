import { Injectable } from '@angular/core';
import { MenuSearchItem } from '../models/menu-item.model';
import { ConfirmationService, RunModalService } from '../../platform/public-api';
import { RunModalContext } from '../../platform/run-modal/run-modal-config.token';
import {
	getRegisteredRunModalPageIds,
	loadRunModalConfigModule,
	resolveRunModalOpenTarget,
} from './run-modal-config-registry';
import { SessionService } from './session.service';

@Injectable({
	providedIn: 'root'
})
export class GlobalSearchPopupService {
	constructor(
		private readonly runModal: RunModalService,
		private readonly confirmation: ConfirmationService,
		private readonly sessionService: SessionService,
	) {}

	async open(item: MenuSearchItem): Promise<boolean> {
		const pageId = item.pageId?.trim().toLowerCase();
		if (pageId) {
			return this.openByPageId(pageId, resolveRunModalOpenTarget(pageId));
		}

		return false;
	}

	async openByPageId(rawPageId?: string, forcedTarget?: 'list' | 'entry', context?: RunModalContext): Promise<boolean> {
		const pageId = rawPageId?.trim().toLowerCase();
		if (!pageId) {
			return false;
		}

		await loadRunModalConfigModule(pageId);
		const target = forcedTarget ?? resolveRunModalOpenTarget(pageId);
		const resolvedContext = context ?? await this.resolveDefaultRunModalContext(pageId);
		const opened = await this.runModal.open({
			pageId,
			context: resolvedContext,
			target,
			mode: 'page',
			size: 'full',
			allowNested: true,
		});

		if (!opened) {
			const reason = this.runModal.getLastOpenFailureReason();
			const registeredPages = getRegisteredRunModalPageIds();
			const registeredDetail = registeredPages.length ? ` Registered: ${registeredPages.join(', ')}` : ' Registered: none';
			const detail = reason ? ` (${reason}).${registeredDetail}` : `.${registeredDetail}`;
			await this.confirmation.message(`Unable to open page${detail}.`);
		}

		return opened;
	}

	private async resolveDefaultRunModalContext(pageId: string): Promise<RunModalContext | undefined> {
		const companyId = this.sessionService.Company?.trim();
		if (!companyId) {
			return undefined;
		}

		const moduleRef = await loadRunModalConfigModule(pageId);
		const pageConfig = this.findPageConfig(moduleRef as Record<string, unknown> | undefined, pageId);
		const dataSource = this.toRecord(pageConfig?.['dataSource']);
		const endpoint = this.toText(dataSource?.['endpoint']).trim().toLowerCase();
		if (!endpoint.includes('/companies')) {
			return undefined;
		}

		const keyField = this.toText(dataSource?.['keyField']).trim() || 'systemId';
		return {
			recordId: companyId,
			headerData: {
				[keyField]: companyId,
			},
		};
	}

	private findPageConfig(moduleRef: Record<string, unknown> | undefined, pageId: string): Record<string, unknown> | undefined {
		if (!moduleRef) {
			return undefined;
		}

		const normalizedPageId = pageId.trim().toLowerCase();
		for (const exportedValue of Object.values(moduleRef)) {
			const config = this.toRecord(exportedValue);
			if (!config) {
				continue;
			}

			const declaredPageId = this.toText(config['pageId']).trim().toLowerCase();
			if (declaredPageId === normalizedPageId) {
				return config;
			}
		}

		return undefined;
	}

	private toRecord(value: unknown): Record<string, unknown> | undefined {
		return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : undefined;
	}

	private toText(value: unknown): string {
		return typeof value === 'string' ? value : '';
	}
}

