import { Injectable } from '@angular/core';

export type ListExportFormat = 'xlsx' | 'docx' | 'csv' | 'print';
export interface ListExportData { title: string; fileName: string; headers: string[]; rows: string[][]; }

/** Exports the visible columns of the current loaded result, without fetching more records. */
@Injectable({ providedIn: 'root' })
export class ListExportService {
  async export(format: ListExportFormat, data: ListExportData): Promise<void> {
    if (format === 'print') { this.print(data); return; }
    let blob: Blob;
    if (format === 'xlsx') {
      const { default: writeExcelFile } = await import('write-excel-file/browser');
      // Explicit strings preserve codes, leading zeros and exact decimal values.
      const rows = [data.headers.map(value => ({value, type: String, fontWeight: 'bold' as const})),
        ...data.rows.map(row => row.map(value => ({value, type: String})))];
      blob = await writeExcelFile(rows, {sheet: 'Records', columns: data.headers.map(() => ({width: 24}))}).toBlob();
    } else if (format === 'docx') {
      const { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, WidthType, PageOrientation } = await import('docx');
      const row = (values: string[], header = false) => new TableRow({ tableHeader: header, children: values.map(text => new TableCell({ children: [new Paragraph({children: [new TextRun({text, bold: header})]})] })) });
      const document = new Document({sections: [{properties: {page: {size: {orientation: PageOrientation.LANDSCAPE}}}, children: [
        new Paragraph({children: [new TextRun({text: data.title, bold: true, size: 32})]}),
        new Paragraph(`${data.rows.length} loaded records · Visible columns`),
        new Table({width: {size: 100, type: WidthType.PERCENTAGE}, rows: [row(data.headers, true), ...data.rows.map(values => row(values))]}),
      ]}]});
      blob = await Packer.toBlob(document);
    } else {
      const quote = (value: string) => '"' + (/^[\s]*[=+\-@\t\r]/.test(value) ? "'" + value : value).replace(/"/g, '""') + '"';
      blob = new Blob(['\uFEFF', [data.headers, ...data.rows].map(row => row.map(quote).join(',')).join('\r\n')], {type: 'text/csv;charset=utf-8'});
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${data.fileName.replace(/[^a-zA-Z0-9_-]/g, '-')}-loaded-records.${format}`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }

  private print(data: ListExportData): void {
    const view = window.open('', '_blank');
    if (!view) throw new Error('Allow the print window to open, then try again.');
    view.opener = null;
    const doc = view.document;
    doc.title = data.title;
    const style = doc.createElement('style');
    const tokens = getComputedStyle(document.documentElement);
    style.textContent = `body{font-family:${tokens.getPropertyValue('--ts-font')};color:${tokens.getPropertyValue('--ts-text')};padding:16px}h1{font-size:20px}table{width:100%;border-collapse:collapse;font-size:12px}th,td{border:1px solid ${tokens.getPropertyValue('--ts-border')};padding:6px;text-align:left;overflow-wrap:anywhere}thead{display:table-header-group}tr{break-inside:avoid}@page{size:landscape;margin:12mm}`;
    doc.head.append(style);
    const title = doc.createElement('h1'); title.textContent = data.title; doc.body.append(title);
    const scope = doc.createElement('p'); scope.textContent = `${data.rows.length} loaded records · Visible columns`; doc.body.append(scope);
    const table = doc.createElement('table');
    const head = table.createTHead().insertRow();
    data.headers.forEach(value => { const cell = doc.createElement('th'); cell.textContent = value; head.append(cell); });
    const body = table.createTBody();
    data.rows.forEach(values => { const row = body.insertRow(); values.forEach(value => { row.insertCell().textContent = value; }); });
    doc.body.append(table);
    view.focus();
    view.print();
  }
}
