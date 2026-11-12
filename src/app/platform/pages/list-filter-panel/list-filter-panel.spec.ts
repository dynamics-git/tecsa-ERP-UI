import {TestBed} from '@angular/core/testing';
import {provideRouter} from '@angular/router';
import {of} from 'rxjs';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {providePlatformGovernance} from '../../../core/providers/platform-governance.provider';
import {DATA_REST_SERVICE} from '../../data/data-source.service';
import {ListFilterPanel} from './list-filter-panel';

describe('Filter option reads', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('keeps bounded options and reuses them without counting the master table', () => {
    const get = vi.fn((_endpoint: string) => of({data: [{number: 'V01', name: 'Vendor one'}], meta: {hasMore: false}}));
    TestBed.configureTestingModule({imports: [ListFilterPanel], providers: [
      provideRouter([]), ...providePlatformGovernance(),
      {provide: DATA_REST_SERVICE, useValue: {get}},
    ]});
    const fixture = TestBed.createComponent(ListFilterPanel);
    const panel = fixture.componentInstance;
    panel.filterOptions = [{field: 'vendorNo', label: 'Vendor', type: 'dropdown', apiUrl: '/vendors', valueField: 'number', labelField: 'name'}];
    panel.addFilter();
    panel.updateField(0, 'vendorNo');
    const query = new URL(get.mock.calls[0][0], 'http://fixture').searchParams;
    expect(query.get('$count')).toBe('false');
    expect(query.get('$top')).toBe('50');
    expect(panel.getValueOptions(panel.filters[0])).toEqual([{value: 'V01', label: 'Vendor one'}]);
    panel.updateField(0, 'vendorNo');
    expect(get).toHaveBeenCalledOnce();
    fixture.destroy();
  });
});
