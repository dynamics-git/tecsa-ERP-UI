import { FieldConfig } from '../../platform/public-api';

export function numberSeriesField(key: string, label: string): FieldConfig {
  return { key, label, type: 'lookup', valueType: 'text', defaultValue: null,
    valueField: 'systemId', labelField: 'code', displayFormat: '[code] — [description]',
    lookup: { endpoint: '/numberSeries', valueField: 'systemId', displayField: 'code', searchFields: ['code', 'description'] },
  };
}
