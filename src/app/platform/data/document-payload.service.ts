import { fieldIsReadonly } from '../models/field-state';
import { normalizeFieldValue } from '../models/field-value';
import { Injectable } from '@angular/core';
import { SessionService } from '../../core/services/session.service';
import { FormSectionConfig } from '../models/field-config.model';

@Injectable({
  providedIn: 'root'
})
export class DocumentPayloadService {
  constructor(private readonly sessionService: SessionService) {}

  buildSessionCreatePayload(): Record<string, unknown> {
    const payload: Record<string, unknown> = {};

    const userId = this.toText(this.sessionService.UserId);
    if (userId.length) {
      payload['CreatedBy'] = userId;
      payload['UserId'] = userId;
    }

    const companyName = this.toText(this.sessionService.CompanyName);
    if (companyName.length) {
      payload['Company'] = companyName;
    }

    const companyId = this.toText(this.sessionService.Company);
    if (companyId.length) {
      payload['CompanyId'] = companyId;
    }

    const accessCenter = this.resolveAccessCenter();
    if (accessCenter.length) {
      payload['AccessCenter'] = accessCenter;
    }

    return payload;
  }

  buildHeaderCreatePayload(
    headerData: Record<string, unknown>,
    sections: FormSectionConfig[]
  ): Record<string, unknown> {
    return {
      ...this.buildSessionCreatePayload(),
      ...this.buildHeaderUpdatePayload(headerData, sections),
    };
  }

  buildHeaderUpdatePayload(
    headerData: Record<string, unknown>,
    sections: FormSectionConfig[]
  ): Record<string, unknown> {
    const payload: Record<string, unknown> = {};

    for (const section of sections) {
      for (const field of section.fields) {
        if (fieldIsReadonly(field, headerData)) {
          continue;
        }

        payload[field.key] = headerData[field.key] === '' && field.defaultValue === null
          ? null : this.coerceFieldValue(headerData[field.key], field.valueType ?? field.type);
      }
    }

    return payload;
  }

  private coerceFieldValue(value: unknown, valueType: string | undefined): unknown {
    return normalizeFieldValue(value, valueType) ?? null;
  }

  private resolveAccessCenter(): string {
    const center = this.sessionService.AccessCenter;
    if (this.isRecord(center)) {
      const fromCode = this.toText(center['Code']);
      if (fromCode.length) {
        return fromCode;
      }

      const fromId = this.toText(center['Id']);
      if (fromId.length) {
        return fromId;
      }
    }

    return this.toText(this.sessionService.DefaultAccessCenter);
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }

  private toText(value: unknown): string {
    return value === null || value === undefined ? '' : String(value);
  }

  private toNumber(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string') {
      const normalized = value.replace(/,/g, '').trim();
      if (!normalized.length) {
        return null;
      }

      const parsed = Number(normalized);
      return Number.isFinite(parsed) ? parsed : null;
    }

    return null;
  }

  private toBoolean(value: unknown): boolean {
    if (typeof value === 'boolean') {
      return value;
    }

    const normalized = this.toText(value).trim().toLowerCase();
    return normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'on';
  }
}
