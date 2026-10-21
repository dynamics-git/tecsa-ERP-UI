import { fieldIsRequired, fieldIsHidden } from '../models/field-state';
import { Injectable } from '@angular/core';
import { FieldConfig } from '../models/field-config.model';
import { compareDecimalValues, isValidDateTime } from '../models/field-value';

export interface FieldValidationResult {
  valid: boolean;
  errors: string[];
}

@Injectable({
  providedIn: 'root'
})
export class FieldValidationService {
  validateField(field: FieldConfig | undefined, value: unknown, record: Record<string, unknown> = {}): FieldValidationResult {
    if (!field || fieldIsHidden(field, record)) {
      return { valid: true, errors: [] };
    }

    const errors: string[] = [];
    const text = this.toText(value);

    if (fieldIsRequired(field, record) && text.trim().length === 0) {
      errors.push(field.validation?.message ?? `${field.label} is required`);
      return { valid: false, errors };
    }

    if ((field.valueType === 'date' || field.type === 'date') && text.trim()) {
      const date = new Date(text + 'T00:00:00Z');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== text) {
        errors.push(`${field.label} must be a valid date (YYYY-MM-DD)`);
      }
    }
    if (field.valueType === 'decimal' && text.trim() && !/^[+-]?[0-9]+(?:\.[0-9]+)?$/.test(text.trim())) {
      errors.push(`${field.label} must be a decimal value`);
    }
    const type = field.valueType ?? field.type;
    if (text.trim()) {
      if (type === 'datetime' && !isValidDateTime(text)) errors.push(field.label + ' must be a valid date and time');
      if (type === 'time' && !/^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d{1,3})?)?$/.test(text)) errors.push(field.label + ' must be a valid time');
      if (type === 'guid' && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(text)) errors.push(field.label + ' must be a valid identifier');
      if (type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) errors.push(field.label + ' must be a valid email address');
      if (type === 'url') { try { const url = new URL(text); if (!['http:', 'https:'].includes(url.protocol)) throw new Error(); } catch { errors.push(field.label + ' must be a valid HTTP or HTTPS URL'); } }
    }
    const validation = field.validation ?? {};

    if (field.valueType === 'decimal' && /^[+-]?[0-9]+(?:\.[0-9]+)?$/.test(text.trim())) {
      const [whole, fraction = ''] = text.trim().replace(/^[+-]/, '').split('.');
      const digits = whole.replace(/^0+/, '').length + fraction.length;
      if (validation.precision !== undefined && Math.max(1, digits) > validation.precision) errors.push(
        validation.message ?? `${field.label} must have at most ${validation.precision} digits`,
      );
      if (validation.precision !== undefined && validation.scale !== undefined && whole.replace(/^0+/, '').length > validation.precision - validation.scale) errors.push(
        validation.message ?? `${field.label} has too many digits before the decimal point`,
      );
      if (validation.scale !== undefined && fraction.length > validation.scale) errors.push(
        validation.message ?? `${field.label} must have at most ${validation.scale} decimal places`,
      );
      if (validation.min !== undefined && compareDecimalValues(text.trim(), String(validation.min)) === -1) errors.push(
        validation.message ?? `${field.label} must be at least ${validation.min}`,
      );
      if (validation.max !== undefined && compareDecimalValues(text.trim(), String(validation.max)) === 1) errors.push(
        validation.message ?? `${field.label} must be at most ${validation.max}`,
      );
    }
    if (field.valueType !== 'decimal' && (field.type === 'number' || field.type === 'currency' || ['number', 'integer'].includes(field.valueType ?? ''))) {
      const numberValue = this.toNumber(value);
      if (text.trim().length && numberValue === null) errors.push(`${field.label} must be a number`);
      if (numberValue !== null) {
        if (field.valueType === 'integer' && !Number.isSafeInteger(numberValue)) {
          errors.push(`${field.label} must be a safe whole number`);
        }
        if (validation.min !== undefined && numberValue < Number(validation.min)) {
          errors.push(validation.message ?? `${field.label} must be at least ${validation.min}`);
        }

        if (validation.max !== undefined && numberValue > Number(validation.max)) {
          errors.push(validation.message ?? `${field.label} must be at most ${validation.max}`);
        }
      }
    }

    if (text.trim() && ['date','datetime','time'].includes(type ?? '')) {
      const comparable = (value:unknown):number => {
        const raw=String(value);
        if (type === 'time') {
          if (!/^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d{1,3})?)?$/.test(raw)) return NaN;
          const parts=raw.split(':').map(Number);return parts[0]*3600+parts[1]*60+(parts[2]??0);
        }
        if (type === 'datetime') return isValidDateTime(raw) ? new Date(raw).getTime() : NaN;
        const date=new Date(raw+'T00:00:00Z');return /^\d{4}-\d{2}-\d{2}$/.test(raw) && Number.isFinite(date.getTime()) && date.toISOString().slice(0,10)===raw ? date.getTime() : NaN;
      };
      const actual=comparable(value);
      for (const bound of ['min','max'] as const) if (validation[bound] !== undefined) {
        const limit=comparable(validation[bound]);
        if (!Number.isFinite(limit)) errors.push(field.label+' has an invalid '+bound+' configuration');
        else if (Number.isFinite(actual) && (bound === 'min' ? actual < limit : actual > limit)) errors.push(validation.message ?? field.label + (bound === 'min' ? ' must be on or after ' : ' must be on or before ') + validation[bound]);
      }
    }
    if (validation.maxLength !== undefined && text.length > validation.maxLength) {
      errors.push(validation.message ?? `${field.label} must be at most ${validation.maxLength} characters`);
    }

    if (validation.pattern) {
      try {
      const regex = new RegExp(validation.pattern);
      if (text.length > 0 && !regex.test(text)) {
        errors.push(validation.message ?? `${field.label} format is invalid`);
      }
      } catch { errors.push(field.label + ' has an invalid validation pattern configuration'); }
    }

    return {
      valid: errors.length === 0,
      errors
    };
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
      if (!normalized) {
        return null;
      }

      const parsed = Number(normalized);
      return Number.isFinite(parsed) ? parsed : null;
    }

    return null;
  }
}
