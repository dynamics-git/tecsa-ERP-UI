# Field configuration: current supported contract

Use valueType for stored value semantics. Use type only to select a particular editor (lookup, dropdown, textarea, etc.).

| valueType | Behaviour |
| --- | --- |
| text | Preserves text |
| code | Trims surrounding spaces and uppercases on field commit and payload construction |
| integer | Numeric editor; validates safe whole numbers |
| decimal | Numeric editor; decimal string preserved in payloads to avoid rounding; arithmetic remains backend-owned |
| number | Existing compatible numeric type |
| boolean | Checkbox and boolean value conversion |
| date | Date editor; validates YYYY-MM-DD calendar date |

## Header

```ts
{ key: 'code', label: 'Code', valueType: 'code', required: true,
  validation: { maxLength: 20 } }
```

## Line

Declare type and validation on each column once. The platform derives validation fields and writable-field defaults. Existing separate fields arrays remain supported for older pages.

```ts
{ id: 'startingNo', label: 'Starting No.', valueType: 'code',
  required: true, validation: { maxLength: 20 } }
{ id: 'incrementBy', label: 'Increment By', valueType: 'integer',
  defaultValue: 1, required: true, validation: { min: 1 } }
```

No. Series is the reference at src/app/features/administration/no-series/no-series.config.ts.
Do not duplicate field conversion or payload construction inside feature configuration.
Explicit conflicting column/field value types fail during configuration resolution.
Read-only line numbers remain backend assigned.

## Boundaries

Code is not a uniqueness declaration. Database unique constraints remain authoritative.
This UI contract is not automatically downloaded from backend metadata.
Backend API/import normalization still needs its own shared contract; frontend normalization is not a security or integrity boundary.
No historical codes or number ranges are migrated by this change.
Datetime, time, GUID validation, email/file/password editors and remote uniqueness checks are not implemented by this change. Do not configure unsupported types.

Decimal validation supports `validation: { precision: 18, scale: 4, min: 0 }`. Precision is total storage digits; scale reserves fractional digits. Bounds are compared as decimal strings without rounding the input through JavaScript Number. Existing numeric min/max declarations remain supported; arbitrary-precision string bounds are not yet part of the config contract.
