/** Shared value semantics. Invalid input is preserved for validation, never silently zeroed. */
export type FieldValueType = 'text' | 'code' | 'number' | 'integer' | 'decimal' | 'boolean' | 'date' | 'datetime' | 'time' | 'guid' | 'email' | 'url' | 'phone';
export function normalizeFieldValue(value: unknown, type?: string): unknown {
  if (value === null || value === undefined) return value;
  if (type === 'datetime' && typeof value === 'string' && isValidDateTime(value)) return new Date(value).toISOString();
  if (type === 'guid') return String(value).trim().toLowerCase();
  if (type === 'code') return String(value).trim().toUpperCase();
  // API decimal values remain strings so large quantities/costs do not lose digits.
  if (type === 'decimal') return String(value).trim();
  if (['number', 'integer', 'currency'].includes(type ?? '')) {
    if (typeof value === 'number') return value;
    const text = String(value).trim();
    if (!text) return '';
    const number = Number(text.replace(/,/g, ''));
    return Number.isFinite(number) ? number : value;
  }
  if (type === 'boolean' && typeof value !== 'boolean') {
    const text = String(value).trim().toLowerCase();
    if (['true', '1', 'yes', 'on'].includes(text)) return true;
    if (['false', '0', 'no', 'off', ''].includes(text)) return false;
  }
  return value;
}

/** Compare editor values without treating representation-only changes as edits. */
export function fieldValuesEqual(previous: unknown, next: unknown, type?: string): boolean {
  const canonical = (value: unknown): unknown => {
    const normalized = normalizeFieldValue(value, type);
    if (normalized === null || normalized === undefined || normalized === '') return '';
    if (type === 'decimal') {
      const text = String(normalized);
      if (/^[+-]?\d+(?:\.\d+)?$/.test(text)) {
        const negative = text.startsWith('-');
        const [whole, fraction = ''] = text.replace(/^[+-]/, '').split('.');
        const integer = whole.replace(/^0+(?=\d)/, '');
        const decimals = fraction.replace(/0+$/, '');
        return (negative && (integer !== '0' || decimals) ? '-' : '') + integer + (decimals ? '.' + decimals : '');
      }
    }
    return normalized;
  };
  return Object.is(canonical(previous), canonical(next));
}

/** Compare decimal strings without converting their significant digits to floating point. */
export function compareDecimalValues(left: string, right: string): -1 | 0 | 1 | undefined {
  const parts = (raw: string) => {
    const match = /^([+-]?)(\d+)(?:\.(\d+))?(?:e([+-]?\d+))?$/i.exec(raw.trim());
    if (!match) return undefined;
    const exponent = Number(match[4] ?? 0);
    if (!Number.isSafeInteger(exponent) || Math.abs(exponent) > 1000) return undefined;
    const digits = match[2] + (match[3] ?? '');
    const point = match[2].length + exponent;
    const whole = (point <= 0 ? '0' : digits.slice(0, point).padEnd(point, '0')).replace(/^0+(?=\d)/, '');
    const fraction = (point < 0 ? '0'.repeat(-point) + digits : digits.slice(point)).replace(/0+$/, '');
    return { whole, fraction, negative: match[1] === '-' && (whole !== '0' || !!fraction) };
  };
  const a = parts(left), b = parts(right);
  if (!a || !b) return undefined;
  if (a.negative !== b.negative) return a.negative ? -1 : 1;
  const length = Math.max(a.fraction.length, b.fraction.length);
  const af = a.fraction.padEnd(length, '0'), bf = b.fraction.padEnd(length, '0');
  const result = a.whole.length !== b.whole.length ? (a.whole.length < b.whole.length ? -1 : 1)
    : a.whole !== b.whole ? (a.whole < b.whole ? -1 : 1) : af === bf ? 0 : af < bf ? -1 : 1;
  return (a.negative ? -result : result) as -1 | 0 | 1;
}

/** Native editors share one type mapping in forms and editable grids. */
export function fieldInputType(type?: string): string {
  if (type === 'datetime') return 'datetime-local';
  if (['date', 'time', 'email', 'url'].includes(type ?? '')) return type!;
  if (type === 'phone') return 'tel';
  if (['number', 'integer', 'currency'].includes(type ?? '')) return 'number';
  // Decimal strings remain text to preserve arbitrary precision through the DOM.
  return 'text';
}
export function fieldEditorValue(value: unknown, type?: string): string {
  if (value === null || value === undefined) return '';
  if (type === 'datetime' && isValidDateTime(String(value))) {
    const date = new Date(String(value));
    const pad = (value: number) => String(value).padStart(2, '0');
    return date.getFullYear() + '-' + pad(date.getMonth()+1) + '-' + pad(date.getDate()) + 'T' + pad(date.getHours()) + ':' + pad(date.getMinutes()) + ':' + pad(date.getSeconds()) + (date.getMilliseconds() ? '.' + String(date.getMilliseconds()).padStart(3, '0') : '');
  }
  return String(value);
}
export function isValidDateTime(text: string): boolean {
  const parts = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,9})?)?(Z|[+-]\d{2}:\d{2})?$/.exec(text);
  if (!parts || Number(parts[2]) > 23 || Number(parts[3]) > 59 || Number(parts[4] ?? 0) > 59) return false;
  const day = new Date(parts[1] + 'T00:00:00Z');
  return Number.isFinite(day.getTime()) && day.toISOString().slice(0,10) === parts[1] && Number.isFinite(new Date(text).getTime());
}
