# Calculations, defaults and value semantics

Use supported value types and calculation config for consistent entry/display behavior. Financial and posting results remain authoritative on the backend.

## Defaults evaluated for each new record

```typescript
{
  key: 'requestDate', label: 'Request Date', type: 'date',
  defaultValue: () => new Date().toLocaleDateString('en-CA'),
}
```

This is the current PR date-default pattern. The factory is evaluated for a new record instead of freezing a date when the JavaScript module first loads. A business working date may differ from the device date; use the appropriate domain value when that is required.

`newRecordDefaults` on a data source supplies record defaults. Do not repeat the same default in multiple places without a reason. Server defaults remain necessary for clients that do not use the UI.

## Row calculation

```typescript
calculation: [
  {target: 'amount', formula: 'quantity * unitCost', precision: 2},
]
```

The example assumes those fields exist. Calculation expressions use the shared formula engine; they are not arbitrary JavaScript. Do not put executable strings into configuration expecting `eval` semantics. Check the current calculation tests for supported operators and identifier resolution before extending formulas.

## Totals

```typescript
totalsCalculation: {
  totals: {subtotal: {kind: 'sum', field: 'amount'}},
  format: {type: 'number', precision: 2},
},
footerSections: [{
  id: 'amounts',
  rows: [{id: 'subtotal', label: 'Subtotal', source: 'total', totalKey: 'subtotal'}],
}],
```

Total expressions support sum, difference, literal/default values and supported formulas. Footer rows can read a named total, header field or literal. Formatting precision affects display; it does not redefine database decimal scale or a posting rule.

## Value semantics

- `code` normalizes a business code to trimmed uppercase.
- `decimal` preserves API decimal values as strings to avoid losing significant digits.
- `integer`, `number` and currency entry have their declared numeric behavior and validation.
- `date`, `datetime` and `time` are distinct. Do not convert date-only business values through UTC timestamps unnecessarily.
- Invalid input remains available for validation; it must not silently become zero.

## Header-to-line effects

`parentFieldMap` supplies declared header fields to related line binding/new records. It is not an “on any header change, rewrite all saved lines” rule. Use server validation/behavior for transactional propagation, and let core refresh confirmed server changes without discarding drafts.
