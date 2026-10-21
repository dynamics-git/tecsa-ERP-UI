export interface RecordValueFormat {
  type?: string;
  currencyCode?: string;
}

/** Display formatting only; decimal strings never pass through floating-point conversion. */
export function formatRecordValue(value: unknown, format: RecordValueFormat): string {
  if (value === undefined || value === null || value === '') return '';
  if (format.type === 'boolean') {
    if (value === true || value === 'true') return 'Yes';
    if (value === false || value === 'false') return 'No';
  }
  if (format.type === 'datetime' && typeof value === 'string') {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return new Intl.DateTimeFormat(undefined, {
      year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
    }).format(date);
  }
  if (format.type === 'date' && typeof value === 'string') {
    const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
    const date = new Date(dateOnly ? `${value}T00:00:00Z` : value);
    if (!Number.isNaN(date.getTime())) return new Intl.DateTimeFormat(undefined, {year: 'numeric', month: 'short', day: '2-digit', ...(dateOnly ? {timeZone: 'UTC'} : {})}).format(date);
  }
  if ((['number','integer','decimal','currency'].includes(format.type ?? '')) && (typeof value === 'number' || typeof value === 'string')) {
    const match = /^(-?)(\d+)(?:\.(\d+))?$/.exec(String(value));
    if (match) {
      const decimal = new Intl.NumberFormat().formatToParts(1.1).find(part => part.type === 'decimal')?.value ?? '.';
      const fraction = format.type === 'currency' ? (match[3] ?? '').padEnd(2, '0') : match[3] ?? '';
      const text = `${match[1]}${BigInt(match[2]!).toLocaleString()}${fraction ? decimal + fraction : ''}`;
      return format.type === 'currency' && format.currencyCode ? `${format.currencyCode} ${text}` : text;
    }
  }
  return String(value);
}
