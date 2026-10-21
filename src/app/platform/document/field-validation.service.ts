import { Injectable } from '@angular/core';
import { FieldConfig } from '../models/field-config.model';
import { compareDecimalValues } from '../models/field-value';

export interface FieldValidationResult {
  valid: boolean;
  errors: string[];
}

@Injectable({
  providedIn: 'root'
})
export class FieldValidationService {
  validateField(field: FieldConfig | undefined, value: unknown): FieldValidationResult {
    if (!field) {
      return { valid: true, errors: [] };
    }

    const errors: string[] = [];
    const text = this.toText(value);

    if (field.required && text.trim().length === 0) {
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
        if (validation.min !== undefined && numberValue < validation.min) {
          errors.push(validation.message ?? `${field.label} must be at least ${validation.min}`);
        }

        if (validation.max !== undefined && numberValue > validation.max) {
          errors.push(validation.message ?? `${field.label} must be at most ${validation.max}`);
        }
      }
    }

    if (validation.maxLength !== undefined && text.length > validation.maxLength) {
      errors.push(validation.message ?? `${field.label} must be at most ${validation.maxLength} characters`);
    }

    if (validation.pattern) {
      const regex = new RegExp(validation.pattern);
      if (text.length > 0 && !regex.test(text)) {
        errors.push(validation.message ?? `${field.label} format is invalid`);
      }
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
