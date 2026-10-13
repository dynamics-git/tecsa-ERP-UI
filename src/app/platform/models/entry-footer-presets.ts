import { EntryFooterRowConfig, EntryFooterSectionConfig } from './document-window-config.model';

export const DOCUMENT_TOTAL_FOOTER_ROWS: EntryFooterRowConfig[] = [
  { id: 'amount-excl-sst', label: 'Amount Excl. SST', source: 'total', totalKey: 'subtotal', order: 10 },
  { id: 'sst', label: 'SST', source: 'total', totalKey: 'sst', order: 20 },
  { id: 'total-incl-sst', label: 'Total Incl. SST', source: 'total', totalKey: 'total', emphasis: true, order: 30 }
];

export const DOCUMENT_TOTAL_FOOTER_SECTIONS: EntryFooterSectionConfig[] = [
  {
    id: 'document-totals',
    rows: DOCUMENT_TOTAL_FOOTER_ROWS
  }
];

export function buildDocumentTotalFooterSections(
  rows: EntryFooterRowConfig[] = DOCUMENT_TOTAL_FOOTER_ROWS
): EntryFooterSectionConfig[] {
  return [
    {
      id: 'document-totals',
      rows
    }
  ];
}
