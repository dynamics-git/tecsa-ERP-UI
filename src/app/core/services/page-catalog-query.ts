/** Bounded, read-only catalogue query. Never executes expression text as code. */
export function queryCatalog(rows: Record<string, unknown>[], params: URLSearchParams): unknown {
  const filter = params.get('$filter') ?? '';
  if (filter.length > 4000) throw new Error('Catalogue filter is too long.');
  const tokens = filter.match(/'(?:''|[^'])*'|[A-Za-z_]\w*|-?\d+(?:\.\d+)?|[(),]/g) ?? [];
  if (tokens.join('').replace(/\s/g, '') !== filter.replace(/\s/g, ''))
    throw new Error('Invalid catalogue filter.');
  let position = 0;
  type Predicate = (row: Record<string, unknown>) => boolean;
  const take = (expected?: string) => {
    const value = tokens[position++];
    if (value === undefined || (expected && value !== expected))
      throw new Error('Invalid catalogue filter.');
    return value;
  };
  const literal = (): unknown => {
    const token = take();
    if (token.startsWith("'")) return token.slice(1, -1).replace(/''/g, "'");
    if (token === 'true' || token === 'false') return token === 'true';
    if (token === 'null') return null;
    if (/^-?\d/.test(token)) return Number(token);
    throw new Error('Invalid catalogue value.');
  };
  const atom = (): Predicate => {
    if (tokens[position] === '(') {
      take('(');
      const result = expression();
      take(')');
      return result;
    }
    const field = take();
    if (['contains', 'startswith', 'endswith'].includes(field)) {
      take('(');
      const key = take();
      take(',');
      const value = String(literal()).toLowerCase();
      take(')');
      return (row) => {
        const text = String(row[key] ?? '').toLowerCase();
        return field === 'contains'
          ? text.includes(value)
          : field === 'startswith'
            ? text.startsWith(value)
            : text.endsWith(value);
      };
    }
    const operator = take();
    const value = literal();
    if (!['eq', 'ne', 'gt', 'ge', 'lt', 'le'].includes(operator))
      throw new Error('Unsupported catalogue operator.');
    return (row) => {
      const actual = row[field] ?? null;
      const comparison = String(actual ?? '').localeCompare(String(value ?? ''), undefined, {
        numeric: true,
        sensitivity: 'base',
      });
      return operator === 'eq'
        ? comparison === 0
        : operator === 'ne'
          ? comparison !== 0
          : operator === 'gt'
            ? comparison > 0
            : operator === 'ge'
              ? comparison >= 0
              : operator === 'lt'
                ? comparison < 0
                : comparison <= 0;
    };
  };
  const conjunction = (): Predicate => {
    let result = atom();
    while (tokens[position] === 'and') {
      take('and');
      const left = result;
      const right = atom();
      result = (row) => left(row) && right(row);
    }
    return result;
  };
  const expression = (): Predicate => {
    let result = conjunction();
    while (tokens[position] === 'or') {
      take('or');
      const left = result;
      const right = conjunction();
      result = (row) => left(row) || right(row);
    }
    return result;
  };
  let result = [...rows];
  if (tokens.length) {
    const matches = expression();
    if (position !== tokens.length) throw new Error('Invalid catalogue filter.');
    result = result.filter(matches);
  }
  const order = (params.get('$orderby') ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  for (const item of order)
    if (!/^[A-Za-z_]\w*(?: (?:asc|desc))?$/.test(item)) throw new Error('Invalid catalogue sort.');
  result.sort((a, b) => {
    for (const item of order) {
      const [field, direction] = item.split(' ');
      const difference = String(a[field] ?? '').localeCompare(String(b[field] ?? ''), undefined, {
        numeric: true,
      });
      if (difference) return direction === 'desc' ? -difference : difference;
    }
    return 0;
  });
  const number = (key: string, fallback: number) => {
    const raw = params.get(key);
    if (raw === null) return fallback;
    if (!/^\d+$/.test(raw) || !Number.isSafeInteger(Number(raw)))
      throw new Error('Invalid catalogue paging.');
    return Number(raw);
  };
  const skip = number('$skip', 0);
  const top = Math.min(number('$top', 50), 1000);
  return {
    data: result.slice(skip, skip + top),
    meta: { total: result.length, hasMore: skip + top < result.length },
  };
}
