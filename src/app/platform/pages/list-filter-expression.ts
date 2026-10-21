import type { FilterOperator } from '../models/list-filter-config.model';

/** Compile bounded field expressions to the existing restricted server filter contract. */
export function buildFieldFilter(field: string, value: string, operator: FilterOperator, type = 'text'): string {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(field)) throw new Error('Select a valid filter field.');
  if (!['contains', 'startswith', 'eq', 'ne', 'gt', 'ge', 'lt', 'le', 'expression'].includes(operator)) throw new Error('Select a supported filter operator.');
  if (type === 'integer' || type === 'decimal') type = 'number';
  const raw = value.trim();
  if (!raw || raw.length > 200) throw new Error('Enter a filter value of up to 200 characters.');
  const literal = (input: string): string => {
    const text = input.trim();
    if (type === 'boolean') {
      if (text !== 'true' && text !== 'false') throw new Error('Select Yes or No.');
      return text;
    }
    if (type === 'number' || type === 'currency') {
      if (!/^-?\d+(?:\.\d+)?$/.test(text)) throw new Error('Enter a valid number.');
      return text;
    }
    return `'${text.replace(/'/g, "''")}'`;
  };
  const atom = (input: string): string => {
    const text = input.trim();
    if (!text) throw new Error('Complete each part of the filter expression.');
    const comparison = /^(<>|>=|<=|>|<|=)(.*)$/.exec(text);
    if (comparison) {
      if ((type === 'text' || type === 'select' || type === 'dropdown' || type === 'boolean') && !['=', '<>'].includes(comparison[1]!)) throw new Error('Ordered comparisons require a number or date field under this API.');
      const ops: Record<string, string> = { '<>': 'ne', '>=': 'ge', '<=': 'le', '>': 'gt', '<': 'lt', '=': 'eq' };
      if (!comparison[2]!.trim()) throw new Error('Enter a value after the comparison.');
      return `${field} ${ops[comparison[1]!]} ${literal(comparison[2]!)}`;
    }
    if (text.includes('..')) {
      if (!['number', 'currency', 'date'].includes(type)) throw new Error('Ranges require a number or date field under this API. Use alternatives (A|B) or a wildcard (A*) for text.');
      const range = text.split('..');
      if (range.length !== 2 || (!range[0] && !range[1])) throw new Error('Use a range such as 100..200.');
      const parts: string[] = [];
      if (range[0]) parts.push(`${field} ge ${literal(range[0])}`);
      if (range[1]) parts.push(`${field} le ${literal(range[1])}`);
      return `(${parts.join(' and ')})`;
    }
    if (text.includes('*')) {
      const inner = text.replace(/^\*/, '').replace(/\*$/, '');
      if (!inner || inner.includes('*') || type === 'number' || type === 'boolean' || type === 'date') {
        throw new Error('Use *text*, text* or *text on a text field.');
      }
      const fn = text.startsWith('*') && text.endsWith('*') ? 'contains' : text.startsWith('*') ? 'endswith' : 'startswith';
      return `${fn}(${field}, ${literal(inner)})`;
    }
    return `${field} eq ${literal(text)}`;
  };
  if (operator === 'expression') {
    if (/[()?@]/.test(raw)) throw new Error('Use ranges, |, &, comparisons and edge * wildcards.');
    const terms = raw.split('|');
    if (terms.reduce((count, term) => count + term.split('&').length, 0) > 8) throw new Error('Use up to eight expression terms per field.');
    return `(${terms.map(term => `(${term.split('&').map(atom).join(' and ')})`).join(' or ')})`;
  }
  if ((operator === 'contains' || operator === 'startswith') && ['number', 'currency', 'boolean', 'date'].includes(type)) throw new Error('Choose an equality, comparison or range operator for this field.');
  if (operator === 'contains' || operator === 'startswith') return `${operator}(${field}, ${literal(raw)})`;
  if (operator === 'eq' && /[,|]/.test(raw)) {
    const values = raw.split(/[,|]/).map(item => item.trim()).filter(Boolean);
    if (!values.length || values.length > 8) throw new Error('Use up to eight values.');
    return `(${values.map(item => `${field} eq ${literal(item)}`).join(' or ')})`;
  }
  return `${field} ${operator} ${literal(raw)}`;
}
