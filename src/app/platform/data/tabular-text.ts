/** Excel-compatible TSV. Values remain strings so decimal precision is not lost. */
export function readTabularText(text: string, maxRows = 100, maxCells = 2000): string[][] {
  if (text.length > 1_000_000) throw new Error('Paste is limited to 1 MB.');
  const rows: string[][] = [];
  let row: string[] = [], value = '', quoted = false, closed = false, cells = 0;
  const cell = () => { if (++cells > maxCells) throw new Error('Too many pasted cells.'); row.push(value); value = ''; closed = false; };
  const finishRow = () => { cell(); rows.push(row); row = []; if (rows.length > maxRows) throw new Error(`Paste at most ${maxRows} rows at a time.`); };
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { value += '"'; i++; }
      else if (ch === '"') { quoted = false; closed = true; }
      else value += ch;
    } else if (ch === '"' && !value && !closed) quoted = true;
    else if (ch === '\t') cell();
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; finishRow(); }
    else { if (closed) throw new Error('Invalid quoted spreadsheet cell.'); value += ch; }
  }
  if (quoted) throw new Error('An Excel cell has an unclosed quote.');
  if (value || row.length || closed) finishRow();
  if (rows.length && rows.some(row => row.length !== rows[0].length)) throw new Error('Paste a rectangular range of cells.');
  return rows;
}

export function writeTabularText(rows: unknown[][]): string {
  return rows.map(row => row.map(value => {
    let text = value == null ? '' : String(value);
    // Prevent spreadsheet formula execution on text; signed decimal values stay numeric.
    if (/^[\s]*[=+@-]/.test(text) && !/^[+-]?\d+(?:\.\d+)?$/.test(text)) text = "'" + text;
    return /[\t\r\n"]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
  }).join('\t')).join('\r\n');
}
