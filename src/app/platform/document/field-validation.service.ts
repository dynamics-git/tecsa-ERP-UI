import { Injectable } from '@angular/core';
import { FieldConfig } from '../models/field-config.model';

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

    const validation = field.validation;
    if (!validation) {
      return { valid: true, errors };
    }

    if (field.type === 'number' || field.type === 'currency' || field.valueType === 'number') {
      const numberValue = this.toNumber(value);
      if (numberValue !== null) {
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
