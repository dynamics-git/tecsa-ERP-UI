import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { DocumentPageCommandRoutingResolverService } from './document-page-command-routing-resolver.service';

describe('DocumentPage related RunModal requests', () => {
  let resolver: DocumentPageCommandRoutingResolverService;
  const header = { systemId: 'PO-1', vendorOrderNumber: 'UNSAVED' };
  const lines = [{ description: 'Unsaved line', quantity: 2 }];
  const payload = { command: 'open-related-list' };
  const params = () => ({ pageId: 'purchase-order', headerData: header, lineRows: lines, payload });

  beforeEach(() => {
    TestBed.configureTestingModule({});
    resolver = TestBed.inject(DocumentPageCommandRoutingResolverService);
  });

  it('stacks related lists without changing their modal layout', () => {
    const request = resolver.buildEntryRunModalRequest({ ...params(), target: 'list' });
    expect(request).toMatchObject({ pageId: 'purchase-order', target: 'list', mode: 'modal', size: 'xl', allowNested: true });
    expect(request.context?.['headerData']).toBe(header);
    expect(request.context?.['lineRows']).toBe(lines);
    expect(request.context?.['payload']).toBe(payload);
  });

  it('stacks related entry documents without imposing a list layout', () => {
    const request = resolver.buildEntryRunModalRequest({ ...params(), target: 'entry' });
    expect(request.target).toBe('entry');
    expect(request.allowNested).toBe(true);
    expect(request.mode).toBeUndefined();
    expect(request.size).toBeUndefined();
  });

  it('preserves unset target defaults and includes active line only when supplied', () => {
    const defaultRequest = resolver.buildEntryRunModalRequest(params());
    expect(defaultRequest.allowNested).toBe(true);
    expect(defaultRequest.target).toBeUndefined();
    expect(defaultRequest.context).not.toHaveProperty('activeLine');
    const withLine = resolver.buildEntryRunModalRequest({ ...params(), target: 'list', activeLine: lines[0] });
    expect(withLine.context?.['activeLine']).toBe(lines[0]);
  });
  it('finds FactBox commands through the same entry command lookup', () => {
    const button = {label:'Related',actionKey:'cmd:factbox-related',runModalPageId:'items'};
    expect(resolver.findEntryCommandButton({command:'factbox-related',factBoxButtons:[button]})).toBe(button);
  });
});
